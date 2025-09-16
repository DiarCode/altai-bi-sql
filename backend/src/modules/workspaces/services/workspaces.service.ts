// src/modules/workspaces/services/workspaces.service.ts

import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from 'src/prisma/prisma.service'
import { EncryptionService } from 'src/common/services/encryption.service'
import { SchemaReaderService } from './schema-reader.service'
import {
	CreateWorkspaceDto,
	UpdateWorkspaceDto,
	UpsertDataSourceDto,
	WorkspaceDto,
} from '../dtos/workspaces.dtos'
import { toWorkspaceDto } from '../utils/workspaces.mapper'
import { DATA_SOURCE_TYPE, INGESTION_STATUS } from '@prisma/client'
import { MysqlConfig, PostgresConfig } from '../types/data-source.types'
import { LlmClientService } from 'src/common/llm/llm.client'
import { PromptBuilderService } from 'src/common/llm/prompt.builder'

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

		const encryptedConfig = this.encryptionService.encrypt(JSON.stringify(dto.config))

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

	async getLatestIngestion(workspaceId: number, userId: number) {
		await this.getWorkspaceById(workspaceId, userId)
		const ing = await this.prisma.workspaceIngestion.findFirst({
			where: { workspaceId },
			orderBy: { id: 'desc' },
		})
		if (!ing) throw new NotFoundException('No ingestion found')
		return ing
	}

	// Business metadata: read
	async getBusinessMetadata(workspaceId: number, userId: number) {
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
	) {
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
	) {
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
				? this.asPostgresConfigOrThrow(parsed)
				: this.asMysqlConfigOrThrow(parsed)
		const meta = await this.schemaReader.read(ds.type, cfg)

		await this.prisma.$transaction(async tx => {
			await tx.dataTable.deleteMany({ where: { workspaceId } })

			const tableMap = new Map<string, number>()
			const perTableColumnBusiness = new Map<
				string,
				Record<string, { name?: string; description?: string }>
			>()
			for (const t of meta.tables) {
				// Call LLM to generate business-friendly names/descriptions for this table and its columns
				const colsForTable = meta.columns.filter(
					c => c.schemaName === t.schemaName && c.tableName === t.tableName,
				)
				let businessName: string | undefined
				let tableDescription: string | undefined
				const columnBusiness: Record<string, { name?: string; description?: string }> = {}

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
						model: 'llama-4-scout',
						messages: prompt.messages,
						max_completion_tokens: prompt.maxTokens,
						response_format: { type: 'json_object' },
					})
					const text = LlmClientService.firstText(resp)
					if (text) {
						try {
							interface BusinessNamesJson {
								table?: { businessName?: unknown; description?: unknown }
								columns?: Array<{
									columnName?: unknown
									businessName?: unknown
									description?: unknown
								}>
							}
							const parsed: unknown = JSON.parse(text)
							const obj = parsed as BusinessNamesJson
							if (obj && typeof obj === 'object') {
								const tInfo = obj.table
								if (tInfo && typeof tInfo === 'object') {
									if (typeof tInfo.businessName === 'string') {
										businessName = tInfo.businessName
									}
									if (typeof tInfo.description === 'string') {
										tableDescription = tInfo.description
									}
								}
								if (Array.isArray(obj.columns)) {
									for (const col of obj.columns) {
										const cname = typeof col?.columnName === 'string' ? col.columnName : undefined
										if (cname) {
											const entry: { name?: string; description?: string } = {}
											if (typeof col.businessName === 'string') entry.name = col.businessName
											if (typeof col.description === 'string') entry.description = col.description
											columnBusiness[cname] = entry
										}
									}
								}
							}
						} catch {
							// ignore
						}
					}
				} catch {
					// ignore LLM errors; fall back to undefined business names
				}

				const rec = await tx.dataTable.create({
					data: {
						workspaceId,
						schemaName: t.schemaName,
						tableName: t.tableName,
						businessName: businessName,
						description: tableDescription,
					},
				})
				tableMap.set(`${t.schemaName}.${t.tableName}`, rec.id)
				perTableColumnBusiness.set(`${t.schemaName}.${t.tableName}`, columnBusiness)
			}

			const columnKeyToId = new Map<string, number>()
			for (const c of meta.columns) {
				const tableId = tableMap.get(`${c.schemaName}.${c.tableName}`)
				if (!tableId) continue
				const tableKey = `${c.schemaName}.${c.tableName}`
				const colBizMap = perTableColumnBusiness.get(tableKey)
				const colBiz = colBizMap ? colBizMap[c.columnName] : undefined
				const col = await tx.dataColumn.create({
					data: {
						tableId,
						columnName: c.columnName,
						dataType: c.dataType,
						isNullable: c.isNullable,
						isPrimaryKey: c.isPrimaryKey,
						businessName: colBiz?.name,
						description: colBiz?.description,
					},
				})
				columnKeyToId.set(`${c.schemaName}.${c.tableName}.${c.columnName}`, col.id)
			}

			for (const f of meta.fks) {
				const fromTableId = tableMap.get(`${f.fromSchema}.${f.fromTable}`)
				const toTableId = tableMap.get(`${f.toSchema}.${f.toTable}`)
				const fromColumnId = columnKeyToId.get(`${f.fromSchema}.${f.fromTable}.${f.fromColumn}`)
				const toColumnId = columnKeyToId.get(`${f.toSchema}.${f.toTable}.${f.toColumn}`)
				if (!fromTableId || !toTableId || !fromColumnId || !toColumnId) continue
				await tx.foreignKey.create({
					data: {
						fromTableId,
						fromColumnId,
						toTableId,
						toColumnId,
						constraintName: f.constraintName,
					},
				})
			}
		})

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
