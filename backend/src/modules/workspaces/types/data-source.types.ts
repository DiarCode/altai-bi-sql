// src/modules/workspaces/types/data-source.types.ts

export interface PostgresConfig {
	host: string
	port: number
	database: string
	user: string
	password: string
	ssl?: boolean
}

export interface MysqlConfig {
	host: string
	port: number
	database: string
	user: string
	password: string
}

export type DataSourceConfig = PostgresConfig | MysqlConfig
