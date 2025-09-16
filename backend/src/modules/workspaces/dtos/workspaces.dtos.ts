// src/modules/workspaces/dtos/workspaces.dtos.ts

import { ApiProperty } from '@nestjs/swagger'
import { IsString, IsNotEmpty, IsEnum, IsObject, IsOptional, IsNumber } from 'class-validator'
import { WORKSPACE_PURPOSE, DATA_SOURCE_TYPE, INGESTION_STATUS } from '@prisma/client'
import { PostgresConfig, MysqlConfig, DataSourceConfig } from '../types/data-source.types'

export class PostgresConfigDto implements PostgresConfig {
	@ApiProperty()
	@IsString()
	@IsNotEmpty()
	host: string

	@ApiProperty()
	@IsNumber()
	port: number

	@ApiProperty()
	@IsString()
	@IsNotEmpty()
	database: string

	@ApiProperty()
	@IsString()
	@IsNotEmpty()
	user: string

	@ApiProperty()
	@IsString()
	@IsNotEmpty()
	password: string

	@ApiProperty({ required: false })
	@IsOptional()
	ssl?: boolean
}

export class MysqlConfigDto implements MysqlConfig {
	@ApiProperty()
	@IsString()
	@IsNotEmpty()
	host: string

	@ApiProperty()
	@IsNumber()
	port: number

	@ApiProperty()
	@IsString()
	@IsNotEmpty()
	database: string

	@ApiProperty()
	@IsString()
	@IsNotEmpty()
	user: string

	@ApiProperty()
	@IsString()
	@IsNotEmpty()
	password: string
}

export class CreateDataSourceDto {
	@ApiProperty({ enum: DATA_SOURCE_TYPE })
	@IsEnum(DATA_SOURCE_TYPE)
	type: DATA_SOURCE_TYPE

	@ApiProperty({
		oneOf: [
			{ $ref: '#/components/schemas/PostgresConfigDto' },
			{ $ref: '#/components/schemas/MysqlConfigDto' },
		],
	})
	@IsObject()
	config: DataSourceConfig
}

export class UpsertDataSourceDto {
	@ApiProperty({ enum: DATA_SOURCE_TYPE })
	@IsEnum(DATA_SOURCE_TYPE)
	type: DATA_SOURCE_TYPE

	@ApiProperty({
		oneOf: [
			{ $ref: '#/components/schemas/PostgresConfigDto' },
			{ $ref: '#/components/schemas/MysqlConfigDto' },
		],
	})
	@IsObject()
	config: DataSourceConfig
}

export class DataSourceDto {
	@ApiProperty({ enum: DATA_SOURCE_TYPE })
	type: DATA_SOURCE_TYPE

	@ApiProperty({
		oneOf: [
			{ $ref: '#/components/schemas/PostgresConfigDto' },
			{ $ref: '#/components/schemas/MysqlConfigDto' },
		],
	})
	config: DataSourceConfig
}

export class CreateWorkspaceDto {
	@ApiProperty()
	@IsString()
	@IsNotEmpty()
	name: string

	@ApiProperty()
	@IsString()
	@IsNotEmpty()
	description: string

	@ApiProperty({ enum: WORKSPACE_PURPOSE })
	@IsEnum(WORKSPACE_PURPOSE)
	purpose: WORKSPACE_PURPOSE
}

export class UpdateWorkspaceDto {
	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	@IsNotEmpty()
	name?: string

	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	@IsNotEmpty()
	description?: string

	@ApiProperty({ enum: WORKSPACE_PURPOSE, required: false })
	@IsOptional()
	@IsEnum(WORKSPACE_PURPOSE)
	purpose?: WORKSPACE_PURPOSE
}

export class BaseWorkspaceDto {
	@ApiProperty()
	id: number

	@ApiProperty({ required: false })
	name: string

	@ApiProperty({ required: false })
	description: string

	@ApiProperty({ enum: WORKSPACE_PURPOSE, required: false })
	purpose: WORKSPACE_PURPOSE

	@ApiProperty()
	ownerId: number

	@ApiProperty()
	createdAt: Date

	@ApiProperty()
	updatedAt: Date
}

export class WorkspaceDto {
	@ApiProperty()
	id: number

	@ApiProperty()
	name: string

	@ApiProperty()
	description: string

	@ApiProperty({ enum: WORKSPACE_PURPOSE })
	purpose: WORKSPACE_PURPOSE

	@ApiProperty()
	ownerId: number

	@ApiProperty()
	createdAt: Date

	@ApiProperty()
	updatedAt: Date

	@ApiProperty({ required: false, type: DataSourceDto })
	@IsOptional()
	dataSource?: DataSourceDto
}

// Business metadata DTOs
export class BusinessColumnDto {
	@ApiProperty()
	id: number

	@ApiProperty()
	columnName: string

	@ApiProperty()
	dataType: string

	@ApiProperty()
	isNullable: boolean

	@ApiProperty()
	isPrimaryKey: boolean

	@ApiProperty({ required: false })
	businessName?: string

	@ApiProperty({ required: false })
	description?: string
}

export class BusinessTableDto {
	@ApiProperty()
	id: number

	@ApiProperty()
	schemaName: string

	@ApiProperty()
	tableName: string

	@ApiProperty({ required: false })
	businessName?: string

	@ApiProperty({ required: false })
	description?: string

	@ApiProperty({ type: [BusinessColumnDto] })
	columns: BusinessColumnDto[]
}

export class BusinessMetadataDto {
	@ApiProperty({ type: [BusinessTableDto] })
	tables: BusinessTableDto[]
}

export class UpdateTableBusinessDto {
	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	@IsNotEmpty()
	businessName?: string

	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	@IsNotEmpty()
	description?: string
}

export class UpdateColumnBusinessDto {
	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	@IsNotEmpty()
	businessName?: string

	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	@IsNotEmpty()
	description?: string
}

// Ingestion status DTO
export class WorkspaceIngestionDto {
	@ApiProperty()
	id: number

	@ApiProperty()
	workspaceId: number

	@ApiProperty({ enum: INGESTION_STATUS })
	status: INGESTION_STATUS

	@ApiProperty()
	startedAt: Date | null

	@ApiProperty()
	finishedAt: Date | null

	@ApiProperty()
	error: string | null
}
