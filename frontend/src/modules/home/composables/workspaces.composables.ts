import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { type MaybeRef, computed, unref } from 'vue'

import type { BaseQueryOptions } from '@/core/configs/query-client.config'

import {
	type BusinessMetadataDto,
	type CreateWorkspaceDto,
	IngestionStatus,
	type UpdateColumnBusinessDto,
	type UpdateTableBusinessDto,
	type UpdateWorkspaceDto,
	type UpsertDataSourceDto,
	type WorkspaceDto,
	type WorkspaceIngestionDto,
} from '../models/workspaces.models'
import { WorkspacesServiceError, workspacesService } from '../services/workspaces.service'

/* =========================
   CENTRALIZED QUERY KEYS
   ========================= */
export const WORKSPACES_QUERY_KEYS = {
	all: ['workspaces', 'list'] as const,
	detail: (id: number) => ['workspaces', 'detail', id] as const,
	metadata: (id: number) => ['workspaces', 'metadata', id] as const,
	ingestionLatest: (id: number) => ['workspaces', 'ingestion', 'latest', id] as const,
} as const

/* =========================
   HELPERS
   ========================= */
const isActiveIngestion = (s?: IngestionStatus) =>
	s === IngestionStatus.PENDING || s === IngestionStatus.RUNNING

/* =========================
   QUERIES
   ========================= */

/** GET /workspaces — list */
export const useWorkspacesList = (queryOptions?: BaseQueryOptions<WorkspaceDto[]>) => {
	return useQuery({
		queryKey: computed(() => WORKSPACES_QUERY_KEYS.all),
		queryFn: () => workspacesService.getAllWorkspaces(),
		...queryOptions,
	})
}

/** GET /workspaces/:id — detail */
export const useWorkspace = (
	id: MaybeRef<number | undefined>,
	queryOptions?: BaseQueryOptions<WorkspaceDto>,
) => {
	const resolvedId = computed(() => unref(id))
	return useQuery({
		queryKey: computed(() =>
			resolvedId.value
				? WORKSPACES_QUERY_KEYS.detail(resolvedId.value)
				: (['workspaces', 'detail', 'none'] as const),
		),
		queryFn: () => workspacesService.getWorkspaceById(resolvedId.value as number),
		enabled: computed(() => !!resolvedId.value),
		...queryOptions,
	})
}

/** GET /workspaces/:id/metadata — business metadata */
export const useBusinessMetadata = (
	id: MaybeRef<number | undefined>,
	queryOptions?: BaseQueryOptions<BusinessMetadataDto>,
) => {
	const resolvedId = computed(() => unref(id))
	return useQuery({
		queryKey: computed(() =>
			resolvedId.value
				? WORKSPACES_QUERY_KEYS.metadata(resolvedId.value)
				: (['workspaces', 'metadata', 'none'] as const),
		),
		queryFn: () => workspacesService.getBusinessMetadata(resolvedId.value as number),
		enabled: computed(() => !!resolvedId.value),
		...queryOptions,
	})
}

/**
 * GET /workspaces/:id/ingest/latest — auto-poll latest ingestion status
 *
 * Polls while status is PENDING or RUNNING.
 * Stops automatically when SUCCEEDED/FAILED (or if disabled).
 */
export const useWorkspaceIngestionStatus = (
	id: MaybeRef<number | undefined>,
	/**
	 * Optional polling tuning. Example:
	 * { baseMs: 2000, slowAfterMs: 60000, slowMs: 5000 }
	 */
	opts?: {
		baseMs?: number
		slowAfterMs?: number
		slowMs?: number
	} & BaseQueryOptions<WorkspaceIngestionDto>,
) => {
	const resolvedId = computed(() => unref(id))
	const baseMs = opts?.baseMs ?? 2000
	const slowAfterMs = opts?.slowAfterMs ?? 60_000
	const slowMs = opts?.slowMs ?? 5000

	// Track first poll time to switch to slower cadence later
	let firstStartedAt = 0

	return useQuery({
		queryKey: computed(() =>
			resolvedId.value
				? WORKSPACES_QUERY_KEYS.ingestionLatest(resolvedId.value)
				: (['workspaces', 'ingestion', 'latest', 'none'] as const),
		),
		queryFn: () => workspacesService.getLatestIngestion(resolvedId.value as number),
		enabled: computed(() => !!resolvedId.value),
		refetchOnWindowFocus: true,
		refetchIntervalInBackground: true,
		// v5 API: function returning number (ms) or false
		refetchInterval: query => {
			const status = (query.state.data as WorkspaceIngestionDto | undefined)?.status
			if (!status || !isActiveIngestion(status)) {
				firstStartedAt = 0
				return false
			}
			if (!firstStartedAt) firstStartedAt = Date.now()
			const elapsed = Date.now() - firstStartedAt
			return elapsed > slowAfterMs ? slowMs : baseMs
		},
		// fresh each tick so UI reacts instantly
		staleTime: 0,
		...opts,
	})
}

/* =========================
   MUTATIONS
   ========================= */

/** POST /workspaces */
export const useCreateWorkspace = () => {
	const qc = useQueryClient()
	return useMutation<WorkspaceDto, WorkspacesServiceError, CreateWorkspaceDto>({
		mutationFn: dto => workspacesService.createWorkspace(dto),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['workspaces'] })
		},
	})
}

/** PUT /workspaces/:id */
export const useUpdateWorkspace = () => {
	const qc = useQueryClient()
	return useMutation<WorkspaceDto, WorkspacesServiceError, { id: number; dto: UpdateWorkspaceDto }>(
		{
			mutationFn: ({ id, dto }) => workspacesService.updateWorkspace(id, dto),
			onSuccess: (updated, { id }) => {
				qc.invalidateQueries({ queryKey: ['workspaces'] })
				qc.invalidateQueries({ queryKey: WORKSPACES_QUERY_KEYS.detail(id) })
			},
		},
	)
}

/** DELETE /workspaces/:id */
export const useDeleteWorkspace = () => {
	const qc = useQueryClient()
	return useMutation<void, WorkspacesServiceError, number>({
		mutationFn: id => workspacesService.deleteWorkspace(id),
		onSuccess: (_res, id) => {
			qc.invalidateQueries({ queryKey: ['workspaces'] })
			qc.invalidateQueries({ queryKey: WORKSPACES_QUERY_KEYS.detail(id) })
			qc.removeQueries({ queryKey: WORKSPACES_QUERY_KEYS.detail(id) })
			qc.removeQueries({ queryKey: WORKSPACES_QUERY_KEYS.metadata(id) })
			qc.removeQueries({ queryKey: WORKSPACES_QUERY_KEYS.ingestionLatest(id) })
		},
	})
}

/** PUT /workspaces/:id/config */
export const useUpsertDataSource = () => {
	const qc = useQueryClient()
	return useMutation<void, WorkspacesServiceError, { id: number; dto: UpsertDataSourceDto }>({
		mutationFn: ({ id, dto }) => workspacesService.upsertDataSource(id, dto),
		onSuccess: (_res, { id }) => {
			// Refresh workspace detail to show attached config
			qc.invalidateQueries({ queryKey: WORKSPACES_QUERY_KEYS.detail(id) })
		},
	})
}

/** POST /workspaces/:id/ingest — start, then let status query auto-poll */
export const useStartIngestion = () => {
	const qc = useQueryClient()
	return useMutation<{ ingestionId: number }, WorkspacesServiceError, number>({
		mutationFn: id => workspacesService.startIngestion(id),
		onSuccess: (_data, id) => {
			// Nudge status query immediately; it will continue polling by itself
			qc.invalidateQueries({ queryKey: WORKSPACES_QUERY_KEYS.ingestionLatest(id) })
		},
	})
}

/** PUT /workspaces/:id/metadata/tables/:tableId */
export const useUpdateTableBusiness = () => {
	const qc = useQueryClient()
	return useMutation<
		void,
		WorkspacesServiceError,
		{ id: number; tableId: number; dto: UpdateTableBusinessDto }
	>({
		mutationFn: ({ id, tableId, dto }) => workspacesService.updateTableBusiness(id, tableId, dto),
		onSuccess: (_res, { id }) => {
			qc.invalidateQueries({ queryKey: WORKSPACES_QUERY_KEYS.metadata(id) })
		},
	})
}

/** PUT /workspaces/:id/metadata/tables/:tableId/columns/:columnId */
export const useUpdateColumnBusiness = () => {
	const qc = useQueryClient()
	return useMutation<
		void,
		WorkspacesServiceError,
		{ id: number; tableId: number; columnId: number; dto: UpdateColumnBusinessDto }
	>({
		mutationFn: ({ id, tableId, columnId, dto }) =>
			workspacesService.updateColumnBusiness(id, tableId, columnId, dto),
		onSuccess: (_res, { id }) => {
			qc.invalidateQueries({ queryKey: WORKSPACES_QUERY_KEYS.metadata(id) })
		},
	})
}
