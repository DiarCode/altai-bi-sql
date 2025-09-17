import { isAxiosError } from 'axios'

import { apiClient } from '@/core/configs/axios-instance.config'

import type { CreateDataRequestDto, DataRequestResultDto } from '../models/data-requests.models'

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
/* Route helpers                     */
/* --------------------------------- */
const base = (workspaceId: number) => `/workspaces/${workspaceId}/requests`
const route = {
	root: (workspaceId: number) => base(workspaceId),
	latest: (workspaceId: number) => `${base(workspaceId)}/latest`,
	byId: (workspaceId: number, id: number) => `${base(workspaceId)}/${id}`,
}

/* --------------------------------- */
/* Service                           */
/* --------------------------------- */
class DataRequestsService {
	/**
	 * POST /workspaces/:workspaceId/requests
	 * Accepts the request (202) and returns initial status payload.
	 */
	async create(workspaceId: number, dto: CreateDataRequestDto): Promise<DataRequestResultDto> {
		try {
			const res = await apiClient.post<DataRequestResultDto>(route.root(workspaceId), dto)
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

	/**
	 * GET /workspaces/:workspaceId/requests/latest
	 * Returns the most recent request for the user in this workspace.
	 */
	async getLatest(workspaceId: number): Promise<DataRequestResultDto> {
		try {
			const res = await apiClient.get<DataRequestResultDto>(route.latest(workspaceId))
			if (res.status >= 200 && res.status < 300) return res.data
			throw new DataRequestsServiceError(
				`Failed to fetch latest data request. Status: ${res.status}`,
				res.status,
			)
		} catch (err) {
			if (isAxiosError(err)) {
				throw new DataRequestsServiceError(
					err.message || 'Error fetching latest data request',
					err.response?.status,
				)
			}
			throw new DataRequestsServiceError('Unknown error fetching latest data request', 500)
		}
	}

	/**
	 * GET /workspaces/:workspaceId/requests/:id
	 * Returns a specific request status/result.
	 */
	async getOne(workspaceId: number, id: number): Promise<DataRequestResultDto> {
		try {
			const res = await apiClient.get<DataRequestResultDto>(route.byId(workspaceId, id))
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

	/**
	 * GET /workspaces/:workspaceId/requests
	 * Returns a list of recent requests.
	 */
	async getAll(workspaceId: number): Promise<DataRequestResultDto[]> {
		try {
			const res = await apiClient.get<DataRequestResultDto[]>(route.root(workspaceId))
			if (res.status >= 200 && res.status < 300) return res.data
			throw new DataRequestsServiceError(
				`Failed to fetch data requests. Status: ${res.status}`,
				res.status,
			)
		} catch (err) {
			if (isAxiosError(err)) {
				throw new DataRequestsServiceError(
					err.message || 'Error fetching data requests',
					err.response?.status,
				)
			}
			throw new DataRequestsServiceError('Unknown error fetching data requests', 500)
		}
	}
}

export const dataRequestsService = new DataRequestsService()
