// Frontend DTOs (mirror backend DTOs). Keep in sync with API.

export type WORKSPACE_PURPOSE =
  | 'HEALTH_CARE'
  | 'E_COMMERCE'
  | 'GOVERNEMENT'
  | 'ACCOUNTING'
  | 'OTHER';

export type DATA_SOURCE_TYPE = 'POSTGRES' | 'MYSQL';

/* ---------- Data source config ---------- */
export interface PostgresConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
}

export interface MysqlConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

export type DataSourceConfig = PostgresConfig | MysqlConfig;

export interface DataSourceDto {
  type: DATA_SOURCE_TYPE;
  config: DataSourceConfig;
}

/* ---------- Workspaces ---------- */
export interface CreateWorkspaceDto {
  name: string;
  description: string;
  purpose: WORKSPACE_PURPOSE;
}

export interface UpdateWorkspaceDto {
  name?: string;
  description?: string;
  purpose?: WORKSPACE_PURPOSE;
}

export interface WorkspaceDto {
  id: number;
  name: string;
  description: string;
  purpose: WORKSPACE_PURPOSE;
  ownerId: number;
  createdAt: string;  // ISO date from API
  updatedAt: string;  // ISO date from API
  dataSource?: DataSourceDto;
}

/* ---------- Upsert Data Source ---------- */
export interface UpsertDataSourceDto {
  type: DATA_SOURCE_TYPE;
  config: DataSourceConfig;
}

/* ---------- Business metadata ---------- */
export interface BusinessColumnDto {
  id: number;
  columnName: string;
  dataType: string;
  isNullable: boolean;
  isPrimaryKey: boolean;
  businessName?: string;
  description?: string;
}

export interface BusinessTableDto {
  id: number;
  schemaName: string;
  tableName: string;
  businessName?: string;
  description?: string;
  columns: BusinessColumnDto[];
}

export interface BusinessMetadataDto {
  tables: BusinessTableDto[];
}

export interface UpdateTableBusinessDto {
  businessName?: string;
  description?: string;
}

export interface UpdateColumnBusinessDto {
  businessName?: string;
  description?: string;
}

/* ---------- Ingestion ---------- */
export interface StartIngestionResponse {
  ingestionId: number;
}

/**
 * The backend type wasn't provided; keep flexible.
 * If you later define the precise shape, update this interface.
 */
export type LatestIngestionDto = Record<string, unknown>;
