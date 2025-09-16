import { Injectable, BadRequestException, Logger } from '@nestjs/common'
import { PrismaService } from 'src/prisma/prisma.service'

type Dialect = 'postgresql' | 'mysql'

export interface SqlGuardOptions {
	workspaceId: number
	dialect: Dialect
	allowedSchemas?: string[]
	allowedFunctions?: string[]
	forceLimit?: number // default 101
	maxRows?: number // default 100
	maxJsonBytes?: number // default 200KB
	forbidFreeJoins?: boolean // only allow joins on declared FKs
	queryTimeoutMs?: number // enforced by caller/driver
}

@Injectable()
export class SqlGuardService {
	private readonly logger = new Logger(SqlGuardService.name)
	constructor(private readonly prisma: PrismaService) {}

	async validateAndRewrite(sql: string, opts: SqlGuardOptions): Promise<string> {
		const sanitized = this.stripComments(sql)
		this.ensureOnlySelect(sanitized)
		this.ensureNoCTEorDDLorDML(sanitized)
		this.ensureNoDangerousKeywords(sanitized)

		// Parse table refs and aliases; use them for schema allowlist and FK checks
		const { tableRefs, aliasMap } = this.parseTableRefs(sanitized, opts.dialect)
		if (opts.allowedSchemas?.length) {
			const referenced = Array.from(
				new Set(tableRefs.map(r => r.schema).filter((s): s is string => !!s)),
			)
			this.logger.debug({
				msg: 'SQLGuard schema whitelist check',
				referenced,
				allowed: opts.allowedSchemas,
				aliasMap,
				tableRefs,
			})
			const violations = referenced.filter(s => !opts.allowedSchemas!.includes(s))
			if (violations.length) {
				throw new BadRequestException(
					`Access to schemas not allowed: ${Array.from(new Set(violations)).join(', ')}`,
				)
			}
		}

		if (opts.forbidFreeJoins) {
			await this.ensureJoinsAreForeignKeys(sanitized, opts.workspaceId, aliasMap)
		}

		const rewritten = this.enforceLimit(sanitized, opts.forceLimit ?? 101)
		this.logger.debug({ msg: 'SQLGuard final SQL', rewritten })
		return rewritten
	}

	private stripComments(sql: string): string {
		// Remove -- line comments and /* */ block comments
		return sql.replace(/--[^\n]*\n/g, '\n').replace(/\/\*[\s\S]*?\*\//g, '')
	}

	private ensureOnlySelect(sql: string) {
		const firstToken = sql.trim().toUpperCase().split(/\s+/)[0]
		if (firstToken !== 'SELECT' && !firstToken.startsWith('WITH')) {
			throw new BadRequestException('Only SELECT queries are allowed')
		}
	}

	private ensureNoCTEorDDLorDML(sql: string) {
		const up = sql.toUpperCase()
		const forbidden = [
			'INSERT',
			'UPDATE',
			'DELETE',
			'DROP',
			'ALTER',
			'CREATE',
			'TRUNCATE',
			'REINDEX',
			'ANALYZE',
			'VACUUM',
		]
		if (/\bWITH\s+/.test(up)) {
			throw new BadRequestException('CTE (WITH) is not allowed')
		}
		for (const kw of forbidden) {
			if (new RegExp(`\\b${kw}\\b`, 'i').test(up)) {
				throw new BadRequestException(`Keyword not allowed: ${kw}`)
			}
		}
	}

	private ensureNoDangerousKeywords(sql: string) {
		const up = sql.toUpperCase()
		const disallow = ['EXEC', 'CALL', 'COPY', 'GRANT', 'REVOKE']
		for (const kw of disallow) {
			if (new RegExp(`\\b${kw}\\b`, 'i').test(up)) {
				throw new BadRequestException(`Keyword not allowed: ${kw}`)
			}
		}
	}

	private enforceLimit(sql: string, limit: number): string {
		const up = sql.toUpperCase()
		if (/\bLIMIT\b/.test(up)) return sql // respect caller limit if present
		return `${sql.trim()} LIMIT ${limit}`
	}

	// Deprecated helper kept for compatibility (no longer used)
	private findReferencedSchemas(sql: string): string[] {
		const matches = (sql.match(/([a-zA-Z_][\w]*)\.[a-zA-Z_][\w]*/g) as string[]) || []
		return matches.map((m: string) => m.split('.')[0])
	}

	private parseTableRefs(
		sql: string,
		dialect: Dialect,
	): {
		tableRefs: Array<{ schema?: string; table: string; alias?: string }>
		aliasMap: Record<string, { schema?: string; table: string }>
	} {
		const tableRefs: Array<{ schema?: string; table: string; alias?: string }> = []
		const aliasMap: Record<string, { schema?: string; table: string }> = {}

		// FROM schema.table [AS] alias | FROM table [AS] alias
		const fromRx =
			/\bFROM\s+((?<schema>[\w_]+)\.)?(?<table>[\w_]+)(?:\s+(?:AS\s+)?(?<alias>[\w_]+))?/gi
		// JOIN schema.table [AS] alias | JOIN table [AS] alias
		const joinRx =
			/\bJOIN\s+((?<schema>[\w_]+)\.)?(?<table>[\w_]+)(?:\s+(?:AS\s+)?(?<alias>[\w_]+))?/gi

		const collect = (rx: RegExp) => {
			let m: RegExpExecArray | null
			while ((m = rx.exec(sql)) !== null) {
				const schema = m.groups?.schema || undefined
				const table = m.groups?.table as string
				const alias = m.groups?.alias || undefined
				const ref = { schema, table, alias }
				tableRefs.push(ref)
				if (alias) aliasMap[alias] = { schema, table }
				// Allow bare table-name as implicit alias
				if (!alias) aliasMap[table] = { schema, table }
			}
		}
		collect(fromRx)
		collect(joinRx)

		// Default schema for Postgres
		if (dialect === 'postgresql') {
			for (const r of tableRefs) {
				if (!r.schema) r.schema = 'public'
				const key = r.alias ?? r.table
				aliasMap[key] = { schema: r.schema, table: r.table }
			}
		}

		this.logger.debug({ msg: 'SQLGuard table refs parsed', tableRefs, aliasMap })
		return { tableRefs, aliasMap }
	}

	private async ensureJoinsAreForeignKeys(
		sql: string,
		workspaceId: number,
		aliasMap: Record<string, { schema?: string; table: string }>,
	) {
		// Find JOIN ... ON ... and collect a.b = c.d comparisons
		const joinRegex = /JOIN\s+([\w_]+\.)?([\w_]+)\s+ON\s+([^\n]+?)(?=\bJOIN\b|$)/gi
		let match: RegExpExecArray | null
		const comparisons: Array<{ left: string; right: string }> = []
		while ((match = joinRegex.exec(sql)) !== null) {
			const onExpr = match[3]
			const eqs = [...onExpr.matchAll(/([\w_]+)\.([\w_]+)\s*=\s*([\w_]+)\.([\w_]+)/g)]
			for (const e of eqs) {
				comparisons.push({ left: `${e[1]}.${e[2]}`, right: `${e[3]}.${e[4]}` })
			}
		}

		if (comparisons.length === 0) return

		// Load FK pairs from metadata
		const fks = await this.prisma.foreignKey.findMany({
			where: { fromTable: { workspaceId } },
			include: { fromTable: true, fromColumn: true, toTable: true, toColumn: true },
		})
		const allowedPairs = new Set<string>(
			fks.flatMap(fk => [
				`${fk.fromTable.schemaName}.${fk.fromTable.tableName}.${fk.fromColumn.columnName}->${fk.toTable.schemaName}.${fk.toTable.tableName}.${fk.toColumn.columnName}`,
				`${fk.toTable.schemaName}.${fk.toTable.tableName}.${fk.toColumn.columnName}->${fk.fromTable.schemaName}.${fk.fromTable.tableName}.${fk.fromColumn.columnName}`,
			]),
		)

		const resolve = (qual: string): { schema?: string; table?: string; column: string } => {
			const parts = qual.split('.')
			if (parts.length === 3) {
				return { schema: parts[0], table: parts[1], column: parts[2] }
			}
			if (parts.length === 2) {
				const alias = parts[0]
				const column = parts[1]
				const map = aliasMap[alias]
				if (map) return { schema: map.schema, table: map.table, column }
				return { table: alias, column }
			}
			return { column: parts[0] }
		}

		const resolved: Array<{ left: string; right: string; candidate: string; ok: boolean }> = []
		for (const cmp of comparisons) {
			const L = resolve(cmp.left)
			const R = resolve(cmp.right)
			if (!L.table || !R.table || !L.column || !R.column) {
				throw new BadRequestException(
					'JOINs must use qualified column names and match declared FKs',
				)
			}
			const candidate = `${L.schema ?? ''}.${L.table}.${L.column}->${R.schema ?? ''}.${R.table}.${R.column}`
			const candidateAlt = `${R.schema ?? ''}.${R.table}.${R.column}->${L.schema ?? ''}.${L.table}.${L.column}`
			const ok = allowedPairs.has(candidate) || allowedPairs.has(candidateAlt)
			resolved.push({ left: cmp.left, right: cmp.right, candidate, ok })
			if (!ok) {
				this.logger.debug({ msg: 'SQLGuard join rejected', cmp, L, R, candidate, candidateAlt })
				throw new BadRequestException('JOINs must follow foreign key relationships for safety')
			}
		}
		this.logger.debug({ msg: 'SQLGuard JOIN comparisons', comparisons, resolved })
	}
}
