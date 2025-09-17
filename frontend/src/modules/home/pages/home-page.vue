<script setup lang="ts">
import { useQueryClient } from '@tanstack/vue-query';
import { ChevronDown, LogOut, Pencil, Plus } from "lucide-vue-next";
import { storeToRefs } from "pinia";
import { computed, onMounted, ref, watch } from 'vue';



/* UI */
import { Avatar, AvatarFallback } from "@/core/components/ui/avatar";
import { Button } from '@/core/components/ui/button';
import { Card } from '@/core/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from "@/core/components/ui/dropdown-menu";
import DropdownMenuLabel from "@/core/components/ui/dropdown-menu/DropdownMenuLabel.vue";
import DropdownMenuSeparator from "@/core/components/ui/dropdown-menu/DropdownMenuSeparator.vue";



/* Auth */
import { useAuth } from "@/modules/auth/composables/use-auth.composable";
import { useMe } from "@/modules/auth/composables/use-me.composables";
/* Background */
import BackgroundImagePicker from "@/modules/home/components/background-image-picker.vue";
import { useBackgroundImage } from "@/modules/home/composables/home-bg.composable";
import type { CreateWorkspaceDto, UpsertDataSourceDto } from "@/modules/home/models/workspaces.models";
import { dataRequestsService } from "@/modules/home/services/prompts.service";



/* Home children */
import DatabaseModal from '../components/home-database-modal.vue';
import RequestComposer from '../components/home-request-composer.vue';
import RequestHistory from '../components/home-request-history.vue';
import WorkspaceModal from '../components/home-workspace-modal.vue';
import { useCreateDataRequest } from '../composables/prompts.composable';
/* NEW: Workspaces + Data Requests composables */
import { useCreateWorkspace, useUpsertDataSource, useWorkspacesList } from '../composables/workspaces.composables';
import { type DataRequestResultDto, isTerminalStatus, toUiGraphSpec } from '../models/prompts.models';





/* ========= Types your UI expects ========= */
type GraphType = 'LINEAR' | 'BAR'
type GraphSpec = { xColumn: string; yColumnName: string; type: GraphType }
type RequestBundle = {
  request: {
    id?: number
    prompt: string
    status: 'pending' | 'success' | 'error'
    createdAt: number
    errorMessage?: string
  },
  response?: {
    sql: string
    resultText: string
    columns: string[]
    rows: Array<Record<string, unknown>>
    graph?: GraphSpec
  }
}

/* ========= Local state ========= */
const LAST_WS_KEY = 'APP:lastWorkspaceId'
const activeWorkspaceId = ref<number | undefined>(undefined)
const bundles = ref<RequestBundle[]>([])

/* ========= Workspaces: queries & mutations ========= */
const { data: workspacesData } = useWorkspacesList()
const workspaces = computed(() => workspacesData.value ?? [])

const { mutateAsync: createWorkspaceMut } = useCreateWorkspace()
const { mutateAsync: upsertDataSourceMut } = useUpsertDataSource()

/* Choose active ws: restore from storage or pick first */
onMounted(() => {
  const raw = localStorage.getItem(LAST_WS_KEY)
  if (raw) activeWorkspaceId.value = Number(raw)
  if (!activeWorkspaceId.value && workspaces.value.length) {
    activeWorkspaceId.value = workspaces.value[0].id
  }
})
watch(workspaces, (list) => {
  if (!list?.length) return
  if (!activeWorkspaceId.value || !list.some(w => w.id === activeWorkspaceId.value)) {
    activeWorkspaceId.value = list[0].id
  }
}, { immediate: true })

watch(activeWorkspaceId, (id) => {
  if (id) localStorage.setItem(LAST_WS_KEY, String(id))
})

const activeWorkspace = computed(() => workspaces.value.find(w => w.id === activeWorkspaceId.value))
const workspaceName = computed(() => activeWorkspace.value?.name ?? '—')
const connectedReadonly = computed(() => Boolean(activeWorkspace.value?.dataSource)) // simple, fast indicator

async function switchWorkspace(id: number) {
  activeWorkspaceId.value = id
}

async function createWorkspace(data: CreateWorkspaceDto) {
  const ws = await createWorkspaceMut(data)
  activeWorkspaceId.value = ws.id
}

/* DB upsert adapter (maps your modal payload to API dto) */
async function updateConnection(data: UpsertDataSourceDto) {
  if (!activeWorkspaceId.value) return

  await upsertDataSourceMut({ id: activeWorkspaceId.value, dto: data })
}

/* ========= Data Requests: create + polling ========= */
const queryClient = useQueryClient()
const { mutateAsync: createDataRequest } = useCreateDataRequest()

/* Helpers */
function mapStatus(status?: string): 'pending' | 'success' | 'error' {
  if (!status) return 'pending'
  const s = status.toUpperCase()
  if (s.includes('DONE') || s.includes('SUCCESS')) return 'success'
  if (s.includes('ERROR') || s.includes('FAILED')) return 'error'
  return 'pending'
}
function tableRecordToRows(rt?: Record<string, unknown[]>): { columns: string[]; rows: Array<Record<string, unknown>> } {
  if (!rt) return { columns: [], rows: [] }
  const columns = Object.keys(rt)
  const len = Math.max(0, ...columns.map(c => (Array.isArray(rt[c]) ? rt[c].length : 0)))
  const rows: Array<Record<string, unknown>> = Array.from({ length: len }, (_, i) => {
    const obj: Record<string, unknown> = {}
    for (const c of columns) {
      const arr = rt[c] as unknown[] | undefined
      obj[c] = Array.isArray(arr) ? arr[i] : undefined
    }
    return obj
  })
  return { columns, rows }
}
function resultToResponse(result: DataRequestResultDto): RequestBundle['response'] {
  const { columns, rows } = tableRecordToRows(result.resultTable)
  const g = toUiGraphSpec(result, 'LINEAR')
  return {
    sql: result.sqlScript ?? '',
    resultText: result.resultText ?? '',
    columns,
    rows,
    graph: g ? { xColumn: g.xColumn, yColumnName: g.yColumnName, type: g.type } : undefined
  }
}

/* Imperative polling per request (lightweight, one interval per request) */
function pollResult(workspaceId: number, requestId: number, onTick: (r: DataRequestResultDto) => void) {
  let stopped = false
  const interval = setInterval(async () => {
    if (stopped) return
    try {
      // prime cache for any detail views
      const res = await queryClient.fetchQuery({
        queryKey: ['data-requests', 'detail', workspaceId, requestId],
        queryFn: () => dataRequestsService.getOne(workspaceId, requestId)
      })

      onTick(res)
      if (isTerminalStatus(res.status)) {
        clearInterval(interval)
        stopped = true
      }
    } catch {
      // on network/API error, stop and mark as error for this request
      clearInterval(interval)
      stopped = true
    }
  }, 1200)
  return () => { stopped = true; clearInterval(interval) }
}

/* Public API for the composer */
async function submitPrompt(prompt: string) {
  if (!activeWorkspaceId.value) return

  // optimistic UI: add pending bundle
  const bundle: RequestBundle = {
    request: { prompt, status: 'pending', createdAt: Date.now() },
  }
  bundles.value.unshift(bundle)

  try {
    // 1) create request (202)
    const created = await createDataRequest({
      workspaceId: activeWorkspaceId.value,
      dto: { prompt },
    })
    bundle.request.id = created.requestId

    // 2) immediately reflect first payload
    Object.assign(bundle, {
      request: { ...bundle.request, status: mapStatus(created.status) },
      response: resultToResponse(created),
    })

    // 3) poll until terminal
    pollResult(activeWorkspaceId.value, created.requestId, (res) => {
      bundle.request.status = mapStatus(res.status)
      bundle.response = resultToResponse(res)
    })
  } catch {
    bundle.request.status = 'error'
    bundle.request.errorMessage = 'Failed to start request'
  }
}

function retry(bundle: RequestBundle) {
  if (bundle.request?.prompt) submitPrompt(bundle.request.prompt)
}
function clearHistory() {
  bundles.value = []
}

/* ========= Auth / user bits ========= */
const { logout } = useAuth()
const { data: me } = useMe()
const userInitials = computed(() => {
  const name = me.value?.fullName?.trim() ?? ''
  if (!name) return ''
  const parts = name.split(/\s+/).filter(Boolean)
  const firstChar = (s: string) => Array.from(s)[0] ?? ''
  if (parts.length === 1) {
    const arr = Array.from(parts[0])
    return (arr[0] ?? '').concat(arr[1] ?? '').toLocaleUpperCase('ru-RU')
  }
  return (firstChar(parts[0]) + firstChar(parts.at(-1)!)).toLocaleUpperCase('ru-RU')
})

/* ========= Background ========= */
const bgStore = useBackgroundImage();
const { url: selectedBgUrl } = storeToRefs(bgStore)
const bgStyle = computed(() => ({ backgroundImage: `url(${selectedBgUrl.value})` }))

/* ========= Modals ========= */
const showWorkspaceModal = ref(false);
const showDatabaseModal = ref(false);

async function handleCreateWorkspace(data: CreateWorkspaceDto) {
  try {
    await createWorkspace(data)
    showWorkspaceModal.value = false
  } catch (e) {
    // toast error if you have a toast system
    console.error(e)
  }
}
async function handleUpdateConnection(payload: UpsertDataSourceDto) {
  await updateConnection(payload)
  showDatabaseModal.value = false
}

const onLogoutClick = async () => { await logout() }
</script>

<template>
	<div
		class="relative min-h-screen w-full bg-cover bg-center bg-fixed"
		:style="bgStyle"
	>
		<div
			class="absolute inset-0 bg-gradient-to-br from-slate-950/50 via-slate-900/40 to-blue-950/30"
		/>

		<main
			class="relative z-10 mx-auto flex max-w-5xl flex-col items-center px-4 sm:px-6 py-6 sm:py-8"
		>
			<!-- Header -->
			<div class="mb-4 sm:mb-10 w-full">
				<div class="hidden sm:flex gap-2 items-center justify-center sm:flex-row flex-col">
					<div class="flex items-center gap-2">
						<!-- Workspace switcher -->
						<DropdownMenu>
							<DropdownMenuTrigger>
								<button
									class="cursor-pointer inline-flex items-center gap-4 rounded-2xl border border-white/10 bg-white/10 px-3 py-3 backdrop-blur-lg"
									title="Workspace"
								>
									<div class="flex items-center gap-2">
										<span class="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
										<span class="text-sm font-semibold text-white hidden sm:inline">Workspace</span>
									</div>
									<span
										class="text-sm font-mono font-bold text-blue-100 truncate"
										>{{ workspaceName }}</span
									>
									<ChevronDown class="text-slate-500 size-4" />
								</button>
							</DropdownMenuTrigger>

							<DropdownMenuContent class="bg-slate-600/5 border border-white/15 backdrop-blur-md">
								<DropdownMenuGroup>
									<DropdownMenuLabel class="text-slate-400">Рабочие места</DropdownMenuLabel>

									<DropdownMenuItem
										v-for="workspace in workspaces"
										:key="workspace.id"
										class="cursor-pointer text-slate-200 transition-all duration-300"
										:class="{ 'bg-slate-500/20': activeWorkspace?.id === workspace.id }"
										@click="switchWorkspace(workspace.id)"
									>
										<div class="flex items-center justify-between w-full">
											<span>{{ workspace.name }}</span>
											<span
												v-if="activeWorkspace?.id === workspace.id"
												class="text-blue-400 text-xs"
												>●</span
											>
										</div>
									</DropdownMenuItem>
								</DropdownMenuGroup>

								<DropdownMenuSeparator class="bg-slate-300" />

								<DropdownMenuItem
									class="cursor-pointer text-slate-200 transition-all duration-300"
									@click="showWorkspaceModal = true"
								>
									<Plus class="size-5 text-slate-200" /> Добавить
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>

						<!-- Database -->
						<DropdownMenu>
							<DropdownMenuTrigger>
								<button
									class="cursor-pointer inline-flex items-center gap-4 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-md"
									title="Database Connection"
								>
									<div class="flex items-center gap-2">
										<span
											class="h-2 w-2 rounded-full animate-pulse"
											:class="connectedReadonly ? 'bg-emerald-400' : 'bg-rose-400'"
										/>
										<span class="text-sm font-semibold text-white hidden sm:inline">Database</span>
									</div>
									<span
										class="text-sm font-semibold"
										:class="connectedReadonly ? 'text-emerald-300' : 'text-rose-300'"
									>
										{{ connectedReadonly ? 'Connected' : 'Disconnected' }}
									</span>
									<ChevronDown class="text-slate-500 size-4" />
								</button>
							</DropdownMenuTrigger>

							<DropdownMenuContent class="bg-slate-600/5 border border-white/15 backdrop-blur-md">
								<DropdownMenuItem
									v-if="!connectedReadonly"
									class="cursor-pointer text-slate-200 transition-all duration-300"
									@click="showDatabaseModal = true"
								>
									<Plus class="size-5 text-slate-200" /> Добавить
								</DropdownMenuItem>

								<DropdownMenuItem
									v-else
									class="cursor-pointer text-slate-200 transition-all duration-300"
									@click="showDatabaseModal = true"
								>
									<Pencil class="size-5 text-slate-200" /> Изменить
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>

					<div class="flex items-center gap-2">
						<DropdownMenu>
							<DropdownMenuTrigger>
								<Avatar class="size-11 rounded-md">
									<AvatarFallback
										class="bg-white/10 rounded-md border border-white/15 backdrop-blur-md text-white text-sm"
									>
										{{ userInitials }}
									</AvatarFallback>
								</Avatar>
							</DropdownMenuTrigger>

							<DropdownMenuContent class="bg-slate-500/5 border border-white/15 backdrop-blur-md">
								<DropdownMenuItem
									@click="onLogoutClick"
									class="text-destructive cursor-pointer transition-all duration-300"
								>
									<LogOut class="text-destructive size-5" /> Выйти
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>

						<!-- Keep your mobile picker elsewhere if needed -->
						<BackgroundImagePicker class="block sm:hidden" />
					</div>
				</div>

				<!-- Mobile actions sheet (unchanged) TODO: uncomment below -->

				<!-- <HomeNavSheet
					class="sm:hidden"
					:workspaces="workspaces"
					:activeWorkspaceId="activeWorkspace?.id"
					:connectedReadonly="connectedReadonly"
					:workspaceName="workspaceName"
					@switchWorkspace="switchWorkspace"
					@openWorkspaceModal="showWorkspaceModal = true"
					@openDatabaseModal="showDatabaseModal = true"
					@logout="() => null"
				/> -->
			</div>

			<!-- Main card -->
			<Card
				class="relative w-full overflow-hidden p-0 rounded-3xl border border-white/20 bg-slate-300/10 backdrop-blur-lg"
			>
				<RequestComposer @submit="submitPrompt" />

				<div class="relative z-10 flex flex-col p-4">
					<RequestHistory
						:items="bundles"
						:onRetry="retry"
					/>

					<div
						v-if="!bundles.length"
						class="mt-12 flex flex-col items-center justify-center text-center space-y-6"
					>
						<div class="space-y-4">
							<h3 class="text-2xl font-bold text-white">Ready to explore your data?</h3>
							<p class="text-base text-slate-400 font-light max-w-xl">
								Start by asking a business question in plain English. Our AI converts it to SQL and
								presents clear insights.
							</p>
						</div>
					</div>

					<div class="mt-12 rounded-3xl bg-gradient-to-r from-white/5 to-transparent p-6">
						<div class="flex items-center justify-between gap-4">
							<p class="text-sm font-medium text-slate-2 00">Results limited to 100 rows</p>

							<Button
								variant="ghost"
								size="sm"
								class="text-slate-200 hover:text-white hover:bg-white/10 font-semibold transition-all duration-300"
								@click="clearHistory"
							>
								Clear History
							</Button>
						</div>
					</div>
				</div>
			</Card>
		</main>

		<!-- Modals -->
		<WorkspaceModal
			v-model:open="showWorkspaceModal"
			@submit="handleCreateWorkspace"
		/>
		<DatabaseModal
			v-model:open="showDatabaseModal"
			@submit="handleUpdateConnection"
		/>
	</div>
</template>
