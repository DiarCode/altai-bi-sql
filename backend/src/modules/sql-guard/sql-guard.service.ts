import { Injectable, BadRequestException } from '@nestjs/common'
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
	constructor(private readonly prisma: PrismaService) {}

	async validateAndRewrite(sql: string, opts: SqlGuardOptions): Promise<string> {
		const sanitized = this.stripComments(sql)
		this.ensureOnlySelect(sanitized)
		this.ensureNoCTEorDDLorDML(sanitized)
		this.ensureNoDangerousKeywords(sanitized)

		// Whitelist schemas/tables via simple prefix checks; deeper AST parsing can be added later
		if (opts.allowedSchemas?.length) {
			const violations = this.findReferencedSchemas(sanitized).filter(
				s => !opts.allowedSchemas!.includes(s),
			)
			if (violations.length) {
				throw new BadRequestException(
					`Access to schemas not allowed: ${Array.from(new Set(violations)).join(', ')}`,
				)
			}
		}

		if (opts.forbidFreeJoins) {
			await this.ensureJoinsAreForeignKeys(sanitized, opts.workspaceId)
		}

		return this.enforceLimit(sanitized, opts.forceLimit ?? 101)
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

	private findReferencedSchemas(sql: string): string[] {
		// Naive extraction: collect tokens like schema.table
		const matches = (sql.match(/([a-zA-Z_][\w]*)\.[a-zA-Z_][\w]*/g) as string[]) || []
		return matches.map((m: string) => m.split('.')[0])
	}

	private async ensureJoinsAreForeignKeys(sql: string, workspaceId: number) {
		// Very naive join parser: find "JOIN schema.table ON left = right"
		const joinRegex = /JOIN\s+([\w_]+\.)?([\w_]+)\s+ON\s+([^\n]+?)(?=\bJOIN\b|$)/gi
		let match: RegExpExecArray | null
		const comparisons: Array<{ left: string; right: string }> = []
		while ((match = joinRegex.exec(sql)) !== null) {
			const onExpr = match[3]
			// collect equality comparisons a.b = c.d
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

		for (const cmp of comparisons) {
			// We don't have schema alias resolution here; require fully qualified a.b where a is table alias equal to table name or schema.table
			const leftParts = cmp.left.split('.')
			const rightParts = cmp.right.split('.')
			if (leftParts.length < 2 || rightParts.length < 2) {
				throw new BadRequestException(
					'JOINs must use qualified column names and match declared FKs',
				)
			}
			// We try to match by table name only when schema is unknown
			const candidates = [
				`${leftParts.length === 3 ? leftParts[0] : ''}.${leftParts[leftParts.length - 2]}.${leftParts[leftParts.length - 1]}->${rightParts.length === 3 ? rightParts[0] : ''}.${rightParts[rightParts.length - 2]}.${rightParts[rightParts.length - 1]}`,
			]
			if (!candidates.some(c => allowedPairs.has(c))) {
				throw new BadRequestException('JOINs must follow foreign key relationships for safety')
			}
		}
	}
}
