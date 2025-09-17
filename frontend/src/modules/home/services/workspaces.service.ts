import { isAxiosError } from 'axios'

import { apiClient } from '@/core/configs/axios-instance.config'

import type {
	BusinessMetadataDto,
	CreateWorkspaceDto,
	UpdateColumnBusinessDto,
	UpdateTableBusinessDto,
	UpdateWorkspaceDto,
	UpsertDataSourceDto,
	WorkspaceDto,
	WorkspaceIngestionDto,
} from '../models/workspaces.models'

/* --------------------------------- */
/* Error type                        */
/* --------------------------------- */
export class WorkspacesServiceError extends Error {
	constructor(
		message: string,
		public statusCode?: number,
	) {
		super(message)
		this.name = 'WorkspacesServiceError'
		Object.setPrototypeOf(this, WorkspacesServiceError.prototype)
	}
}

/* --------------------------------- */
/* Route helpers                     */
/* --------------------------------- */
const base = '/workspaces'
const route = {
	root: () => base,
	byId: (id: number) => `${base}/${id}`,
	config: (id: number) => `${base}/${id}/config`,
	ingestStart: (id: number) => `${base}/${id}/ingest`,
	ingestLatest: (id: number) => `${base}/${id}/ingest/latest`,
	metadata: (id: number) => `${base}/${id}/metadata`,
	metadataTable: (id: number, tableId: number) => `${base}/${id}/metadata/tables/${tableId}`,
	metadataColumn: (id: number, tableId: number, columnId: number) =>
		`${base}/${id}/metadata/tables/${tableId}/columns/${columnId}`,
}

/* --------------------------------- */
/* Service                           */
/* --------------------------------- */
class WorkspacesService {
	// GET /workspaces
	async getAllWorkspaces(): Promise<WorkspaceDto[]> {
		try {
			const res = await apiClient.get<WorkspaceDto[]>(route.root())
			if (res.status >= 200 && res.status < 300) return res.data
			throw new WorkspacesServiceError(
				`Failed to fetch workspaces. Status: ${res.status}`,
				res.status,
			)
		} catch (err) {
			if (isAxiosError(err)) {
				throw new WorkspacesServiceError(
					err.message || 'Error fetching workspaces',
					err.response?.status,
				)
			}
			throw new WorkspacesServiceError('Unknown error fetching workspaces', 500)
		}
	}

	// POST /workspaces
	async createWorkspace(dto: CreateWorkspaceDto): Promise<WorkspaceDto> {
		try {
			const res = await apiClient.post<WorkspaceDto>(route.root(), dto)
			if (res.status >= 200 && res.status < 300) return res.data
			throw new WorkspacesServiceError(
				`Failed to create workspace. Status: ${res.status}`,
				res.status,
			)
		} catch (err) {
			if (isAxiosError(err)) {
				throw new WorkspacesServiceError(
					err.message || 'Error creating workspace',
					err.response?.status,
				)
			}
			throw new WorkspacesServiceError('Unknown error creating workspace', 500)
		}
	}

	// GET /workspaces/:id
	async getWorkspaceById(id: number): Promise<WorkspaceDto> {
		try {
			const res = await apiClient.get<WorkspaceDto>(route.byId(id))
			if (res.status >= 200 && res.status < 300) return res.data
			throw new WorkspacesServiceError(
				`Failed to fetch workspace #${id}. Status: ${res.status}`,
				res.status,
			)
		} catch (err) {
			if (isAxiosError(err)) {
				throw new WorkspacesServiceError(
					err.message || `Error fetching workspace #${id}`,
					err.response?.status,
				)
			}
			throw new WorkspacesServiceError('Unknown error fetching workspace', 500)
		}
	}

	// PUT /workspaces/:id
	async updateWorkspace(id: number, dto: UpdateWorkspaceDto): Promise<WorkspaceDto> {
		try {
			const res = await apiClient.put<WorkspaceDto>(route.byId(id), dto)
			if (res.status >= 200 && res.status < 300) return res.data
			throw new WorkspacesServiceError(
				`Failed to update workspace #${id}. Status: ${res.status}`,
				res.status,
			)
		} catch (err) {
			if (isAxiosError(err)) {
				throw new WorkspacesServiceError(
					err.message || `Error updating workspace #${id}`,
					err.response?.status,
				)
			}
			throw new WorkspacesServiceError('Unknown error updating workspace', 500)
		}
	}

	// DELETE /workspaces/:id
	async deleteWorkspace(id: number): Promise<void> {
		try {
			const res = await apiClient.delete<void>(route.byId(id))
			if (res.status >= 200 && res.status < 300) return
			throw new WorkspacesServiceError(
				`Failed to delete workspace #${id}. Status: ${res.status}`,
				res.status,
			)
		} catch (err) {
			if (isAxiosError(err)) {
				throw new WorkspacesServiceError(
					err.message || `Error deleting workspace #${id}`,
					err.response?.status,
				)
			}
			throw new WorkspacesServiceError('Unknown error deleting workspace', 500)
		}
	}

	// PUT /workspaces/:id/config
	async upsertDataSource(id: number, dto: UpsertDataSourceDto): Promise<void> {
		try {
			const res = await apiClient.put<void>(route.config(id), dto)
			if (res.status >= 200 && res.status < 300) return
			throw new WorkspacesServiceError(
				`Failed to upsert data source for workspace #${id}. Status: ${res.status}`,
				res.status,
			)
		} catch (err) {
			if (isAxiosError(err)) {
				throw new WorkspacesServiceError(
					err.message || `Error upserting data source for workspace #${id}`,
					err.response?.status,
				)
			}
			throw new WorkspacesServiceError('Unknown error upserting data source', 500)
		}
	}

	// POST /workspaces/:id/ingest
	async startIngestion(id: number): Promise<{ ingestionId: number }> {
		try {
			const res = await apiClient.post<{ ingestionId: number }>(route.ingestStart(id))
			if (res.status >= 200 && res.status < 300) return res.data
			throw new WorkspacesServiceError(
				`Failed to start ingestion for workspace #${id}. Status: ${res.status}`,
				res.status,
			)
		} catch (err) {
			if (isAxiosError(err)) {
				throw new WorkspacesServiceError(
					err.message || `Error starting ingestion for workspace #${id}`,
					err.response?.status,
				)
			}
			throw new WorkspacesServiceError('Unknown error starting ingestion', 500)
		}
	}

	// GET /workspaces/:id/ingest/latest
	async getLatestIngestion(id: number): Promise<WorkspaceIngestionDto> {
		try {
			const res = await apiClient.get<WorkspaceIngestionDto>(route.ingestLatest(id))
			if (res.status >= 200 && res.status < 300) return res.data
			throw new WorkspacesServiceError(
				`Failed to fetch latest ingestion for workspace #${id}. Status: ${res.status}`,
				res.status,
			)
		} catch (err) {
			if (isAxiosError(err)) {
				throw new WorkspacesServiceError(
					err.message || `Error fetching latest ingestion for workspace #${id}`,
					err.response?.status,
				)
			}
			throw new WorkspacesServiceError('Unknown error fetching latest ingestion', 500)
		}
	}

	// GET /workspaces/:id/metadata
	async getBusinessMetadata(id: number): Promise<BusinessMetadataDto> {
		try {
			const res = await apiClient.get<BusinessMetadataDto>(route.metadata(id))
			if (res.status >= 200 && res.status < 300) return res.data
			throw new WorkspacesServiceError(
				`Failed to fetch business metadata for workspace #${id}. Status: ${res.status}`,
				res.status,
			)
		} catch (err) {
			if (isAxiosError(err)) {
				throw new WorkspacesServiceError(
					err.message || `Error fetching business metadata for workspace #${id}`,
					err.response?.status,
				)
			}
			throw new WorkspacesServiceError('Unknown error fetching business metadata', 500)
		}
	}

	// PUT /workspaces/:id/metadata/tables/:tableId
	async updateTableBusiness(
		id: number,
		tableId: number,
		dto: UpdateTableBusinessDto,
	): Promise<void> {
		try {
			const res = await apiClient.put<void>(route.metadataTable(id, tableId), dto)
			if (res.status >= 200 && res.status < 300) return
			throw new WorkspacesServiceError(
				`Failed to update table business metadata (ws #${id}, table #${tableId}). Status: ${res.status}`,
				res.status,
			)
		} catch (err) {
			if (isAxiosError(err)) {
				throw new WorkspacesServiceError(
					err.message || `Error updating table business metadata (ws #${id}, table #${tableId})`,
					err.response?.status,
				)
			}
			throw new WorkspacesServiceError('Unknown error updating table business metadata', 500)
		}
	}

	// PUT /workspaces/:id/metadata/tables/:tableId/columns/:columnId
	async updateColumnBusiness(
		id: number,
		tableId: number,
		columnId: number,
		dto: UpdateColumnBusinessDto,
	): Promise<void> {
		try {
			const res = await apiClient.put<void>(route.metadataColumn(id, tableId, columnId), dto)
			if (res.status >= 200 && res.status < 300) return
			throw new WorkspacesServiceError(
				`Failed to update column business metadata (ws #${id}, table #${tableId}, column #${columnId}). Status: ${res.status}`,
				res.status,
			)
		} catch (err) {
			if (isAxiosError(err)) {
				throw new WorkspacesServiceError(
					err.message ||
						`Error updating column business metadata (ws #${id}, table #${tableId}, column #${columnId})`,
					err.response?.status,
				)
			}
			throw new WorkspacesServiceError('Unknown error updating column business metadata', 500)
		}
	}
}

export const workspacesService = new WorkspacesService()
