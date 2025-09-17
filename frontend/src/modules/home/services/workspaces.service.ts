import { isAxiosError } from 'axios'

import { apiClient } from '@/core/configs/axios-instance.config'

import type {
	BusinessMetadataDto,
	CreateWorkspaceDto,
	LatestIngestionDto,
	StartIngestionResponse,
	UpdateColumnBusinessDto,
	UpdateTableBusinessDto,
	UpdateWorkspaceDto,
	UpsertDataSourceDto,
	WorkspaceDto,
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
/* Service                           */
/* --------------------------------- */
class WorkspacesService {
	/* GET /workspaces */
	async getAllWorkspaces() {
		try {
			const res = await apiClient.get<WorkspaceDto[]>('/workspaces')
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

	/* POST /workspaces */
	async createWorkspace(dto: CreateWorkspaceDto) {
		try {
			const res = await apiClient.post<WorkspaceDto>('/workspaces', dto)
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

	/* GET /workspaces/:id */
	async getWorkspaceById(id: number) {
		try {
			const res = await apiClient.get<WorkspaceDto>(`/workspaces/${id}`)
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

	/* PUT /workspaces/:id */
	async updateWorkspace(id: number, dto: UpdateWorkspaceDto) {
		try {
			const res = await apiClient.put<WorkspaceDto>(`/workspaces/${id}`, dto)
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

	/* DELETE /workspaces/:id */
	async deleteWorkspace(id: number) {
		try {
			const res = await apiClient.delete<void>(`/workspaces/${id}`)
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

	/* PUT /workspaces/:id/config */
	async upsertDataSource(id: number, dto: UpsertDataSourceDto) {
		try {
			const res = await apiClient.put<void>(`/workspaces/${id}/config`, dto)
			if (res.status >= 200 && res.status < 300) return
			throw new WorkspacesServiceError(
				`Failed to update data source for workspace #${id}. Status: ${res.status}`,
				res.status,
			)
		} catch (err) {
			if (isAxiosError(err)) {
				throw new WorkspacesServiceError(
					err.message || `Error updating data source for workspace #${id}`,
					err.response?.status,
				)
			}
			throw new WorkspacesServiceError('Unknown error updating data source', 500)
		}
	}

	/* POST /workspaces/:id/ingest */
	async startIngestion(id: number) {
		try {
			const res = await apiClient.post<StartIngestionResponse>(`/workspaces/${id}/ingest`)
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

	/* GET /workspaces/:id/ingest/latest */
	async getLatestIngestion(id: number) {
		try {
			const res = await apiClient.get<LatestIngestionDto>(`/workspaces/${id}/ingest/latest`)
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

	/* GET /workspaces/:id/metadata */
	async getBusinessMetadata(id: number) {
		try {
			const res = await apiClient.get<BusinessMetadataDto>(`/workspaces/${id}/metadata`)
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

	/* PUT /workspaces/:id/metadata/tables/:tableId */
	async updateTableBusiness(id: number, tableId: number, dto: UpdateTableBusinessDto) {
		try {
			const res = await apiClient.put<void>(`/workspaces/${id}/metadata/tables/${tableId}`, dto)
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

	/* PUT /workspaces/:id/metadata/tables/:tableId/columns/:columnId */
	async updateColumnBusiness(
		id: number,
		tableId: number,
		columnId: number,
		dto: UpdateColumnBusinessDto,
	) {
		try {
			const res = await apiClient.put<void>(
				`/workspaces/${id}/metadata/tables/${tableId}/columns/${columnId}`,
				dto,
			)
			if (res.status >= 200 && res.status < 300) return
			throw new WorkspacesServiceError(
				`Failed to update column business metadata (ws #${id}, table #${tableId}, col #${columnId}). Status: ${res.status}`,
				res.status,
			)
		} catch (err) {
			if (isAxiosError(err)) {
				throw new WorkspacesServiceError(
					err.message ||
						`Error updating column business metadata (ws #${id}, table #${tableId}, col #${columnId})`,
					err.response?.status,
				)
			}
			throw new WorkspacesServiceError('Unknown error updating column business metadata', 500)
		}
	}
}

export const workspacesService = new WorkspacesService()
