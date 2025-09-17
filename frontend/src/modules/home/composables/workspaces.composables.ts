import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import type { MaybeRef } from 'vue'
import { computed, unref } from 'vue'

import type { BaseQueryOptions } from '@/core/configs/query-client.config'

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
import { WorkspacesServiceError, workspacesService } from '../services/workspaces.service'

/* =========================
   QUERY KEYS
   ========================= */
export const WORKSPACES_QUERY_KEYS = {
	all: ['workspaces', 'list'] as const,
	detail: (id: number) => ['workspaces', 'detail', id] as const,
	metadata: (id: number) => ['workspaces', 'metadata', id] as const,
	ingestionLatest: (id: number) => ['workspaces', 'ingestion', 'latest', id] as const,
} as const

/* =========================
   QUERIES
   ========================= */

/** All workspaces for current user */
export const useWorkspacesList = (queryOptions?: BaseQueryOptions<WorkspaceDto[]>) => {
	return useQuery<WorkspaceDto[], WorkspacesServiceError>({
		queryKey: WORKSPACES_QUERY_KEYS.all,
		queryFn: () => workspacesService.getAllWorkspaces(),
		...queryOptions,
	})
}

/** Single workspace by ID */
export const useWorkspace = (
	id: MaybeRef<number | undefined>,
	queryOptions?: BaseQueryOptions<WorkspaceDto>,
) => {
	const resolvedId = computed(() => unref(id))
	return useQuery<WorkspaceDto, WorkspacesServiceError>({
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

/** Business metadata for a workspace */
export const useBusinessMetadata = (
	id: MaybeRef<number | undefined>,
	queryOptions?: BaseQueryOptions<BusinessMetadataDto>,
) => {
	const resolvedId = computed(() => unref(id))
	return useQuery<BusinessMetadataDto, WorkspacesServiceError>({
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
 * Latest ingestion status for a workspace.
 * You can pass `refetchInterval` via queryOptions if you already know the server shape,
 * or keep it manual. Example:
 *   useLatestIngestion(id, { refetchInterval: data => (data?.status === 'DONE' ? false : 2000) })
 */
export const useLatestIngestion = (
	id: MaybeRef<number | undefined>,
	queryOptions?: BaseQueryOptions<LatestIngestionDto>,
) => {
	const resolvedId = computed(() => unref(id))
	return useQuery<LatestIngestionDto, WorkspacesServiceError>({
		queryKey: computed(() =>
			resolvedId.value
				? WORKSPACES_QUERY_KEYS.ingestionLatest(resolvedId.value)
				: (['workspaces', 'ingestion', 'latest', 'none'] as const),
		),
		queryFn: () => workspacesService.getLatestIngestion(resolvedId.value as number),
		enabled: computed(() => !!resolvedId.value),
		...queryOptions,
	})
}

/* =========================
   MUTATIONS
   ========================= */

/** Create workspace */
export const useCreateWorkspace = () => {
	const qc = useQueryClient()
	return useMutation<WorkspaceDto, WorkspacesServiceError, CreateWorkspaceDto>({
		mutationFn: dto => workspacesService.createWorkspace(dto),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['workspaces'] })
		},
	})
}

/** Update workspace */
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

/** Delete workspace */
export const useDeleteWorkspace = () => {
	const qc = useQueryClient()
	return useMutation<void, WorkspacesServiceError, number>({
		mutationFn: id => workspacesService.deleteWorkspace(id),
		onSuccess: (_res, id) => {
			qc.invalidateQueries({ queryKey: ['workspaces'] })
			qc.invalidateQueries({ queryKey: WORKSPACES_QUERY_KEYS.detail(id) })
			// metadata/ingestion implicitly invalidated by list refetch
		},
	})
}

/** Upsert data source config for a workspace */
export const useUpsertDataSource = () => {
	const qc = useQueryClient()
	return useMutation<void, WorkspacesServiceError, { id: number; dto: UpsertDataSourceDto }>({
		mutationFn: ({ id, dto }) => workspacesService.upsertDataSource(id, dto),
		onSuccess: (_ok, { id }) => {
			qc.invalidateQueries({ queryKey: WORKSPACES_QUERY_KEYS.detail(id) })
			// Often metadata changes after new connection
			qc.invalidateQueries({ queryKey: WORKSPACES_QUERY_KEYS.metadata(id) })
		},
	})
}

/** Start ingestion (kicks off async job on server) */
export const useStartIngestion = () => {
	const qc = useQueryClient()
	return useMutation<StartIngestionResponse, WorkspacesServiceError, number>({
		mutationFn: id => workspacesService.startIngestion(id),
		onSuccess: (_resp, id) => {
			// Immediately refresh "latest" status; caller may also enable polling with useLatestIngestion
			qc.invalidateQueries({ queryKey: WORKSPACES_QUERY_KEYS.ingestionLatest(id) })
		},
	})
}

/** Update business metadata for a TABLE */
export const useUpdateTableBusiness = () => {
	const qc = useQueryClient()
	return useMutation<
		void,
		WorkspacesServiceError,
		{ id: number; tableId: number; dto: UpdateTableBusinessDto }
	>({
		mutationFn: ({ id, tableId, dto }) => workspacesService.updateTableBusiness(id, tableId, dto),
		onSuccess: (_ok, { id }) => {
			qc.invalidateQueries({ queryKey: WORKSPACES_QUERY_KEYS.metadata(id) })
		},
	})
}

/** Update business metadata for a COLUMN */
export const useUpdateColumnBusiness = () => {
	const qc = useQueryClient()
	return useMutation<
		void,
		WorkspacesServiceError,
		{ id: number; tableId: number; columnId: number; dto: UpdateColumnBusinessDto }
	>({
		mutationFn: ({ id, tableId, columnId, dto }) =>
			workspacesService.updateColumnBusiness(id, tableId, columnId, dto),
		onSuccess: (_ok, { id }) => {
			qc.invalidateQueries({ queryKey: WORKSPACES_QUERY_KEYS.metadata(id) })
		},
	})
}
