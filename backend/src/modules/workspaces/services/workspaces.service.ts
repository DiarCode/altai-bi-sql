// src/modules/workspaces/services/workspaces.service.ts

import { Injectable, NotFoundException } from '@nestjs/common'
import { DATA_SOURCE_TYPE, INGESTION_STATUS } from '@prisma/client'
import { LlmClientService } from 'src/common/llm/llm.client'
import { PromptBuilderService } from 'src/common/llm/prompt.builder'
import { EncryptionService } from 'src/common/services/encryption.service'
import { PrismaService } from 'src/prisma/prisma.service'
import {
	BusinessMetadataDto,
	CreateWorkspaceDto,
	UpdateWorkspaceDto,
	UpsertDataSourceDto,
	WorkspaceDto,
	WorkspaceIngestionDto,
} from '../dtos/workspaces.dtos'
import { MysqlConfig, PostgresConfig } from '../types/data-source.types'
import { toWorkspaceDto } from '../utils/workspaces.mapper'
import {
	asMysqlConfigOrThrow,
	asPostgresConfigOrThrow,
	cleanMarkdownJson,
	normalizeMysqlConfig,
	normalizePostgresConfig,
} from '../utils/workspaces.util'
import { SchemaReaderService } from './schema-reader.service'

@Injectable()
export class WorkspacesService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly encryptionService: EncryptionService,
		private readonly schemaReader: SchemaReaderService,
		private readonly llm: LlmClientService,
		private readonly prompts: PromptBuilderService,
	) {}

	async getAllWorkspaces(userId: number): Promise<WorkspaceDto[]> {
		const workspaces = await this.prisma.workspace.findMany({
			where: {
				ownerId: userId,
			},
			include: {
				workspaceDataSources: true,
			},
		})
		return workspaces.map(workspace =>
			toWorkspaceDto(workspace, workspace.workspaceDataSources?.[0], this.encryptionService),
		)
	}

	async createWorkspace(userId: number, dto: CreateWorkspaceDto): Promise<WorkspaceDto> {
		const workspace = await this.prisma.workspace.create({
			data: {
				name: dto.name,
				description: dto.description,
				purpose: dto.purpose,
				ownerId: userId,
			},
		})

		return toWorkspaceDto(workspace)
	}

	async getWorkspaceById(id: number, userId: number): Promise<WorkspaceDto> {
		const workspace = await this.prisma.workspace.findFirst({
			where: {
				id,
				ownerId: userId,
			},
			include: {
				workspaceDataSources: true,
			},
		})

		if (!workspace) {
			throw new NotFoundException(`Workspace #${id} not found`)
		}

		return toWorkspaceDto(workspace, workspace.workspaceDataSources?.[0], this.encryptionService)
	}

	async updateWorkspace(
		id: number,
		userId: number,
		dto: UpdateWorkspaceDto,
	): Promise<WorkspaceDto> {
		// First check ownership
		await this.getWorkspaceById(id, userId)

		const updated = await this.prisma.workspace.update({
			where: {
				id,
			},
			data: {
				...(dto.name && { name: dto.name }),
				...(dto.description && { description: dto.description }),
				...(dto.purpose && { purpose: dto.purpose }),
			},
			include: {
				workspaceDataSources: true,
			},
		})

		return toWorkspaceDto(updated, updated.workspaceDataSources?.[0], this.encryptionService)
	}

	async deleteWorkspace(id: number, userId: number): Promise<void> {
		// First check ownership
		await this.getWorkspaceById(id, userId)

		await this.prisma.workspace.delete({
			where: {
				id,
			},
		})
	}

	async upsertDataSource(
		workspaceId: number,
		userId: number,
		dto: UpsertDataSourceDto,
	): Promise<void> {
		// First check ownership
		await this.getWorkspaceById(workspaceId, userId)

		// Normalize config to strict types (e.g., coerce port from string to number)
		const normalizedConfig =
			dto.type === DATA_SOURCE_TYPE.POSTGRESQL
				? normalizePostgresConfig(dto.config)
				: normalizeMysqlConfig(dto.config)
		const encryptedConfig = this.encryptionService.encrypt(JSON.stringify(normalizedConfig))

		const existing = await this.prisma.workspaceDataSource.findFirst({
			where: { workspaceId },
		})

		if (existing) {
			await this.prisma.workspaceDataSource.update({
				where: { id: existing.id },
				data: {
					type: dto.type,
					config: encryptedConfig,
				},
			})
		} else {
			await this.prisma.workspaceDataSource.create({
				data: {
					workspaceId,
					type: dto.type,
					config: encryptedConfig,
				},
			})
		}

		// Kick off background ingestion (non-blocking)
		this.startIngestion(workspaceId, userId).catch(() => undefined)
	}

	async startIngestion(workspaceId: number, userId: number): Promise<{ ingestionId: number }> {
		await this.getWorkspaceById(workspaceId, userId)
		const ds = await this.prisma.workspaceDataSource.findFirst({ where: { workspaceId } })
		if (!ds) throw new NotFoundException('Data source not configured')

		const ingestion = await this.prisma.workspaceIngestion.create({
			data: { workspaceId, status: INGESTION_STATUS.RUNNING, startedAt: new Date() },
		})

		// Async kickoff without blocking request
		this.ingestWorkspace(workspaceId, ds.id, ingestion.id).catch(async err => {
			await this.prisma.workspaceIngestion.update({
				where: { id: ingestion.id },
				data: { status: INGESTION_STATUS.FAILED, error: String(err), finishedAt: new Date() },
			})
		})

		return { ingestionId: ingestion.id }
	}

	async getLatestIngestion(workspaceId: number, userId: number): Promise<WorkspaceIngestionDto> {
		await this.getWorkspaceById(workspaceId, userId)
		const ing = await this.prisma.workspaceIngestion.findFirst({
			where: { workspaceId },
			orderBy: { id: 'desc' },
		})
		if (!ing) throw new NotFoundException('No ingestion found')
		return ing
	}

	// Business metadata: read
	async getBusinessMetadata(workspaceId: number, userId: number): Promise<BusinessMetadataDto> {
		await this.getWorkspaceById(workspaceId, userId)
		const tables = await this.prisma.dataTable.findMany({
			where: { workspaceId },
			include: {
				columns: true,
			},
		})
		return {
			tables: tables.map(t => ({
				id: t.id,
				schemaName: t.schemaName,
				tableName: t.tableName,
				businessName: t.businessName ?? undefined,
				description: t.description ?? undefined,
				columns: t.columns.map(c => ({
					id: c.id,
					columnName: c.columnName,
					dataType: c.dataType,
					isNullable: c.isNullable,
					isPrimaryKey: c.isPrimaryKey,
					businessName: c.businessName ?? undefined,
					description: c.description ?? undefined,
				})),
			})),
		}
	}

	// Business metadata: update table
	async updateTableBusiness(
		workspaceId: number,
		userId: number,
		tableId: number,
		data: { businessName?: string; description?: string },
	): Promise<void> {
		await this.getWorkspaceById(workspaceId, userId)
		const existing = await this.prisma.dataTable.findFirst({ where: { id: tableId, workspaceId } })
		if (!existing) throw new NotFoundException('Table not found')
		await this.prisma.dataTable.update({
			where: { id: tableId },
			data: {
				...(data.businessName !== undefined ? { businessName: data.businessName } : {}),
				...(data.description !== undefined ? { description: data.description } : {}),
			},
		})
	}

	// Business metadata: update column
	async updateColumnBusiness(
		workspaceId: number,
		userId: number,
		tableId: number,
		columnId: number,
		data: { businessName?: string; description?: string },
	): Promise<void> {
		await this.getWorkspaceById(workspaceId, userId)
		const existing = await this.prisma.dataColumn.findFirst({
			where: { id: columnId, table: { id: tableId, workspaceId } },
		})
		if (!existing) throw new NotFoundException('Column not found')
		await this.prisma.dataColumn.update({
			where: { id: columnId },
			data: {
				...(data.businessName !== undefined ? { businessName: data.businessName } : {}),
				...(data.description !== undefined ? { description: data.description } : {}),
			},
		})
	}

	private async ingestWorkspace(workspaceId: number, dataSourceId: number, ingestionId: number) {
		const ds = await this.prisma.workspaceDataSource.findUnique({ where: { id: dataSourceId } })
		if (!ds) throw new NotFoundException('Data source not found')

		const decrypted = this.encryptionService.decrypt(ds.config as unknown as string)
		const parsed: unknown = JSON.parse(decrypted)
		const cfg: PostgresConfig | MysqlConfig =
			ds.type === DATA_SOURCE_TYPE.POSTGRESQL
				? asPostgresConfigOrThrow(parsed)
				: asMysqlConfigOrThrow(parsed)

		const meta = await this.schemaReader.read(ds.type, cfg)

		/* =============================
     Helpers (normalized keys)
     ============================= */
		const tblKeyLc = (schema: string, table: string) => `${schema}.${table}`.toLowerCase()
		const colKeyLc = (schema: string, table: string, column: string) =>
			`${schema}.${table}.${column}`.toLowerCase()
		const fkFromKeyLc = (f: { fromSchema: string; fromTable: string; fromColumn: string }) =>
			`${f.fromSchema}.${f.fromTable}.${f.fromColumn}`.toLowerCase()

		/* =============================
     DEDUP TABLES (normalize case)
     ============================= */
		const dedupTables: typeof meta.tables = []
		{
			const seen = new Set<string>()
			for (const t of meta.tables) {
				const k = tblKeyLc(t.schemaName, t.tableName)
				if (seen.has(k)) continue
				seen.add(k)
				dedupTables.push({ ...t })
			}
		}

		/* =============================
     DEDUP COLUMNS (normalize case)
     ============================= */
		const dedupColumns: typeof meta.columns = []
		const colSeen = new Map<string, number>()
		for (const c of meta.columns) {
			const k = colKeyLc(c.schemaName, c.tableName, c.columnName)
			const idx = colSeen.get(k)
			if (idx === undefined) {
				colSeen.set(k, dedupColumns.length)
				dedupColumns.push({ ...c })
			} else {
				// merge flags; keep first dataType
				dedupColumns[idx].isPrimaryKey ||= c.isPrimaryKey
				dedupColumns[idx].isNullable ||= c.isNullable
			}
		}

		/* =============================
     DEDUP FKs (normalize case)
     ============================= */
		const dedupFks: typeof meta.fks = []
		const fkSeen = new Set<string>()
		for (const f of meta.fks) {
			const k = fkFromKeyLc(f)
			if (fkSeen.has(k)) continue
			fkSeen.add(k)
			dedupFks.push({ ...f })
		}

		/* =============================
     Pre-compute business metadata
     (outside tx to avoid timeouts)
     ============================= */
		type ColumnBiz = { name?: string; description?: string }
		type TableBiz = {
			businessName?: string
			description?: string
			columns: Record<string, ColumnBiz> // key by ORIGINAL column name
		}
		const tableBizMap = new Map<string, TableBiz>() // key: `${schema}.${table}` (original case)

		for (const t of dedupTables) {
			const colsForTable = dedupColumns.filter(
				c => c.schemaName === t.schemaName && c.tableName === t.tableName,
			)

			let businessName: string | undefined
			let tableDescription: string | undefined
			const columnBusiness: Record<string, ColumnBiz> = {}

			try {
				const prompt = this.prompts.buildBusinessNamesPrompt(
					t.schemaName,
					t.tableName,
					colsForTable.map(c => ({
						columnName: c.columnName,
						dataType: c.dataType,
						isPrimaryKey: c.isPrimaryKey,
						isNullable: c.isNullable,
					})),
				)
				const resp = await this.llm.completions({
					messages: prompt.messages,
					max_completion_tokens: prompt.maxTokens,
				})
				const txt = LlmClientService.firstText(resp)
				if (txt) {
					try {
						interface BusinessNamesJson {
							table?: { businessName?: unknown; description?: unknown }
							columns?: Array<{
								columnName?: unknown
								businessName?: unknown
								description?: unknown
							}>
						}
						const clean = cleanMarkdownJson(txt)
						const parsed: unknown = JSON.parse(clean)
						const obj = parsed as BusinessNamesJson
						if (obj && typeof obj === 'object') {
							const tInfo = obj.table
							if (tInfo && typeof tInfo === 'object') {
								const ti = tInfo as { businessName?: unknown; description?: unknown }
								if (typeof ti.businessName === 'string') businessName = ti.businessName
								if (typeof ti.description === 'string') tableDescription = ti.description
							}
							if (Array.isArray(obj.columns)) {
								for (const col of obj.columns) {
									const cname = typeof col?.columnName === 'string' ? col.columnName : undefined
									if (cname) {
										const entry: ColumnBiz = {}
										if (typeof col.businessName === 'string') entry.name = col.businessName
										if (typeof col.description === 'string') entry.description = col.description
										columnBusiness[cname] = entry
									}
								}
							}
						}
					} catch {
						/* ignore parse errors */
					}
				}
			} catch {
				/* ignore LLM errors */
			}

			tableBizMap.set(`${t.schemaName}.${t.tableName}`, {
				businessName,
				description: tableDescription,
				columns: columnBusiness,
			})
		}

		/* =============================
     Write snapshot in one tx
     ============================= */
		await this.prisma.$transaction(
			async tx => {
				// Clear previous snapshot (assumes FK cascade or manual cleanup elsewhere)
				await tx.dataTable.deleteMany({ where: { workspaceId } })

				// Insert tables (deduped). You can switch to upsert if you want belt & suspenders.
				const tableMap = new Map<string, number>() // key: LOWERCASE `${schema}.${table}`
				for (const t of dedupTables) {
					const biz = tableBizMap.get(`${t.schemaName}.${t.tableName}`)
					const tbl = await tx.dataTable.create({
						data: {
							workspaceId,
							schemaName: t.schemaName,
							tableName: t.tableName,
							businessName: biz?.businessName,
							description: biz?.description,
						},
					})
					tableMap.set(tblKeyLc(t.schemaName, t.tableName), tbl.id)

					// If you prefer upsert (not necessary after deleteMany + dedup):
					// const tbl = await tx.dataTable.upsert({
					//   where: { workspaceId_schemaName_tableName: { workspaceId, schemaName: t.schemaName, tableName: t.tableName } },
					//   create: { workspaceId, schemaName: t.schemaName, tableName: t.tableName, businessName: biz?.businessName, description: biz?.description },
					//   update: { businessName: biz?.businessName ?? undefined, description: biz?.description ?? undefined },
					// })
					// tableMap.set(tblKeyLc(t.schemaName, t.tableName), tbl.id)
				}

				// Insert columns with UPSERT on composite unique (tableId, columnName)
				const columnKeyToId = new Map<string, number>() // key: LOWERCASE `${schema}.${table}.${column}`
				for (const c of dedupColumns) {
					const tableId = tableMap.get(tblKeyLc(c.schemaName, c.tableName))
					if (!tableId) continue
					const biz = tableBizMap.get(`${c.schemaName}.${c.tableName}`)
					const colBiz = biz?.columns[c.columnName]

					// IMPORTANT: use upsert on @@unique([tableId, columnName])
					const col = await tx.dataColumn.upsert({
						where: {
							tableId_columnName: { tableId, columnName: c.columnName },
						},
						create: {
							tableId,
							columnName: c.columnName,
							dataType: c.dataType,
							isNullable: c.isNullable,
							isPrimaryKey: c.isPrimaryKey,
							businessName: colBiz?.name,
							description: colBiz?.description,
						},
						update: {
							dataType: c.dataType,
							isNullable: c.isNullable,
							isPrimaryKey: c.isPrimaryKey,
							businessName: colBiz?.name ?? undefined,
							description: colBiz?.description ?? undefined,
						},
					})

					columnKeyToId.set(colKeyLc(c.schemaName, c.tableName, c.columnName), col.id)
				}

				// Foreign keys
				for (const f of dedupFks) {
					const fromTableId = tableMap.get(tblKeyLc(f.fromSchema, f.fromTable))
					const toTableId = tableMap.get(tblKeyLc(f.toSchema, f.toTable))
					const fromColumnId = columnKeyToId.get(colKeyLc(f.fromSchema, f.fromTable, f.fromColumn))
					const toColumnId = columnKeyToId.get(colKeyLc(f.toSchema, f.toTable, f.toColumn))
					if (!fromTableId || !toTableId || !fromColumnId || !toColumnId) continue

					await tx.foreignKey.upsert({
						where: { fromColumnId },
						create: {
							fromTableId,
							fromColumnId,
							toTableId,
							toColumnId,
							constraintName: f.constraintName,
						},
						update: {
							toTableId,
							toColumnId,
							constraintName: f.constraintName ?? undefined,
						},
					})
				}
			},
			{ timeout: 30_000 },
		)

		await this.prisma.workspaceIngestion.update({
			where: { id: ingestionId },
			data: { status: INGESTION_STATUS.SUCCEEDED, finishedAt: new Date() },
		})
	}

	private asPostgresConfigOrThrow(x: unknown): PostgresConfig {
		if (
			x &&
			typeof x === 'object' &&
			typeof (x as PostgresConfig).host === 'string' &&
			typeof (x as PostgresConfig).port === 'number' &&
			typeof (x as PostgresConfig).database === 'string' &&
			typeof (x as PostgresConfig).user === 'string' &&
			typeof (x as PostgresConfig).password === 'string'
		) {
			return x as PostgresConfig
		}
		throw new NotFoundException('Invalid Postgres config')
	}

	private asMysqlConfigOrThrow(x: unknown): MysqlConfig {
		if (
			x &&
			typeof x === 'object' &&
			typeof (x as MysqlConfig).host === 'string' &&
			typeof (x as MysqlConfig).port === 'number' &&
			typeof (x as MysqlConfig).database === 'string' &&
			typeof (x as MysqlConfig).user === 'string' &&
			typeof (x as MysqlConfig).password === 'string'
		) {
			return x as MysqlConfig
		}
		throw new NotFoundException('Invalid MySQL config')
	}
}
