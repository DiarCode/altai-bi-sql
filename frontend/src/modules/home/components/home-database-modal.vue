<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { toast } from 'vue-sonner';



import { Button } from '@/core/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/core/components/ui/dialog';
import { Input } from '@/core/components/ui/input';
import { Label } from '@/core/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/core/components/ui/select';



import { useStartIngestion, useUpsertDataSource, useWorkspaceIngestionStatus } from '../composables/workspaces.composables';
import { type DataSourceDto, DataSourceType, IngestionStatus, type UpsertDataSourceDto } from '../models/workspaces.models';





/* --------------------------------
   Props / Emits
-----------------------------------*/
interface Props {
  open: boolean
  workspaceId: number
  mode?: 'add' | 'edit'
  initialData?: Partial<DataSourceDto>
}
interface Emits {
  (e: 'update:open', value: boolean): void
  (e: 'submit', data: UpsertDataSourceDto): void
}
const props = defineProps<Props>()
const emit = defineEmits<Emits>()

/* --------------------------------
   UI Labels / Defaults
-----------------------------------*/
const DB_LABELS: Record<DataSourceType, string> = {
  [DataSourceType.POSTGRESQL]: 'PostgreSQL',
  [DataSourceType.MYSQL]: 'MySQL',
}
const DEFAULT_PORT: Record<DataSourceType, string> = {
  [DataSourceType.POSTGRESQL]: '5432',
  [DataSourceType.MYSQL]: '3306',
}

/* --------------------------------
   Local form (view-model)
-----------------------------------*/
type LocalForm = {
  type: DataSourceType
  host: string
  port: string
  database: string
  user: string
  password: string
  ssl?: boolean // Only for Postgres
}
const form = ref<LocalForm>({
  type: DataSourceType.POSTGRESQL,
  host: 'localhost',
  port: DEFAULT_PORT[DataSourceType.POSTGRESQL],
  database: '',
  user: '',
  password: '',
  ssl: false,
})

/* --------------------------------
   Errors & validation
-----------------------------------*/
type ErrKey = 'host' | 'port' | 'database' | 'user' | 'password' | 'type'
const errors = reactive<Partial<Record<ErrKey, string>>>({})

function isValidDbType(v: unknown): v is DataSourceType {
  return Object.values(DataSourceType).includes(v as DataSourceType)
}

/** Pure validity check (does not mutate `errors`) */
const isFormFilled = computed(() => {
  const okType = isValidDbType(form.value.type)
  const okHost = !!form.value.host.trim()
  const okPort = /^\d{1,5}$/.test(form.value.port) && Number(form.value.port) > 0
  const okDb = !!form.value.database.trim()
  const okUser = !!form.value.user.trim()
  const okPass = !!form.value.password.trim()
  return okType && okHost && okPort && okDb && okUser && okPass
})

/** Show errors (called on submit) */
function validateAndExposeErrors(): boolean {
  errors.type = isValidDbType(form.value.type) ? '' : 'Select a valid database type'
  errors.host = form.value.host.trim() ? '' : 'Host is required'
  errors.port =
    /^\d{1,5}$/.test(form.value.port) && Number(form.value.port) > 0
      ? ''
      : 'Port must be a positive number'
  errors.database = form.value.database.trim() ? '' : 'Database name is required'
  errors.user = form.value.user.trim() ? '' : 'Username is required'
  errors.password = form.value.password.trim() ? '' : 'Password is required'
  return !Object.values(errors).some(Boolean)
}

function clearErrors() {
  ;(Object.keys(errors) as ErrKey[]).forEach(k => (errors[k] = ''))
}

/* --------------------------------
   Prefill on open/edit
-----------------------------------*/
function resetForm() {
  form.value = {
    type: DataSourceType.POSTGRESQL,
    host: 'localhost',
    port: DEFAULT_PORT[DataSourceType.POSTGRESQL],
    database: '',
    user: '',
    password: '',
    ssl: false,
  }
  clearErrors()
}

watch(
  () => props.open,
  (open) => {
    if (open) {
      if (props.mode === 'edit' && props.initialData?.type && isValidDbType(props.initialData.type)) {
        const cfg = props.initialData.config
        const type = props.initialData.type
        form.value = {
          type,
          host: cfg?.host ?? 'localhost',
          port: String(cfg?.port ?? DEFAULT_PORT[type]),
          database: cfg?.database ?? '',
          user: cfg?.user ?? '',
          password: cfg?.password ?? '',
          ssl: cfg && 'ssl' in cfg ? Boolean(cfg.ssl) : false,
        }
      } else {
        resetForm()
      }
      clearErrors()
    } else {
      resetForm()
    }
  },
  { immediate: true },
)

/* --------------------------------
   Build DTO from form
-----------------------------------*/
function buildDto(): UpsertDataSourceDto {
  const portNum = Number(form.value.port)
  if (form.value.type === DataSourceType.POSTGRESQL) {
    return {
      type: DataSourceType.POSTGRESQL,
      config: {
        host: form.value.host.trim(),
        port: portNum,
        database: form.value.database.trim(),
        user: form.value.user.trim(),
        password: form.value.password,
        ssl: Boolean(form.value.ssl),
      },
    }
  }
  return {
    type: DataSourceType.MYSQL,
    config: {
      host: form.value.host.trim(),
      port: portNum,
      database: form.value.database.trim(),
      user: form.value.user.trim(),
      password: form.value.password,
    },
  }
}

/* --------------------------------
   Composables: save + ingestion
-----------------------------------*/
const { mutate: upsertDataSource, isPending: isSaving } = useUpsertDataSource()
const { mutate: startIngestion, isPending: isStarting } = useStartIngestion()
const workspaceIdRef = computed(() => props.workspaceId)

const {
  data: ingestion,
  isFetching: isPolling,
} = useWorkspaceIngestionStatus(workspaceIdRef, {
  baseMs: 2000,
  slowAfterMs: 60000,
  slowMs: 5000,
})

/** Active while connecting/running ingestion */
const isActiveStatus = computed(
  () =>
    ingestion.value?.status === IngestionStatus.PENDING ||
    ingestion.value?.status === IngestionStatus.RUNNING,
)

const anyBusy = computed(() => isSaving.value || isStarting.value || isPolling.value)
const hardDisabled = computed(() => anyBusy.value || isActiveStatus.value)

/* --------------------------------
   Block closing while connecting
-----------------------------------*/
function handleOpenChange(next: boolean) {
  if (next === false && (isActiveStatus.value || anyBusy.value)) {
    toast.message('Please wait', { description: 'Connection in progress…' })
    return
  }
  emit('update:open', next)
  if (!next) resetForm()
}

/* --------------------------------
   Handlers
-----------------------------------*/
function handleDbTypeChange(v: string) {
  if (!isValidDbType(v)) {
    errors.type = 'Select a valid database type'
    return
  }
  errors.type = ''
  form.value.type = v
  // Update default port if empty or currently default
  const isEmptyOrDefault =
    form.value.port === '' ||
    form.value.port === DEFAULT_PORT[DataSourceType.POSTGRESQL] ||
    form.value.port === DEFAULT_PORT[DataSourceType.MYSQL]
  if (isEmptyOrDefault) {
    form.value.port = DEFAULT_PORT[v]
  }
}

/** Save only (no ingestion) — stays open */
function onSaveOnly() {
  if (!validateAndExposeErrors()) {
    toast.error('Please fix form errors')
    return
  }
  const dto = buildDto()
  upsertDataSource(
    { id: props.workspaceId, dto },
    {
      onSuccess: () => {
        toast.success('Connection saved')
        emit('submit', dto) // notify parent (e.g., refresh detail)
      },
      onError: (err) => toast.error(err?.message || 'Failed to save connection'),
    },
  )
}

/** Save & Start ingestion (connect) — stays open and shows live status */
function onSaveAndIngest() {
  if (!validateAndExposeErrors()) {
    toast.error('Please fix form errors')
    return
  }
  const dto = buildDto()
  upsertDataSource(
    { id: props.workspaceId, dto },
    {
      onSuccess: () => {
        toast.success('Connection saved. Starting ingestion…')
        emit('submit', dto) // parent can reflect DS immediately
        startIngestion(props.workspaceId, {
          onSuccess: () => {
            toast.message('Ingestion started', { description: 'Tracking status…' })
            // Live status is handled by useWorkspaceIngestionStatus
          },
          onError: (err) => toast.error(err?.message || 'Failed to start ingestion'),
        })
      },
      onError: (err) => toast.error(err?.message || 'Failed to save connection'),
    },
  )
}

/* --------------------------------
   Status chip + notifications
-----------------------------------*/
const STATUS_LABELS: Record<IngestionStatus, string> = {
  [IngestionStatus.PENDING]: 'Pending',
  [IngestionStatus.RUNNING]: 'Running',
  [IngestionStatus.SUCCEEDED]: 'Succeeded',
  [IngestionStatus.FAILED]: 'Failed',
}
const status = computed(() => ingestion.value?.status)

const statusClass = computed(() => {
  switch (status.value) {
    case IngestionStatus.SUCCEEDED:
      return 'text-emerald-300'
    case IngestionStatus.FAILED:
      return 'text-rose-300'
    case IngestionStatus.RUNNING:
      return 'text-amber-300'
    case IngestionStatus.PENDING:
      return 'text-slate-300'
    default:
      return 'text-slate-300'
  }
})

/** Toast when reaches a terminal state */
watch(
  () => status.value,
  (s, prev) => {
    if (s && s !== prev) {
      if (s === IngestionStatus.SUCCEEDED) {
        toast.success('Connection established', { description: 'Ingestion completed successfully.' })
      } else if (s === IngestionStatus.FAILED) {
        toast.error('Ingestion failed', { description: ingestion.value?.error || 'Please review your settings.' })
      }
    }
  },
)
</script>

<template>
	<Dialog
		:open="open"
		@update:open="handleOpenChange"
	>
		<DialogContent class="max-w-lg">
			<DialogHeader>
				<DialogTitle>
					{{ mode === 'edit' ? 'Edit Database Connection' : 'Configure Database Connection' }}
				</DialogTitle>
				<DialogDescription>
					Set up your database to enable schema ingestion and querying.
				</DialogDescription>
			</DialogHeader>

			<div class="space-y-4 py-4">
				<!-- Database Type -->
				<div class="space-y-2">
					<Label
						for="db-type"
						class="font-medium text-white"
						>Database Type *</Label
					>
					<Select
						:value="form.type"
						@update:value="handleDbTypeChange"
					>
						<SelectTrigger
							id="db-type"
							class="bg-white/10 border-white/30 w-full text-white data-[placeholder]:text-slate-300/70"
							:aria-invalid="!!errors.type"
							:aria-errormessage="'err-type'"
							:disabled="hardDisabled"
						>
							<SelectValue placeholder="Select database type" />
						</SelectTrigger>
						<SelectContent class="bg-slate-800/90 backdrop-blur-xl border-white/30">
							<SelectItem
								:value="DataSourceType.POSTGRESQL"
								class="hover:bg-white/10 text-white"
							>
								{{ DB_LABELS[DataSourceType.POSTGRESQL] }}
							</SelectItem>
							<SelectItem
								:value="DataSourceType.MYSQL"
								class="hover:bg-white/10 text-white"
							>
								{{ DB_LABELS[DataSourceType.MYSQL] }}
							</SelectItem>
						</SelectContent>
					</Select>
					<p
						v-if="errors.type"
						id="err-type"
						class="text-rose-300 text-xs"
					>
						{{ errors.type }}
					</p>
				</div>

				<!-- Host / Port -->
				<div class="gap-4 grid grid-cols-2">
					<div class="space-y-2">
						<Label
							for="host"
							class="font-medium text-white"
							>Host *</Label
						>
						<Input
							id="host"
							v-model="form.host"
							placeholder="localhost"
							class="bg-white/10 border-white/30 text-white placeholder:text-slate-300/70"
							:disabled="hardDisabled"
							:aria-invalid="!!errors.host"
							:aria-errormessage="'err-host'"
						/>
						<p
							v-if="errors.host"
							id="err-host"
							class="text-rose-300 text-xs"
						>
							{{ errors.host }}
						</p>
					</div>
					<div class="space-y-2">
						<Label
							for="port"
							class="font-medium text-white"
							>Port *</Label
						>
						<Input
							id="port"
							v-model="form.port"
							inputmode="numeric"
							placeholder="5432"
							class="bg-white/10 border-white/30 text-white placeholder:text-slate-300/70"
							:disabled="hardDisabled"
							:aria-invalid="!!errors.port"
							:aria-errormessage="'err-port'"
						/>
						<p
							v-if="errors.port"
							id="err-port"
							class="text-rose-300 text-xs"
						>
							{{ errors.port }}
						</p>
					</div>
				</div>

				<!-- Database -->
				<div class="space-y-2">
					<Label
						for="database"
						class="font-medium text-white"
						>Database Name *</Label
					>
					<Input
						id="database"
						v-model="form.database"
						placeholder="Enter database name"
						class="bg-white/10 border-white/30 text-white placeholder:text-slate-300/70"
						:disabled="hardDisabled"
						:aria-invalid="!!errors.database"
						:aria-errormessage="'err-db'"
					/>
					<p
						v-if="errors.database"
						id="err-db"
						class="text-rose-300 text-xs"
					>
						{{ errors.database }}
					</p>
				</div>

				<!-- Username -->
				<div class="space-y-2">
					<Label
						for="username"
						class="font-medium text-white"
						>Username *</Label
					>
					<Input
						id="username"
						v-model="form.user"
						placeholder="Enter username"
						class="bg-white/10 border-white/30 text-white placeholder:text-slate-300/70"
						:disabled="hardDisabled"
						:aria-invalid="!!errors.user"
						:aria-errormessage="'err-user'"
					/>
					<p
						v-if="errors.user"
						id="err-user"
						class="text-rose-300 text-xs"
					>
						{{ errors.user }}
					</p>
				</div>

				<!-- Password -->
				<div class="space-y-2">
					<Label
						for="password"
						class="font-medium text-white"
						>Password *</Label
					>
					<Input
						id="password"
						v-model="form.password"
						type="password"
						placeholder="Enter password"
						class="bg-white/10 border-white/30 text-white placeholder:text-slate-300/70"
						:disabled="hardDisabled"
						:aria-invalid="!!errors.password"
						:aria-errormessage="'err-pass'"
					/>
					<p
						v-if="errors.password"
						id="err-pass"
						class="text-rose-300 text-xs"
					>
						{{ errors.password }}
					</p>
				</div>

				<!-- SSL (Postgres only) -->
				<div
					v-if="form.type === DataSourceType.POSTGRESQL"
					class="flex items-center gap-2 pt-1"
				>
					<input
						id="ssl"
						type="checkbox"
						class="w-4 h-4 accent-blue-600"
						v-model="form.ssl"
						:disabled="hardDisabled"
					/>
					<Label
						for="ssl"
						class="text-white"
						>Use SSL</Label
					>
				</div>

				<!-- Ingestion status (live) -->
				<div class="bg-white/5 px-3 py-2 border border-white/20 rounded-md">
					<div class="flex justify-between items-center">
						<span class="text-white/80 text-sm">Ingestion status</span>
						<div class="flex items-center gap-2">
							<span
								v-if="status"
								:class="['text-sm font-medium', statusClass]"
							>
								{{ STATUS_LABELS[status] }}
							</span>
							<span
								v-else
								class="text-slate-300 text-sm"
								>—</span
							>
							<div
								v-if="isPolling || isStarting"
								class="border-2 border-current border-t-transparent rounded-full w-4 h-4 text-white/70 animate-spin"
							/>
						</div>
					</div>
					<p
						v-if="ingestion?.error"
						class="mt-1 text-rose-300 text-xs"
					>
						{{ ingestion.error }}
					</p>
				</div>
			</div>

			<DialogFooter class="gap-2">
				<Button
					variant="outline"
					@click="handleOpenChange(false)"
					:disabled="anyBusy || isActiveStatus"
					class="bg-white/5 hover:bg-white/10 border-white/30 text-white"
				>
					Close
				</Button>

				<!-- Save only -->
				<Button
					variant="secondary"
					@click="onSaveOnly"
					:disabled="!isFormFilled || anyBusy || isActiveStatus"
					class="bg-white/10 hover:bg-white/20 border border-white/20 text-white"
				>
					<div
						v-if="isSaving"
						class="mr-2 border-2 border-current border-t-transparent rounded-full w-4 h-4 animate-spin"
					/>
					{{ isSaving ? 'Saving…' : (mode === 'edit' ? 'Save Changes' : 'Save') }}
				</Button>

				<!-- Save & Start ingestion -->
				<Button
					@click="onSaveAndIngest"
					:disabled="!isFormFilled || anyBusy || isActiveStatus"
					class="bg-blue-600 hover:bg-blue-700 text-white"
				>
					<div
						v-if="isStarting || isActiveStatus || isPolling"
						class="mr-2 border-2 border-current border-t-transparent rounded-full w-4 h-4 animate-spin"
					/>
					<template v-if="isActiveStatus || isPolling">Connecting…</template>
					<template
						v-else
						>{{ mode === 'edit' ? 'Save & Re-ingest' : 'Connect & Ingest' }}</template
					>
				</Button>
			</DialogFooter>
		</DialogContent>
	</Dialog>
</template>
