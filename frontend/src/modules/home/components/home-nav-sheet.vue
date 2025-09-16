<script setup lang="ts">
import { Building2, Check, Database, Images, LogOut, Menu, Monitor, Pencil, Plus } from 'lucide-vue-next';
import { storeToRefs } from 'pinia';



import { Badge } from '@/core/components/ui/badge';
import { Button } from '@/core/components/ui/button';
import { ScrollArea } from '@/core/components/ui/scroll-area';
import { Separator } from '@/core/components/ui/separator';
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from '@/core/components/ui/sheet';



import { BACKGROUND_IMAGES, useBackgroundImage } from "@/modules/home/composables/home-bg.composable";





type Workspace = { id: string; name: string }

const props = defineProps<{
  workspaces: Workspace[]
  activeWorkspaceId?: string | null
  connectedReadonly: boolean
  workspaceName?: string
}>()

const emit = defineEmits<{
  (e: 'switchWorkspace', id: string): void
  (e: 'openWorkspaceModal'): void
  (e: 'openDatabaseModal'): void
  (e: 'logout'): void
}>()

// Backgrounds from Pinia store
const bg = useBackgroundImage()
const {  selectedId, selected } = storeToRefs(bg)
const { setBackground } = bg

function pickBg(id: string) {
  setBackground(id)
}

function onSwitch(id: string) {
  emit('switchWorkspace', id)
}
</script>

<template>
	<Sheet>
		<!-- Trigger only on mobile -->
		<SheetTrigger as-child>
			<Button
				class="sm:hidden h-11 rounded-xl border border-white/15 bg-white/10 text-white backdrop-blur hover:bg-white/20"
				variant="secondary"
			>
				<Menu class="mr-2 h-5 w-5" />
				Действия
			</Button>
		</SheetTrigger>

		<!-- Bottom sheet on mobile -->
		<SheetContent class=" bg-white/10 backdrop-blur-2xl border-none">
			<SheetHeader class="text-left">
				<SheetTitle class="text-white flex items-center gap-2">
					<Monitor class="h-5 w-5" />
					Панель действий
				</SheetTitle>
				<SheetDescription class="text-slate-300/90">
					Быстрые настройки рабочего места, базы данных и фона.
				</SheetDescription>
			</SheetHeader>

			<ScrollArea class="px-4 h-full">
				<!-- Workspace -->
				<section class="space-y-3">
					<div class="flex items-center justify-between">
						<h3
							class="text-sm font-semibold uppercase tracking-wide text-slate-200 flex items-center gap-2"
						>
							<Building2 class="h-4 w-4" />
							Рабочее место
						</h3>
					</div>

					<div class="grid grid-cols-1 gap-2">
						<button
							v-for="w in props.workspaces"
							:key="w.id"
							type="button"
							@click="onSwitch(w.id)"
							:aria-pressed="props.activeWorkspaceId === w.id"
							class="group flex items-center justify-between rounded-xl border border-white/15 bg-white/5 px-3 py-3 text-left hover:bg-white/10 transition"
						>
							<span class="truncate text-slate-300 text-sm">{{ w.name }}</span>
							<Check
								v-if="props.activeWorkspaceId === w.id"
								class="h-4 w-4 text-emerald-300"
							/>
						</button>
					</div>

					<div class="flex justify-end">
						<Button
							size="sm"
							variant="outline"
							class="border-white/25 bg-white/5 text-white hover:bg-white/10"
							@click="emit('openWorkspaceModal')"
						>
							<Plus class="mr-2 h-4 w-4" /> Добавить
						</Button>
					</div>
				</section>

				<Separator class="my-4 bg-white/10" />

				<!-- Database -->
				<section class="space-y-3">
					<h3
						class="text-sm font-semibold uppercase tracking-wide text-slate-200 flex items-center gap-2"
					>
						<Database class="h-4 w-4" />
						База данных
					</h3>

					<div
						class="flex items-center justify-between rounded-xl border border-white/15 bg-white/5 px-3 py-3"
					>
						<span class="text-sm text-slate-300">Статус подключения</span>
						<Badge
							:class="props.connectedReadonly ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30' : 'bg-rose-500/20 text-rose-200 border-rose-400/30'"
							class="border"
						>
							{{ props.connectedReadonly ? 'Connected (RO)' : 'Disconnected' }}
						</Badge>
					</div>

					<div class="flex justify-end">
						<Button
							size="sm"
							variant="outline"
							class="border-white/25 bg-white/5 text-white hover:bg-white/10"
							@click="emit('openDatabaseModal')"
						>
							<component
								:is="props.connectedReadonly ? Pencil : Plus"
								class="mr-2 h-4 w-4"
							/>
							{{ props.connectedReadonly ? 'Изменить' : 'Добавить' }}
						</Button>
					</div>
				</section>

				<Separator class="my-4 bg-white/10" />

				<!-- Backgrounds -->
				<section class="space-y-3">
					<h3
						class="text-sm font-semibold uppercase tracking-wide text-slate-200 flex items-center gap-2"
					>
						<Images class="h-4 w-4" />
						Фон рабочего места
					</h3>

					<div class="grid grid-cols-2 gap-3">
						<button
							v-for="bgItem in BACKGROUND_IMAGES"
							:key="bgItem.id"
							type="button"
							@click="pickBg(bgItem.id)"
							:aria-pressed="selectedId === bgItem.id"
							class="relative"
						>
							<div
								class="h-20 w-full rounded-lg ring-1 ring-white/20"
								:style="{ backgroundImage: `url(${bgItem.src})`, backgroundSize: 'cover', backgroundPosition: 'center' }"
								aria-hidden="true"
							/>

							<p class="text-xs leading-tight text-slate-300 mt-2">{{ bgItem.title }}</p>

							<div
								v-if="selected.id === bgItem.id"
								variant="secondary"
								class="absolute top-2 right-2 text-white rounded-xl border p-1 bg-emerald-500 border-emerald-500"
							>
								<Check class="size-3" />
							</div>
						</button>
					</div>
				</section>

				<Separator class="my-4 bg-white/10" />

				<!-- Profile -->
				<section class="space-y-3">
					<Button
						variant="destructive"
						class="w-full bg-rose-600/80 hover:bg-rose-600 text-white"
						@click="emit('logout')"
					>
						<LogOut class="mr-2 h-4 w-4" /> Выйти
					</Button>
				</section>
			</ScrollArea>

			<SheetFooter class="mt-3">
				<SheetClose as-child>
					<Button
						variant="secondary"
						class="w-full border-white/20 bg-white/10 hover:bg-white/20"
					>
						Закрыть
					</Button>
				</SheetClose>
			</SheetFooter>
		</SheetContent>
	</Sheet>
</template>
