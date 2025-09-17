<script setup lang="ts">
import { useQueryClient } from '@tanstack/vue-query';
import { ChevronDown, LogOut, Pencil, Plus } from 'lucide-vue-next';
import { storeToRefs } from 'pinia';
import { computed, onMounted, ref, shallowRef, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';



/* UI */
import { Avatar, AvatarFallback } from '@/core/components/ui/avatar';
import { Button } from '@/core/components/ui/button';
import { Card } from '@/core/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from '@/core/components/ui/dropdown-menu';
import DropdownMenuLabel from '@/core/components/ui/dropdown-menu/DropdownMenuLabel.vue';
import DropdownMenuSeparator from '@/core/components/ui/dropdown-menu/DropdownMenuSeparator.vue';



/* Auth */
import { useAuth } from '@/modules/auth/composables/use-auth.composable';
import { useMe } from '@/modules/auth/composables/use-me.composables';
/* Background */
import BackgroundImagePicker from '@/modules/home/components/background-image-picker.vue';
import { useBackgroundImage } from '@/modules/home/composables/home-bg.composable';



/* Home children */
import DatabaseModal from '../components/home-database-modal.vue';
import RequestComposer from '../components/home-request-composer.vue';
import RequestHistory from '../components/home-request-history.vue';
import WorkspaceModal from '../components/home-workspace-modal.vue';
/* Data Requests */
import { useCreateDataRequest, useDataRequestsList } from '../composables/data-requests.composable';
import { useCreateWorkspace, useUpsertDataSource, useWorkspaceIngestionStatus, useWorkspacesList } from '../composables/workspaces.composables';
import { type DataRequestResultDto, RequestStatus } from '../models/data-requests.models';
import { type GraphSpec, type RequestBundle, type UiStatus } from '../models/history.models';
/* Workspaces */
import type { CreateWorkspaceDto, DataSourceDto, UpsertDataSourceDto, WorkspaceDto } from '../models/workspaces.models';
import { IngestionStatus } from '../models/workspaces.models';





/* =========================
   Local state
   ========================= */
const route = useRoute()
const router = useRouter()
const queryClient = useQueryClient()

const activeWorkspaceId = ref<number | undefined>(undefined)
const showWorkspaceModal = ref(false)
const showDatabaseModal = ref(false)

/* =========================
   Workspaces
   ========================= */
const {
  data: workspacesData,
  isLoading: wsLoading,
  isFetching: wsFetching,
} = useWorkspacesList({
  refetchOnWindowFocus: true,
})
const workspaces = computed<WorkspaceDto[]>(() => workspacesData.value ?? [])

const activeWorkspace = computed<WorkspaceDto | undefined>(() =>
  workspaces.value.find(w => w.id === activeWorkspaceId.value),
)

const activeDataSource = computed<DataSourceDto | undefined>(() => activeWorkspace.value?.dataSource)

// Latest ingestion for the selected workspace
const {
  data: ingestion,
  isFetching: isIngestionPolling,
} = useWorkspaceIngestionStatus(activeWorkspaceId, {
  baseMs: 2000,
  slowAfterMs: 60000,
  slowMs: 5000,
})

/** Connection state derived from latest ingestion + config presence */
const connectionState = computed<'disconnected' | 'configured' | 'connecting' | 'connected' | 'error'>(() => {
  const hasConfig = Boolean(activeWorkspace.value?.dataSource)
  const s = ingestion.value?.status
  if (!hasConfig) return 'disconnected'
  if (s === IngestionStatus.RUNNING || s === IngestionStatus.PENDING) return 'connecting'
  if (s === IngestionStatus.SUCCEEDED) return 'connected'
  if (s === IngestionStatus.FAILED) return 'error'
  return 'configured'
})

const connectionLabel = computed(() => {
  switch (connectionState.value) {
    case 'connected': return 'Connected'
    case 'connecting': return 'Connecting…'
    case 'configured': return 'Configured'
    case 'error': return 'Error'
    default: return 'Disconnected'
  }
})

/** Colors for the dot */
const connectionDotClass = computed(() => {
  switch (connectionState.value) {
    case 'connected': return 'bg-emerald-400'
    case 'connecting': return 'bg-amber-400 animate-pulse'
    case 'configured': return 'bg-slate-300'
    case 'error': return 'bg-rose-400'
    default: return 'bg-rose-400'
  }
})

const { mutateAsync: createWorkspaceMut } = useCreateWorkspace()
const { mutateAsync: upsertDataSourceMut, isPending: isSavingDs } = useUpsertDataSource()

onMounted(() => {
  const q = route.query.ws
  const parsed = q ? Number(q) : undefined
  if (parsed && !Number.isNaN(parsed)) activeWorkspaceId.value = parsed
})

watch(workspaces, (list) => {
  if (!list?.length) return
  if (!activeWorkspaceId.value || !list.some(w => w.id === activeWorkspaceId.value)) {
    setActiveWorkspace(list[0].id)
  }
}, { immediate: true })

watch(activeWorkspaceId, (id) => {
  if (!id) return
  router.replace({ query: { ...route.query, ws: String(id) } })
})

function setActiveWorkspace(id: number) {
  if (activeWorkspaceId.value === id) return
  activeWorkspaceId.value = id
  // Warm up related queries
  queryClient.invalidateQueries({ queryKey: ['data-requests', 'list', id] })
  queryClient.invalidateQueries({ queryKey: ['workspaces', 'ingestion', 'latest', id] })
}

async function handleCreateWorkspace(dto: CreateWorkspaceDto) {
  const ws = await createWorkspaceMut(dto)
  setActiveWorkspace(ws.id)
  showWorkspaceModal.value = false
}

async function handleUpdateConnection(payload: UpsertDataSourceDto) {
  if (!activeWorkspaceId.value) return
  await upsertDataSourceMut({ id: activeWorkspaceId.value, dto: payload })
  // Do NOT close modal here; it stays open while connecting (modal handles its own UX)
}

/* =========================
   Data Requests (smooth)
   ========================= */
const {
  data: requestsData,
  isLoading: reqsLoading,
} = useDataRequestsList(
 activeWorkspaceId,
  {
    refetchOnWindowFocus: true,
    refetchIntervalInBackground: true,
    refetchInterval: 5000,
    staleTime: 10_000,                // give it a little freshness to reduce churn
  },
)

const { mutate: createDataRequest, isPending: isSubmittingPrompt } = useCreateDataRequest()

function onSubmitPrompt(prompt: string) {
  if (!activeWorkspaceId.value) return
  createDataRequest({ workspaceId: activeWorkspaceId.value, dto: { prompt } })
}

function onRetryFromHistory(item: RequestBundle) {
  console.log(item)
  // (Optional) re-run prompt if stored locally
}

/* ----- Stable mapper to avoid flashing ----- */
const asUiStatus = (s?: RequestStatus): UiStatus =>
  s === RequestStatus.SUCCEEDED ? 'success'
    : s === RequestStatus.FAILED ? 'error'
      : 'pending'

function columnarToRows(rt?: Record<string, unknown[]>) {
  if (!rt) return { columns: [], rows: [] as Array<Record<string, unknown>> }
  const columns = Object.keys(rt)
  const len = Math.max(0, ...columns.map(c => (Array.isArray(rt[c]) ? (rt[c] as unknown[]).length : 0)))
  const rows = Array.from({ length: len }, (_, i) => {
    const o: Record<string, unknown> = {}
    for (const c of columns) {
      const col = rt[c] as unknown[] | undefined
      o[c] = Array.isArray(col) ? col[i] : undefined
    }
    return o
  })
  return { columns, rows }
}

function toBundle(r: DataRequestResultDto): RequestBundle {
  const { columns, rows } = columnarToRows(r.resultTable)
  const graph: GraphSpec | undefined = r.graphConfig
    ? { xColumn: r.graphConfig.x, yColumnName: r.graphConfig.y, type: 'LINEAR' }
    : undefined
  return {
    request: {
      id: r.requestId,
      status: asUiStatus(r.status),
      prompt: r.prompt
      // createdAt / prompt can be wired when backend provides them
    },
    response: {
      sql: r.sqlScript ?? '',
      resultText: r.resultText ?? '',
      columns,
      rows,
      graph,
    },
  }
}

/** cheap, stable comparator to avoid replacing array when nothing important changed */
function bundlesEqual(a: RequestBundle[], b: RequestBundle[]) {
  if (a === b) return true
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    const x = a[i], y = b[i]
    if (x.request.id !== y.request.id || x.request.status !== y.request.status) return false
    if (!!x.response !== !!y.response) return false
    if (x.response && y.response) {
      if (x.response.sql !== y.response.sql || x.response.resultText !== y.response.resultText) return false
      if (x.response.columns.length !== y.response.columns.length) return false
      if (x.response.rows.length !== y.response.rows.length) return false
    }
  }
  return true
}

const historyItems = shallowRef<RequestBundle[]>([])
watch(requestsData, (list) => {
  const next = (list ?? []).map(toBundle)
  if (!bundlesEqual(next, historyItems.value)) {
    historyItems.value = next
  }
}, { immediate: true })

/** Only show the loader when we have no data yet */
const showRequestsLoader = computed(() => reqsLoading.value && !(requestsData.value && requestsData.value.length))

/* =========================
   Auth / header bits
   ========================= */
const { logout } = useAuth()
const { data: me } = useMe()
const userInitials = computed(() => {
  const name = me.value?.fullName?.trim() ?? ''
  if (!name) return ''
  const parts = name.split(/\s+/).filter(Boolean)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? parts.at(-1)![0] : parts[0]?.[1] ?? ''
  return (first + last).toUpperCase()
})

/* =========================
   Background & misc
   ========================= */
const bgStore = useBackgroundImage()
const { url: selectedBgUrl } = storeToRefs(bgStore)
const bgStyle = computed(() => ({ backgroundImage: `url(${selectedBgUrl.value})` }))

const wsBusy = computed(() => wsLoading.value || wsFetching.value)
const dbBusy = computed(() => isSavingDs.value || isIngestionPolling.value)
</script>

<template>
	<div
		class="relative bg-cover bg-center bg-fixed w-full min-h-screen"
		:style="bgStyle"
	>
		<div
			class="absolute inset-0 bg-gradient-to-br from-slate-950/50 via-slate-900/40 to-blue-950/30"
		/>

		<main
			class="z-10 relative flex flex-col items-center mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-5xl"
		>
			<!-- Header -->
			<div class="mb-4 sm:mb-10 w-full">
				<div class="hidden sm:flex sm:flex-row flex-col justify-between items-center gap-2">
					<div class="flex items-center gap-2">
						<!-- Workspace switcher -->
						<DropdownMenu>
							<DropdownMenuTrigger>
								<button
									class="inline-flex items-center gap-3 bg-white/10 backdrop-blur-lg px-3 py-3 border border-white/10 rounded-2xl cursor-pointer"
									title="Workspace"
									:disabled="wsBusy"
								>
									<div class="flex items-center gap-2">
										<span class="bg-blue-400 rounded-full w-2 h-2 animate-pulse" />
										<span class="hidden sm:inline font-semibold text-white text-sm">Workspace</span>
									</div>

									<span class="font-mono font-bold text-blue-100 text-sm truncate">
										<template v-if="wsBusy">Loading…</template>
										<template v-else>{{ activeWorkspace?.name ?? '—' }}</template>
									</span>

									<ChevronDown class="size-4 text-slate-500" />
								</button>
							</DropdownMenuTrigger>

							<DropdownMenuContent
								class="bg-slate-600/5 backdrop-blur-md border border-white/15 min-w-64"
							>
								<DropdownMenuGroup>
									<DropdownMenuLabel class="text-slate-400">Workspaces</DropdownMenuLabel>

									<DropdownMenuItem
										v-for="ws in workspaces"
										:key="ws.id"
										class="text-slate-200 transition-all duration-300 cursor-pointer"
										:class="{ 'bg-slate-500/20': activeWorkspace?.id === ws.id }"
										@click="setActiveWorkspace(ws.id)"
									>
										<div class="flex justify-between items-center w-full">
											<span>{{ ws.name }}</span>
											<span
												v-if="activeWorkspace?.id === ws.id"
												class="text-blue-400 text-xs"
												>●</span
											>
										</div>
									</DropdownMenuItem>
								</DropdownMenuGroup>

								<DropdownMenuSeparator class="bg-slate-300" />

								<DropdownMenuItem
									class="text-slate-200 transition-all duration-300 cursor-pointer"
									@click="showWorkspaceModal = true"
								>
									<Plus class="size-5 text-slate-200" /> Add
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>

						<!-- Database -->
						<DropdownMenu>
							<DropdownMenuTrigger>
								<button
									class="inline-flex items-center gap-4 bg-white/10 backdrop-blur-md px-4 py-3 border border-white/10 rounded-2xl cursor-pointer"
									title="Database Connection"
									:disabled="dbBusy"
								>
									<div class="flex items-center gap-2">
										<span
											class="rounded-full w-2 h-2"
											:class="connectionDotClass"
										/>
										<span class="hidden sm:inline font-semibold text-white text-sm">Database</span>
									</div>

									<span
										class="font-semibold text-sm"
										:class="connectionState === 'connected' ? 'text-emerald-300'
                              : connectionState === 'error' ? 'text-rose-300'
                              : connectionState === 'connecting' ? 'text-amber-300'
                              : 'text-slate-300'"
									>
										<template v-if="dbBusy">Working…</template>
										<template v-else>{{ connectionLabel }}</template>
									</span>

									<ChevronDown class="size-4 text-slate-500" />
								</button>
							</DropdownMenuTrigger>

							<DropdownMenuContent class="bg-slate-600/5 backdrop-blur-md border border-white/15">
								<div class="px-3 py-2 border-white/10 border-b text-slate-300 text-xs">
									<div class="flex items-center gap-2">
										<span class="opacity-80">Ingestion:</span>
										<span class="font-medium">{{ ingestion?.status ?? '—' }}</span>
										<div
											v-if="isIngestionPolling"
											class="border-2 border-current border-t-transparent rounded-full w-3 h-3 text-white/70 animate-spin"
										/>
									</div>
									<div
										v-if="ingestion?.error"
										class="mt-1 text-rose-300"
									>
										{{ ingestion.error }}
									</div>
								</div>

								<DropdownMenuItem
									class="text-slate-200 transition-all duration-300 cursor-pointer"
									@click="showDatabaseModal = true"
								>
									<component
										:is="activeDataSource ? Pencil : Plus"
										class="size-5 text-slate-200"
									/>
									<span class="ml-1">{{ activeDataSource ? 'Edit' : 'Add' }}</span>
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>

					<div class="flex items-center gap-2">
						<DropdownMenu>
							<DropdownMenuTrigger>
								<Avatar class="rounded-md size-11">
									<AvatarFallback
										class="bg-white/10 backdrop-blur-md border border-white/15 rounded-md text-white text-sm"
									>
										{{ userInitials }}
									</AvatarFallback>
								</Avatar>
							</DropdownMenuTrigger>

							<DropdownMenuContent class="bg-slate-500/5 backdrop-blur-md border border-white/15">
								<DropdownMenuItem
									@click="logout"
									class="text-destructive transition-all duration-300 cursor-pointer"
								>
									<LogOut class="size-5 text-destructive" /> Logout
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>

						<BackgroundImagePicker class="sm:hidden block" />
					</div>
				</div>
			</div>

			<!-- Main card -->
			<Card
				class="relative bg-slate-300/10 backdrop-blur-lg p-0 border border-white/20 rounded-3xl w-full overflow-hidden"
			>
				<RequestComposer
					:disabled="!activeWorkspaceId || isSubmittingPrompt"
					@submit="onSubmitPrompt"
				/>

				<div class="z-10 relative flex flex-col p-4">
					<!-- Show loader ONLY when we have no data yet -->
					<div
						v-if="showRequestsLoader"
						class="flex items-center gap-2 mb-3 text-slate-300 text-sm"
					>
						<div
							class="border-2 border-current border-t-transparent rounded-full w-4 h-4 animate-spin"
						/>
						Loading requests…
					</div>

					<RequestHistory
						:items="historyItems"
						:onRetry="onRetryFromHistory"
					/>

					<div
						v-if="!historyItems.length && !showRequestsLoader"
						class="flex flex-col justify-center items-center space-y-6 mt-12 text-center"
					>
						<div class="space-y-4">
							<h3 class="font-bold text-white text-2xl">Ready to explore your data?</h3>
							<p class="max-w-xl font-light text-slate-400 text-base">
								Start by asking a business question in plain English. The agent will convert it to
								SQL and return insights.
							</p>
						</div>
					</div>

					<div class="bg-gradient-to-r from-white/5 to-transparent mt-12 p-6 rounded-3xl">
						<div class="flex justify-between items-center gap-4">
							<p class="font-medium text-slate-200/80 text-sm">Results limited to 100 rows</p>

							<Button
								variant="ghost"
								size="sm"
								class="hover:bg-white/10 font-semibold text-slate-200 hover:text-white transition-all duration-300"
								@click="queryClient.invalidateQueries({ queryKey: ['data-requests'] })"
							>
								Refresh
							</Button>
						</div>
					</div>
				</div>
			</Card>
		</main>

		<WorkspaceModal
			v-model:open="showWorkspaceModal"
			@submit="handleCreateWorkspace"
		/>
		<DatabaseModal
			v-if="activeWorkspaceId"
			v-model:open="showDatabaseModal"
			:workspace-id="activeWorkspaceId"
			:mode="activeDataSource ? 'edit' : 'add'"
			:initial-data="activeDataSource"
			@submit="handleUpdateConnection"
		/>
	</div>
</template>
