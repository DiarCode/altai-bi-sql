// ---------------------------------------------
// Enums
// ---------------------------------------------
export enum DataSourceType {
	POSTGRESQL = 'POSTGRESQL',
	MYSQL = 'MYSQL',
}

export enum WorkspacePurpose {
	HEALTH_CARE = 'HEALTH_CARE',
	E_COMMERCE = 'E_COMMERCE',
	GOVERNMENT = 'GOVERNMENT',
	ACCOUNTING = 'ACCOUNTING',
	MARKETING = 'MARKETING',
	EDUCATION = 'EDUCATION',
	FINANCE = 'FINANCE',
	ENTERTAINMENT = 'ENTERTAINMENT',
	TECHNOLOGY = 'TECHNOLOGY',
	REAL_ESTATE = 'REAL_ESTATE',
	TRAVEL = 'TRAVEL',
	FOOD_BEVERAGE = 'FOOD_BEVERAGE',
	NON_PROFIT = 'NON_PROFIT',
	SPORTS = 'SPORTS',
	DEFAULT = 'DEFAULT',
	OTHER = 'OTHER',
}

export enum IngestionStatus {
	PENDING = 'PENDING',
	RUNNING = 'RUNNING',
	SUCCEEDED = 'SUCCEEDED',
	FAILED = 'FAILED',
}

// ---------------------------------------------
// Data source configs
// ---------------------------------------------
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

export interface DataSourceDto {
	type: DataSourceType
	config: DataSourceConfig
}

// ---------------------------------------------
// Workspace DTOs
// ---------------------------------------------
export interface CreateWorkspaceDto {
	name: string
	description: string
	purpose: WorkspacePurpose
}

export interface UpdateWorkspaceDto {
	name?: string
	description?: string
	purpose?: WorkspacePurpose
}

export interface WorkspaceDto {
	id: number
	name: string
	description: string
	purpose: WorkspacePurpose
	ownerId: number
	createdAt: string | Date
	updatedAt: string | Date
	dataSource?: DataSourceDto
}

export interface UpsertDataSourceDto {
	type: DataSourceType
	config: DataSourceConfig
}

// ---------------------------------------------
// Business metadata DTOs
// ---------------------------------------------
export interface BusinessColumnDto {
	id: number
	columnName: string
	dataType: string
	isNullable: boolean
	isPrimaryKey: boolean
	businessName?: string
	description?: string
}

export interface BusinessTableDto {
	id: number
	schemaName: string
	tableName: string
	businessName?: string
	description?: string
	columns: BusinessColumnDto[]
}

export interface BusinessMetadataDto {
	tables: BusinessTableDto[]
}

export interface UpdateTableBusinessDto {
	businessName?: string
	description?: string
}

export interface UpdateColumnBusinessDto {
	businessName?: string
	description?: string
}

// ---------------------------------------------
// Ingestion DTO
// ---------------------------------------------
export interface WorkspaceIngestionDto {
	id: number
	workspaceId: number
	status: IngestionStatus
	startedAt: string | Date | null
	finishedAt: string | Date | null
	error: string | null
}
