import { Injectable } from '@nestjs/common'
import { DATA_SOURCE_TYPE } from '@prisma/client'
import { PostgresConfig, MysqlConfig } from '../types/data-source.types'
import { Client as PgClient } from 'pg'
import mysql, { RowDataPacket } from 'mysql2/promise'

export interface IntrospectedColumn {
	schemaName: string
	tableName: string
	columnName: string
	dataType: string
	isNullable: boolean
	isPrimaryKey: boolean
}

export interface IntrospectedFK {
	constraintName?: string
	fromSchema: string
	fromTable: string
	fromColumn: string
	toSchema: string
	toTable: string
	toColumn: string
}

export interface IntrospectedSchema {
	tables: { schemaName: string; tableName: string }[]
	columns: IntrospectedColumn[]
	fks: IntrospectedFK[]
}

@Injectable()
export class SchemaReaderService {
	async read(
		type: DATA_SOURCE_TYPE,
		config: PostgresConfig | MysqlConfig,
	): Promise<IntrospectedSchema> {
		if (type === DATA_SOURCE_TYPE.POSTGRESQL) {
			return this.readPostgres(config as PostgresConfig)
		}
		return this.readMysql(config as MysqlConfig)
	}

	private async readPostgres(config: PostgresConfig): Promise<IntrospectedSchema> {
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
			const tablesRes = await client.query(
				`SELECT table_schema, table_name
				 FROM information_schema.tables
				 WHERE table_type='BASE TABLE' AND table_schema NOT IN ('pg_catalog','information_schema')`,
			)
			type PgTableRow = { table_schema: string; table_name: string }
			const tables = (tablesRes.rows as PgTableRow[]).map(r => ({
				schemaName: r.table_schema,
				tableName: r.table_name,
			}))

			const colsRes = await client.query(
				`SELECT c.table_schema, c.table_name, c.column_name, c.data_type, c.is_nullable,
					CASE WHEN tc.constraint_type = 'PRIMARY KEY' THEN true ELSE false END AS is_pk
				 FROM information_schema.columns c
				 LEFT JOIN information_schema.key_column_usage kcu
				   ON c.table_schema=kcu.table_schema AND c.table_name=kcu.table_name AND c.column_name=kcu.column_name
				 LEFT JOIN information_schema.table_constraints tc
				   ON tc.constraint_name=kcu.constraint_name AND tc.table_schema=kcu.table_schema AND tc.table_name=kcu.table_name AND tc.constraint_type='PRIMARY KEY'
				 WHERE c.table_schema NOT IN ('pg_catalog','information_schema')`,
			)
			type PgColRow = {
				table_schema: string
				table_name: string
				column_name: string
				data_type: string
				is_nullable: 'YES' | 'NO'
				is_pk: boolean | null
			}
			const columns = (colsRes.rows as PgColRow[]).map(r => ({
				schemaName: r.table_schema,
				tableName: r.table_name,
				columnName: r.column_name,
				dataType: r.data_type,
				isNullable: r.is_nullable === 'YES',
				isPrimaryKey: !!r.is_pk,
			}))

			const fkRes = await client.query(
				`SELECT tc.constraint_name,
				        kcu.table_schema   AS from_schema,
				        kcu.table_name     AS from_table,
				        kcu.column_name    AS from_column,
				        ccu.table_schema   AS to_schema,
				        ccu.table_name     AS to_table,
				        ccu.column_name    AS to_column
				 FROM information_schema.table_constraints AS tc
				 JOIN information_schema.key_column_usage AS kcu
				   ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
				 JOIN information_schema.constraint_column_usage AS ccu
				   ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
				 WHERE tc.constraint_type = 'FOREIGN KEY' AND kcu.table_schema NOT IN ('pg_catalog','information_schema')`,
			)
			type PgFkRow = {
				constraint_name: string | null
				from_schema: string
				from_table: string
				from_column: string
				to_schema: string
				to_table: string
				to_column: string
			}
			const fks = (fkRes.rows as PgFkRow[]).map(r => ({
				constraintName: r.constraint_name ?? undefined,
				fromSchema: r.from_schema,
				fromTable: r.from_table,
				fromColumn: r.from_column,
				toSchema: r.to_schema,
				toTable: r.to_table,
				toColumn: r.to_column,
			}))

			return { tables, columns, fks }
		} finally {
			await client.end()
		}
	}

	private async readMysql(config: MysqlConfig): Promise<IntrospectedSchema> {
		const conn = await mysql.createConnection({
			host: config.host,
			port: config.port,
			database: config.database,
			user: config.user,
			password: config.password,
		})
		try {
			interface MysqlTableRow extends RowDataPacket {
				table_schema: string
				table_name: string
			}
			const [tablesRows] = await conn.execute<MysqlTableRow[]>(
				`SELECT table_schema, table_name
				 FROM information_schema.tables
				 WHERE table_schema = DATABASE()`,
			)
			const tables = tablesRows.map(r => ({
				schemaName: r.table_schema,
				tableName: r.table_name,
			}))

			interface MysqlColRow extends RowDataPacket {
				table_schema: string
				table_name: string
				column_name: string
				data_type: string
				is_nullable: 'YES' | 'NO'
				is_pk: boolean | null
			}
			const [colsRows] = await conn.execute<MysqlColRow[]>(
				`SELECT c.table_schema, c.table_name, c.column_name, c.data_type, c.is_nullable,
				        CASE WHEN k.constraint_name = 'PRIMARY' THEN true ELSE false END AS is_pk
				 FROM information_schema.columns c
				 LEFT JOIN information_schema.key_column_usage k
				   ON c.table_schema=k.table_schema AND c.table_name=k.table_name AND c.column_name=k.column_name
				 WHERE c.table_schema = DATABASE()`,
			)
			const columns = colsRows.map(r => ({
				schemaName: r.table_schema,
				tableName: r.table_name,
				columnName: r.column_name,
				dataType: r.data_type,
				isNullable: r.is_nullable === 'YES',
				isPrimaryKey: !!r.is_pk,
			}))

			interface MysqlFkRow extends RowDataPacket {
				constraint_name: string | null
				from_schema: string
				from_table: string
				from_column: string
				to_schema: string
				to_table: string
				to_column: string
			}
			const [fkRows] = await conn.execute<MysqlFkRow[]>(
				`SELECT rc.CONSTRAINT_NAME as constraint_name,
				        k.TABLE_SCHEMA as from_schema,
				        k.TABLE_NAME as from_table,
				        k.COLUMN_NAME as from_column,
				        k.REFERENCED_TABLE_SCHEMA as to_schema,
				        k.REFERENCED_TABLE_NAME as to_table,
				        k.REFERENCED_COLUMN_NAME as to_column
				 FROM information_schema.referential_constraints rc
				 JOIN information_schema.key_column_usage k
				   ON rc.CONSTRAINT_SCHEMA = k.CONSTRAINT_SCHEMA AND rc.CONSTRAINT_NAME = k.CONSTRAINT_NAME
				 WHERE rc.CONSTRAINT_SCHEMA = DATABASE()`,
			)
			const fks = fkRows.map(r => ({
				constraintName: r.constraint_name ?? undefined,
				fromSchema: r.from_schema,
				fromTable: r.from_table,
				fromColumn: r.from_column,
				toSchema: r.to_schema,
				toTable: r.to_table,
				toColumn: r.to_column,
			}))

			return { tables, columns, fks }
		} finally {
			await conn.end()
		}
	}
}
