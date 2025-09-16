import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from 'src/prisma/prisma.service'
import { EncryptionService } from 'src/common/services/encryption.service'
import { SqlGuardService } from 'src/modules/sql-guard/sql-guard.service'
import { PromptBuilderService } from 'src/common/llm/prompt.builder'
import { LlmClientService } from 'src/common/llm/llm.client'
import { DATA_SOURCE_TYPE, Prisma, WorkspaceDataSource, USER_REQUEST_STATUS } from '@prisma/client'
import { PostgresConfig, MysqlConfig } from '../../workspaces/types/data-source.types'
import { v4 as uuidv4 } from 'uuid'
import { Client as PgClient, QueryResult } from 'pg'
import { createConnection, Connection, RowDataPacket } from 'mysql2/promise'

// Columnar result types for storing tabular data as JSON
type ColumnPrimitive = string | number | boolean | null
type ColumnarTable = Record<string, ColumnPrimitive[]>

@Injectable()
export class DataRequestsService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly encryption: EncryptionService,
		private readonly guard: SqlGuardService,
		private readonly promptBuilder: PromptBuilderService,
		private readonly llm: LlmClientService,
	) {}

	async getOne(userId: number, workspaceId: number, id: number) {
		await this.ensureWorkspace(userId, workspaceId)
		const req = await this.prisma.userRequest.findFirst({ where: { id, workspaceId } })
		if (!req) throw new NotFoundException('Request not found')
		return {
			requestId: req.id,
			status: req.status,
			sqlScript: req.sqlScript ?? undefined,
			resultText: req.resultText ?? undefined,
			resultTable: this.parseColumnarTable(req.resultTable),
			graphConfig: req.graphConfig ?? undefined,
		}
	}

	async createAndExecute(userId: number, workspaceId: number, prompt: string) {
		await this.ensureWorkspace(userId, workspaceId)
		const ds = await this.getDataSourceOrThrow(workspaceId)

		const created = await this.prisma.userRequest.create({
			data: { userId, workspaceId, prompt, status: USER_REQUEST_STATUS.PENDING },
		})

		// 1. Get metadata for prompt
		const metadata = await this.prisma.dataTable.findMany({
			where: { workspaceId },
			include: { columns: true },
		})
		const foreignKeys = await this.prisma.foreignKey.findMany({
			where: { fromTable: { workspaceId } },
		})

		// 2. Build and call LLM for SQL
		const sqlPrompt = this.promptBuilder.buildSqlPrompt(prompt, metadata, foreignKeys)
		let sql: string | undefined
		try {
			const sqlResp = await this.llm.completions({
				messages: sqlPrompt.messages,
				max_completion_tokens: sqlPrompt.maxTokens,
				response_format: { type: 'json_object' },
			})
			const raw = LlmClientService.firstText(sqlResp)?.trim()
			if (raw) {
				const cleaned = this.stripCodeFences(raw)
				try {
					const obj = JSON.parse(cleaned) as { sql?: unknown }
					if (obj && typeof obj === 'object' && typeof obj.sql === 'string') {
						sql = obj.sql.trim()
					}
				} catch {
					// fall back to plain text if model returned raw SQL
					sql = cleaned
				}
			}
		} catch {
			// ignore LLM 4xx/5xx and fallback
		}
		if (!sql) sql = await this.generateSqlStub(workspaceId)
		// 3. Guard and rewrite
		const allowedSchemas = Array.from(new Set(metadata.map(t => t.schemaName)))
		const dialect = ds.type === 'POSTGRESQL' ? ('postgresql' as const) : ('mysql' as const)
		const safeSql = await this.guard.validateAndRewrite(sql, {
			workspaceId,
			dialect,
			allowedSchemas,
			forceLimit: 101,
			forbidFreeJoins: true,
			queryTimeoutMs: 10_000,
		})

		// 4. Execute
		let rows: Record<string, unknown>[] = []
		if (ds.type === DATA_SOURCE_TYPE.POSTGRESQL) {
			rows = await this.execPostgres(ds, safeSql, 10_000)
		} else {
			rows = await this.execMysql(ds, safeSql, 10_000)
		}

		// 5. Enforce row/size limits and mask PII
		rows = this.limitRowsAndSize(rows, 100, 200 * 1024)
		rows = this.maskPII(rows)

		// 5.1. Rename technical column names to business names where unambiguous
		rows = this.applyBusinessNamesToRows(rows, metadata)

		// 6. Build resultTable
		const result = this.rowsToColumnar(rows)
		const responseId = uuidv4()

		// 7. LLM for resultText
		let resultText = `Returned ${rows.length} rows`
		try {
			const resultTextPrompt = this.promptBuilder.buildResultTextPrompt(rows)
			const resultTextResp = await this.llm.completions({
				messages: resultTextPrompt.messages,
				max_completion_tokens: resultTextPrompt.maxTokens,
			})
			const text = LlmClientService.firstText(resultTextResp)
			if (typeof text === 'string') resultText = text.trim() || resultText
		} catch {
			/* ignore LLM errors for resultText */
		}

		// 8. LLM for graph config
		let graphConfig: Prisma.JsonObject | undefined = undefined
		try {
			const graphPrompt = this.promptBuilder.buildGraphConfigPrompt(rows)
			const graphResp = await this.llm.completions({
				messages: graphPrompt.messages,
				max_completion_tokens: graphPrompt.maxTokens,
				response_format: { type: 'json_object' },
			})
			const graphText = this.stripCodeFences(LlmClientService.firstText(graphResp) || '')
			if (graphText) {
				try {
					const parsed: unknown = JSON.parse(graphText)
					const asObj = this.asJsonObject(parsed)
					if (asObj) graphConfig = asObj
				} catch {
					/* ignore JSON parse error */
				}
			}
		} catch {
			/* ignore LLM errors for graphConfig */
		}

		await this.prisma.userRequest.update({
			where: { id: created.id },
			data: {
				status: USER_REQUEST_STATUS.SUCCEEDED,
				sqlScript: safeSql,
				resultText,
				resultTable: result as unknown as Prisma.JsonObject,
				graphConfig,
			},
		})

		return {
			requestId: created.id,
			status: USER_REQUEST_STATUS.SUCCEEDED,
			responseId,
			sqlScript: safeSql,
			resultText,
			resultTable: result,
			graphConfig,
		}
	}

	private async ensureWorkspace(userId: number, workspaceId: number) {
		const ws = await this.prisma.workspace.findFirst({
			where: { id: workspaceId, ownerId: userId },
		})
		if (!ws) throw new NotFoundException('Workspace not found')
	}

	private async getDataSourceOrThrow(workspaceId: number): Promise<WorkspaceDataSource> {
		const ds = await this.prisma.workspaceDataSource.findFirst({ where: { workspaceId } })
		if (!ds) throw new NotFoundException('Data source not configured')
		return ds
	}

	private async execPostgres(
		ds: WorkspaceDataSource,
		sql: string,
		timeoutMs: number,
	): Promise<Record<string, unknown>[]> {
		const encrypted = ds.config
		if (typeof encrypted !== 'string') {
			throw new NotFoundException('Invalid data source config type')
		}
		const parsed = JSON.parse(this.encryption.decrypt(encrypted)) as unknown
		if (!this.isPostgresConfig(parsed)) throw new NotFoundException('Invalid postgres config')
		const config: PostgresConfig = parsed
		const client = new PgClient({
			host: config.host,
			port: config.port,
			database: config.database,
			user: config.user,
			password: config.password,
			ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
		})
		await client.connect()
		try {
			await client.query(`SET statement_timeout TO ${timeoutMs}`)
			const res: QueryResult = await client.query(sql)
			// pg rows are plain objects; assert as Record<string, unknown>
			return res.rows as Array<Record<string, unknown>>
		} finally {
			await client.end()
		}
	}

	private async execMysql(
		ds: WorkspaceDataSource,
		sql: string,
		timeoutMs: number,
	): Promise<Record<string, unknown>[]> {
		const encrypted = ds.config
		if (typeof encrypted !== 'string') {
			throw new NotFoundException('Invalid data source config type')
		}
		const parsed = JSON.parse(this.encryption.decrypt(encrypted)) as unknown
		if (!this.isMysqlConfig(parsed)) throw new NotFoundException('Invalid mysql config')
		const config: MysqlConfig = parsed
		const conn: Connection = await createConnection({
			host: config.host,
			port: config.port,
			database: config.database,
			user: config.user,
			password: config.password,
		})
		try {
			await conn.execute(`SET SESSION MAX_EXECUTION_TIME=${timeoutMs}`)
			const [rows] = await conn.execute<RowDataPacket[]>(sql)
			// Convert RowDataPacket[] to a plain array of records
			const result: Record<string, unknown>[] = rows.map(r => ({ ...r }))
			return result
		} finally {
			await conn.end()
		}
	}

	private generateSqlStub = async (workspaceId: number): Promise<string> => {
		// Choose the first table and select few columns
		const table = await this.prisma.dataTable.findFirst({ where: { workspaceId } })
		if (!table) return 'SELECT 1'
		const cols = await this.prisma.dataColumn.findMany({
			where: { tableId: table.id },
			select: { columnName: true },
			take: 5,
		})
		const selected = cols
			.map(c => `${table.schemaName}.${table.tableName}.${c.columnName}`)
			.join(', ')
		return `SELECT ${selected || '*'} FROM ${table.schemaName}.${table.tableName}`
	}

	private stripCodeFences(s: string): string {
		const fence = /^```[a-zA-Z0-9]*\n([\s\S]*?)\n```$/
		const m = s.match(fence)
		if (m) return m[1].trim()
		return s
	}

	// Map technical column names to business names where there is a unique mapping in metadata
	private applyBusinessNamesToRows(
		rows: Array<Record<string, unknown>>,
		metadata: Array<{
			id: number
			workspaceId: number
			schemaName: string
			tableName: string
			businessName: string | null
			description: string | null
			columns: Array<{
				id: number
				tableId: number
				columnName: string
				businessName: string | null
				description: string | null
			}>
		}>,
	): Array<Record<string, unknown>> {
		// Build a map of technical column name -> business name ONLY if the business name is unique across all columns
		const bizNameCount = new Map<string, number>()
		for (const t of metadata) {
			for (const c of t.columns) {
				if (c.businessName && c.businessName.trim()) {
					bizNameCount.set(c.businessName, (bizNameCount.get(c.businessName) || 0) + 1)
				}
			}
		}
		const techToBiz = new Map<string, string>()
		for (const t of metadata) {
			for (const c of t.columns) {
				if (c.businessName && bizNameCount.get(c.businessName) === 1) {
					techToBiz.set(c.columnName, c.businessName)
				}
			}
		}
		if (techToBiz.size === 0) return rows
		return rows.map(r => {
			const out: Record<string, unknown> = {}
			for (const [k, v] of Object.entries(r)) {
				const renamed = techToBiz.get(k) || k
				out[renamed] = v
			}
			return out
		})
	}

	private limitRowsAndSize(
		rows: Record<string, unknown>[],
		maxRows: number,
		maxBytes: number,
	): Record<string, unknown>[] {
		let limited: Record<string, unknown>[] = rows.slice(0, maxRows)
		let json = JSON.stringify(limited)
		while (Buffer.byteLength(json, 'utf8') > maxBytes && limited.length > 0) {
			limited = limited.slice(0, Math.max(1, Math.floor(limited.length * 0.8)))
			json = JSON.stringify(limited)
		}
		return JSON.parse(json) as Record<string, unknown>[]
	}

	private maskPII(rows: Record<string, unknown>[]): Record<string, unknown>[] {
		const piiPatterns = [/email/i, /phone/i, /mobile/i, /ssn/i, /tax/i]
		return rows.map(r => {
			const copy: Record<string, unknown> = { ...r }
			Object.keys(copy).forEach(k => {
				if (piiPatterns.some(p => p.test(k))) {
					const v = copy[k]
					if (typeof v === 'string') copy[k] = this.maskString(v)
					else if (typeof v === 'number') copy[k] = '***'
					else if (v) copy[k] = '***'
				}
			})
			return copy
		})
	}

	private maskString(s: string): string {
		if (s.length <= 4) return '*'.repeat(s.length)
		return s.slice(0, 2) + '***' + s.slice(-2)
	}

	private rowsToColumnar(rows: Record<string, unknown>[]): ColumnarTable {
		const result: ColumnarTable = {}
		for (const r of rows) {
			for (const [k, v] of Object.entries(r)) {
				if (!result[k]) result[k] = []
				result[k].push(this.toColumnPrimitive(v))
			}
		}
		return result
	}

	private toColumnPrimitive(v: unknown): ColumnPrimitive {
		if (v === null) return null
		if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return v
		if (v instanceof Date) return v.toISOString()
		// fallback: stringify unknowns (prefer JSON if possible)
		try {
			const s = JSON.stringify(v)
			return s ?? '[unserializable]'
		} catch {
			return '[unserializable]'
		}
	}

	private isPostgresConfig(x: unknown): x is PostgresConfig {
		return (
			!!x &&
			typeof x === 'object' &&
			typeof (x as PostgresConfig).host === 'string' &&
			typeof (x as PostgresConfig).port === 'number' &&
			typeof (x as PostgresConfig).database === 'string' &&
			typeof (x as PostgresConfig).user === 'string' &&
			typeof (x as PostgresConfig).password === 'string'
		)
	}

	private isMysqlConfig(x: unknown): x is MysqlConfig {
		return (
			!!x &&
			typeof x === 'object' &&
			typeof (x as MysqlConfig).host === 'string' &&
			typeof (x as MysqlConfig).port === 'number' &&
			typeof (x as MysqlConfig).database === 'string' &&
			typeof (x as MysqlConfig).user === 'string' &&
			typeof (x as MysqlConfig).password === 'string'
		)
	}

	private toJsonValue(x: unknown, depth = 0): Prisma.JsonValue | undefined {
		if (depth > 8) return undefined
		if (x === null) return null
		const t = typeof x
		if (t === 'string' || t === 'number' || t === 'boolean') return x as Prisma.JsonValue
		if (Array.isArray(x)) {
			const arr: Prisma.JsonArray = []
			for (const item of x) {
				const v = this.toJsonValue(item, depth + 1)
				if (v === undefined) return undefined
				arr.push(v)
			}
			return arr
		}
		if (t === 'object') {
			const obj = x as Record<string, unknown>
			const out: { [k: string]: Prisma.JsonValue } = {}
			for (const [k, v] of Object.entries(obj)) {
				const j = this.toJsonValue(v, depth + 1)
				if (j === undefined) return undefined
				out[k] = j
			}
			return out as Prisma.JsonObject
		}
		return undefined
	}

	private asJsonObject(x: unknown): Prisma.JsonObject | undefined {
		const v = this.toJsonValue(x)
		if (v && typeof v === 'object' && !Array.isArray(v)) return v
		return undefined
	}

	private parseColumnarTable(value: Prisma.JsonValue | null): ColumnarTable | undefined {
		if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
		const obj = value as Record<string, unknown>
		const out: ColumnarTable = {}
		for (const [k, v] of Object.entries(obj)) {
			if (!Array.isArray(v)) return undefined
			const arr: ColumnPrimitive[] = []
			const source: unknown[] = v as unknown[]
			for (const item of source) {
				if (
					item === null ||
					typeof item === 'string' ||
					typeof item === 'number' ||
					typeof item === 'boolean'
				) {
					arr.push(item as ColumnPrimitive)
				} else {
					try {
						const s = JSON.stringify(item)
						arr.push((s ?? '[unserializable]') as ColumnPrimitive)
					} catch {
						arr.push('[unserializable]')
					}
				}
			}
			out[k] = arr
		}
		return out
	}
}
