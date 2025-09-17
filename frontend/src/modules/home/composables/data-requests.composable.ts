import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { type MaybeRef, computed, unref } from 'vue'

import type { BaseQueryOptions } from '@/core/configs/query-client.config'

import {
	type CreateDataRequestDto,
	type DataRequestResultDto,
	RequestStatus,
} from '../models/data-requests.models'
import { DataRequestsServiceError, dataRequestsService } from '../services/data-requests.service'

/* =========================
   QUERY KEYS
   ========================= */
export const DATA_REQUESTS_QUERY_KEYS = {
	list: (workspaceId: number) => ['data-requests', 'list', workspaceId] as const,
	latest: (workspaceId: number) => ['data-requests', 'latest', workspaceId] as const,
	detail: (workspaceId: number, id: number) =>
		['data-requests', 'detail', workspaceId, id] as const,
} as const

/* =========================
   HELPERS
   ========================= */
const isActive = (s?: RequestStatus) => s === RequestStatus.PENDING

/* =========================
   QUERIES
   ========================= */

/** GET /workspaces/:workspaceId/requests — recent list */
export const useDataRequestsList = (
	workspaceId: MaybeRef<number | undefined>,
	queryOptions?: BaseQueryOptions<DataRequestResultDto[]>,
) => {
	const wid = computed(() => unref(workspaceId))
	return useQuery({
		queryKey: computed(() =>
			wid.value
				? DATA_REQUESTS_QUERY_KEYS.list(wid.value)
				: (['data-requests', 'list', 'none'] as const),
		),
		queryFn: () => dataRequestsService.getAll(wid.value as number),
		enabled: computed(() => !!wid.value),
		...queryOptions,
	})
}

/**
 * GET /workspaces/:workspaceId/requests/latest — auto-poll until SUCCEEDED/FAILED
 * Same cadence shape as ingestion: baseMs → slowMs after slowAfterMs.
 */
export const useLatestDataRequest = (
	workspaceId: MaybeRef<number | undefined>,
	opts?: {
		baseMs?: number
		slowAfterMs?: number
		slowMs?: number
	} & BaseQueryOptions<DataRequestResultDto>,
) => {
	const wid = computed(() => unref(workspaceId))
	const baseMs = opts?.baseMs ?? 2000
	const slowAfterMs = opts?.slowAfterMs ?? 60_000
	const slowMs = opts?.slowMs ?? 5000

	let firstStartedAt = 0

	return useQuery({
		queryKey: computed(() =>
			wid.value
				? DATA_REQUESTS_QUERY_KEYS.latest(wid.value)
				: (['data-requests', 'latest', 'none'] as const),
		),
		queryFn: () => dataRequestsService.getLatest(wid.value as number),
		enabled: computed(() => !!wid.value),
		refetchOnWindowFocus: true,
		refetchIntervalInBackground: true,
		refetchInterval: q => {
			const status = (q.state.data as DataRequestResultDto | undefined)?.status
			if (!status || !isActive(status)) {
				firstStartedAt = 0
				return false
			}
			if (!firstStartedAt) firstStartedAt = Date.now()
			const elapsed = Date.now() - firstStartedAt
			return elapsed > slowAfterMs ? slowMs : baseMs
		},
		staleTime: 0,
		...opts,
	})
}

/**
 * GET /workspaces/:workspaceId/requests/:id — auto-poll one request
 * Useful when you have a specific requestId to track.
 */
export const useDataRequest = (
	workspaceId: MaybeRef<number | undefined>,
	id: MaybeRef<number | undefined>,
	opts?: {
		baseMs?: number
		slowAfterMs?: number
		slowMs?: number
	} & BaseQueryOptions<DataRequestResultDto>,
) => {
	const wid = computed(() => unref(workspaceId))
	const rid = computed(() => unref(id))
	const baseMs = opts?.baseMs ?? 2000
	const slowAfterMs = opts?.slowAfterMs ?? 60_000
	const slowMs = opts?.slowMs ?? 5000

	let firstStartedAt = 0

	return useQuery({
		queryKey: computed(() =>
			wid.value && rid.value
				? DATA_REQUESTS_QUERY_KEYS.detail(wid.value, rid.value)
				: (['data-requests', 'detail', 'none'] as const),
		),
		queryFn: () => dataRequestsService.getOne(wid.value as number, rid.value as number),
		enabled: computed(() => !!wid.value && !!rid.value),
		refetchOnWindowFocus: true,
		refetchIntervalInBackground: true,
		refetchInterval: q => {
			const status = (q.state.data as DataRequestResultDto | undefined)?.status
			if (!status || !isActive(status)) {
				firstStartedAt = 0
				return false
			}
			if (!firstStartedAt) firstStartedAt = Date.now()
			const elapsed = Date.now() - firstStartedAt
			return elapsed > slowAfterMs ? slowMs : baseMs
		},
		staleTime: 0,
		...opts,
	})
}

/* =========================
   MUTATIONS
   ========================= */

/**
 * POST /workspaces/:workspaceId/requests — create/execute
 * On success, we invalidate both `latest` and `list`.
 */
export const useCreateDataRequest = () => {
	const qc = useQueryClient()
	return useMutation<
		DataRequestResultDto,
		DataRequestsServiceError,
		{ workspaceId: number; dto: CreateDataRequestDto }
	>({
		mutationFn: ({ workspaceId, dto }) => dataRequestsService.create(workspaceId, dto),
		onSuccess: (_res, { workspaceId }) => {
			qc.invalidateQueries({ queryKey: DATA_REQUESTS_QUERY_KEYS.latest(workspaceId) })
			qc.invalidateQueries({ queryKey: DATA_REQUESTS_QUERY_KEYS.list(workspaceId) })
		},
	})
}
