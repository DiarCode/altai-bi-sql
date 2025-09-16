<script setup lang="ts">
import { ChevronDown, LogOut, Pencil, Plus } from "lucide-vue-next";
import { computed } from 'vue';



import BG_URL from '@/core/assets/images/home-bg.jpg';
import { Avatar, AvatarFallback } from "@/core/components/ui/avatar";
import { Button } from '@/core/components/ui/button';
import { Card } from '@/core/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from "@/core/components/ui/dropdown-menu";
import DropdownMenuLabel from "@/core/components/ui/dropdown-menu/DropdownMenuLabel.vue";
import DropdownMenuSeparator from "@/core/components/ui/dropdown-menu/DropdownMenuSeparator.vue";



import RequestComposer from '../components/home-request-composer.vue';
import RequestHistory from '../components/home-request-history.vue';
import { useBiRequests } from '../composables/bi.composables';





const {
  bundles,
  submitPrompt,
  retry,
  clearHistory,
  connectedReadonly,
  activeWorkspace,
} = useBiRequests();

const workspaceName = computed(() => activeWorkspace.value?.name ?? '—');
</script>

<template>
	<div
		class="relative min-h-screen w-full bg-cover bg-center bg-fixed"
		:style="{ backgroundImage: `url(${BG_URL})` }"
	>
		<!-- Enhanced overlay with gradient for better readability -->
		<div
			class="absolute inset-0 bg-gradient-to-br from-slate-950/50 via-slate-900/40 to-blue-950/30"
		/>

		<main class="relative z-10 mx-auto flex max-w-5xl flex-col items-center px-6 py-8">
			<!-- Enhanced Header with better typography -->
			<div class="mb-10 w-full">
				<div class="flex gap-2 items-center justify-center">
					<DropdownMenu>
						<DropdownMenuTrigger>
							<button
								class="cursor-pointer inline-flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 backdrop-blur-md"
								title="Workspace"
							>
								<div class="flex items-center gap-2">
									<span class="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
									<span class="text-sm font-semibold text-white">Workspace</span>
								</div>
								<span class="text-sm font-mono font-bold text-blue-100">{{ workspaceName }}</span>

								<ChevronDown class="text-slate-500 size-4" />
							</button>
						</DropdownMenuTrigger>

						<DropdownMenuContent class="bg-slate-600/5 border border-white/15 backdrop-blur-md">
							<DropdownMenuGroup>
								<DropdownMenuLabel class="text-slate-400">Рабочие места</DropdownMenuLabel>

								<DropdownMenuItem
									class="cursor-pointer hover:bg-slate-500/10! hover:text-slate-200/80! text-slate-200 transition-all duration-300"
								>
									Workpace 1
								</DropdownMenuItem>
								<DropdownMenuItem
									class="cursor-pointer hover:bg-slate-500/10! hover:text-slate-200/80! text-slate-200 transition-all duration-300"
								>
									Workpace 2
								</DropdownMenuItem>
								<DropdownMenuItem
									class="cursor-pointer hover:bg-slate-500/10! hover:text-slate-200/80! text-slate-200 transition-all duration-300"
								>
									Workpace 3
								</DropdownMenuItem>
							</DropdownMenuGroup>

							<DropdownMenuSeparator class="bg-slate-300" />

							<DropdownMenuItem
								class="cursor-pointer hover:bg-slate-500/10! hover:text-slate-200/80! text-slate-200 transition-all duration-300"
							>
								<Plus class="size-5 text-slate-200" /> Добавить
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>

					<DropdownMenu>
						<DropdownMenuTrigger>
							<button
								class="cursor-pointer inline-flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-md"
								title="Database Connection"
							>
								<div class="flex items-center gap-2">
									<span
										class="h-2 w-2 rounded-full animate-pulse"
										:class="connectedReadonly ? 'bg-emerald-400' : 'bg-rose-400'"
									/>
									<span class="text-sm font-semibold text-white">Database</span>
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
								class="cursor-pointer hover:bg-slate-500/10! hover:text-slate-200/80! text-slate-200 transition-all duration-300"
							>
								<Plus class="size-5 text-slate-200" /> Добавить
							</DropdownMenuItem>

							<DropdownMenuItem
								v-if="connectedReadonly"
								class="cursor-pointer hover:bg-slate-500/10! hover:text-slate-200/80! text-slate-200 transition-all duration-300"
							>
								<Pencil class="size-5 text-slate-200" /> Изменить
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>

					<DropdownMenu>
						<DropdownMenuTrigger>
							<Avatar class="size-10">
								<AvatarFallback
									class="bg-slate-500/5 border border-white/15 backdrop-blur-md text-white text-sm"
									>CN</AvatarFallback
								>
							</Avatar>
						</DropdownMenuTrigger>

						<DropdownMenuContent class=" bg-slate-500/5 border border-white/15 backdrop-blur-md">
							<DropdownMenuItem
								class="text-destructive cursor-pointer hover:bg-slate-500/10! hover:text-destructive/80! transition-all duration-300"
							>
								<LogOut class="text-destructive size-5" /> Выйти
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>

			<!-- Enhanced Glass card container -->
			<Card
				class="relative w-full overflow-hidden p-0 rounded-3xl border border-white/20 bg-slate-100/5 backdrop-blur-lg"
			>
				<RequestComposer @submit="submitPrompt" />

				<!-- History Stream with better spacing -->
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
								Start by asking a business question in plain English. Our AI will convert it to SQL
								and present beautiful insights.
							</p>
						</div>
					</div>

					<!-- Enhanced footer -->
					<div class="mt-12 rounded-3xl bg-gradient-to-r from-white/5 to-transparent p-6">
						<div class="flex items-center justify-between">
							<div class="space-y-1">
								<p class="text-sm font-medium text-slate-200">
									Results limited to 100 rows for optimal performance
								</p>
								<p class="text-xs text-slate-400">Enterprise plans support unlimited data export</p>
							</div>
							<Button
								variant="ghost"
								size="lg"
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
	</div>
</template>
