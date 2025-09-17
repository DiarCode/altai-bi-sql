import { isAxiosError } from 'axios'

import { apiClient } from '@/core/configs/axios-instance.config'

import type { CreateDataRequestDto, DataRequestResultDto } from '../models/prompts.models'

/* --------------------------------- */
/* Error type                        */
/* --------------------------------- */
export class DataRequestsServiceError extends Error {
	constructor(
		message: string,
		public statusCode?: number,
	) {
		super(message)
		this.name = 'DataRequestsServiceError'
		Object.setPrototypeOf(this, DataRequestsServiceError.prototype)
	}
}

/* --------------------------------- */
/* Service                           */
/* --------------------------------- */
class DataRequestsService {
	/** POST /workspaces/:workspaceId/requests  (202 Accepted) */
	async create(workspaceId: number, dto: CreateDataRequestDto) {
		try {
			const res = await apiClient.post<DataRequestResultDto>(
				`/workspaces/${workspaceId}/requests`,
				dto,
			)
			if (res.status >= 200 && res.status < 300) return res.data
			throw new DataRequestsServiceError(
				`Failed to create data request. Status: ${res.status}`,
				res.status,
			)
		} catch (err) {
			if (isAxiosError(err)) {
				throw new DataRequestsServiceError(
					err.message || 'Error creating data request',
					err.response?.status,
				)
			}
			throw new DataRequestsServiceError('Unknown error creating data request', 500)
		}
	}

	/** GET /workspaces/:workspaceId/requests/:id */
	async getOne(workspaceId: number, id: number) {
		try {
			const res = await apiClient.get<DataRequestResultDto>(
				`/workspaces/${workspaceId}/requests/${id}`,
			)
			if (res.status >= 200 && res.status < 300) return res.data
			throw new DataRequestsServiceError(
				`Failed to fetch data request #${id}. Status: ${res.status}`,
				res.status,
			)
		} catch (err) {
			if (isAxiosError(err)) {
				throw new DataRequestsServiceError(
					err.message || `Error fetching data request #${id}`,
					err.response?.status,
				)
			}
			throw new DataRequestsServiceError('Unknown error fetching data request', 500)
		}
	}
}

export const dataRequestsService = new DataRequestsService()
