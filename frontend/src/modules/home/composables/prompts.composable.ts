import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, unref } from 'vue'
import type { MaybeRef } from 'vue'

import type { BaseQueryOptions } from '@/core/configs/query-client.config'

import {
	type CreateDataRequestDto,
	type DataRequestResultDto,
	isTerminalStatus,
} from '../models/prompts.models'
import { DataRequestsServiceError, dataRequestsService } from '../services/prompts.service'

/* =========================
   QUERY KEYS
   ========================= */
export const DATA_REQUESTS_QUERY_KEYS = {
	one: (workspaceId: number, requestId: number) =>
		['data-requests', 'detail', workspaceId, requestId] as const,
} as const

/* =========================
   QUERIES
   ========================= */

/**
 * Single data request by workspace + id
 */
export const useDataRequest = (
	workspaceId: MaybeRef<number | undefined>,
	requestId: MaybeRef<number | undefined>,
	queryOptions?: BaseQueryOptions<DataRequestResultDto>,
) => {
	const ws = computed(() => unref(workspaceId))
	const rid = computed(() => unref(requestId))
	return useQuery<DataRequestResultDto, DataRequestsServiceError>({
		queryKey: computed(() =>
			ws.value && rid.value
				? DATA_REQUESTS_QUERY_KEYS.one(ws.value, rid.value)
				: (['data-requests', 'detail', 'none'] as const),
		),
		queryFn: () => dataRequestsService.getOne(ws.value as number, rid.value as number),
		enabled: computed(() => !!ws.value && !!rid.value),
		...queryOptions,
	})
}

/**
 * Polling helper query: pass `refetchInterval` logic automatically until terminal.
 * You can override the delay (ms) via `intervalMs`.
 */
export const useDataRequestPolling = (
	workspaceId: MaybeRef<number | undefined>,
	requestId: MaybeRef<number | undefined>,
	intervalMs = 1500,
	queryOptions?: BaseQueryOptions<DataRequestResultDto>,
) => {
	return useDataRequest(workspaceId, requestId, {
		refetchInterval: (data: DataRequestResultDto) =>
			data && !isTerminalStatus(data.status) ? intervalMs : false,
		...queryOptions,
	})
}

/* =========================
   MUTATIONS
   ========================= */

/**
 * Create a new data request (returns 202 + request payload)
 * Caller usually then starts polling by `useDataRequestPolling`.
 */
export const useCreateDataRequest = () => {
	const qc = useQueryClient()
	return useMutation<
		DataRequestResultDto,
		DataRequestsServiceError,
		{ workspaceId: number; dto: CreateDataRequestDto }
	>({
		mutationFn: ({ workspaceId, dto }) => dataRequestsService.create(workspaceId, dto),
		onSuccess: (res, { workspaceId }) => {
			// Prime the cache so detail screen is instant
			if (res?.requestId) {
				qc.setQueryData(DATA_REQUESTS_QUERY_KEYS.one(workspaceId, res.requestId), res)
			}
		},
	})
}
