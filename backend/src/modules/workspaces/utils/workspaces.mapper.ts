// src/modules/workspaces/utils/workspaces.mapper.ts

import { Prisma, Workspace as PrismaWorkspace, WorkspaceDataSource } from '@prisma/client'
import { WorkspaceDto, DataSourceDto } from '../dtos/workspaces.dtos'
import { EncryptionService } from 'src/common/services/encryption.service'
import { DataSourceConfig } from '../types/data-source.types'

export function toWorkspaceDto(
	raw: PrismaWorkspace,
	dataSource?: WorkspaceDataSource | null,
	encryptionService?: EncryptionService,
): WorkspaceDto {
	let decryptedDataSource: DataSourceDto | undefined

	if (dataSource && encryptionService) {
		try {
			const decryptedConfig: DataSourceConfig = JSON.parse(
				encryptionService.decrypt(dataSource.config as string),
			) as DataSourceConfig
			decryptedDataSource = {
				type: dataSource.type,
				config: decryptedConfig,
			}
		} catch (error) {
			// If decryption fails, don't include dataSource
			console.error('Failed to decrypt data source config:', error)
		}
	}

	return {
		id: raw.id,
		name: raw.name,
		description: raw.description,
		purpose: raw.purpose,
		ownerId: raw.ownerId,
		createdAt: raw.createdAt,
		updatedAt: raw.updatedAt,
		dataSource: decryptedDataSource,
	}
}

export function toInputJsonValue(value: unknown): Prisma.InputJsonValue {
	return value as Prisma.InputJsonValue
}

export function toBaseWorkspaces(raw: PrismaWorkspace[]): WorkspaceDto[] {
	return raw.map(workspace => ({
		id: workspace.id,
		name: workspace.name,
		description: workspace.description,
		purpose: workspace.purpose,
		ownerId: workspace.ownerId,
		createdAt: workspace.createdAt,
		updatedAt: workspace.updatedAt,
	}))
}
