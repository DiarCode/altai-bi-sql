<script setup lang="ts">
import { computed, ref } from 'vue';



import { Button } from '@/core/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/core/components/ui/card';
import { Separator } from '@/core/components/ui/separator';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/core/components/ui/table';



import type { RequestBundle } from '../models/bi.models';
import GraphView from './home-graph-view.vue';





const props = defineProps<{
  bundle: RequestBundle;
  onRetry?: (b: RequestBundle) => void;
}>();

const showSQL = ref(false);

function copySql(sql: string) {
  navigator.clipboard.writeText(sql);
}

/** Detect numeric columns for right alignment (looks cleaner for metrics) */
const numericCols = computed<Set<string>>(() => {
  const cols = props.bundle.response?.columns ?? [];
  const rows = props.bundle.response?.rows ?? [];
  const sample = rows.slice(0, 20);
  const set = new Set<string>();
  cols.forEach((c) => {
    let numericCount = 0;
    sample.forEach((r) => {
      const v = r?.[c];
      if (typeof v === 'number') numericCount++;
      else if (typeof v === 'string' && v.trim() !== '' && !isNaN(Number(v))) numericCount++;
    });
    if (numericCount >= Math.ceil(sample.length * 0.6)) set.add(c);
  });
  return set;
});
</script>

<template>
	<Card
		class="border-white/30 bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-xl shadow-xl overflow-hidden"
	>
		<CardHeader class="space-y-4 pb-6">
			<div class="space-y-3">
				<CardTitle class="text-xl font-bold tracking-tight text-white leading-relaxed">
					{{ bundle.request.prompt }}
				</CardTitle>

				<div class="flex items-center gap-4">
					<span
						:class="[
              'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold',
              bundle.request.status === 'pending' && 'bg-amber-500/20 text-amber-200 border border-amber-400/30',
              bundle.request.status === 'success' && 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/30',
              bundle.request.status === 'error' && 'bg-rose-500/20 text-rose-200 border border-rose-400/30',
            ]"
						aria-live="polite"
					>
						<span
							class="h-2 w-2 rounded-full"
							:class="[
                bundle.request.status === 'pending' && 'bg-amber-400 animate-pulse',
                bundle.request.status === 'success' && 'bg-emerald-400',
                bundle.request.status === 'error' && 'bg-rose-400',
              ]"
						/>
						{{ bundle.request.status.charAt(0).toUpperCase() + bundle.request.status.slice(1) }}
					</span>

					<span class="text-sm text-slate-400 font-medium">
						{{ new Date(bundle.request.createdAt).toLocaleString() }}
					</span>
				</div>
			</div>
		</CardHeader>

		<CardContent class="space-y-6">
			<!-- Loading -->
			<div
				v-if="bundle.request.status === 'pending'"
				class="space-y-6"
			>
				<div class="space-y-3">
					<div class="h-6 w-3/4 animate-pulse rounded-lg bg-white/20" />
					<div class="h-4 w-1/2 animate-pulse rounded-lg bg-white/15" />
				</div>
				<div
					class="h-64 w-full animate-pulse rounded-2xl bg-gradient-to-br from-white/20 to-white/5"
				/>
				<div class="space-y-2">
					<div class="h-4 w-full animate-pulse rounded bg-white/10" />
					<div class="h-4 w-4/5 animate-pulse rounded bg-white/10" />
					<div class="h-4 w-3/4 animate-pulse rounded bg-white/10" />
				</div>
			</div>

			<!-- Error -->
			<template v-else-if="bundle.request.status === 'error'">
				<div class="space-y-4">
					<div
						class="rounded-2xl border border-rose-400/40 bg-gradient-to-br from-rose-500/15 to-rose-600/10 p-6 backdrop-blur-sm"
					>
						<div class="flex items-start gap-3">
							<div
								class="w-6 h-6 rounded-full bg-rose-400 flex items-center justify-center flex-shrink-0 mt-0.5"
							>
								<span class="text-white text-xs font-bold">!</span>
							</div>
							<div class="space-y-2">
								<h4 class="text-lg font-semibold text-rose-200">Analysis Failed</h4>
								<p class="text-rose-300/90 leading-relaxed">
									{{ bundle.request.errorMessage || 'Something went wrong while processing your request.' }}
								</p>
							</div>
						</div>
					</div>
					<Button
						variant="outline"
						size="lg"
						class="border-rose-400/30 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20 font-semibold"
						@click="onRetry?.(bundle)"
					>
						Try Again
					</Button>
				</div>
			</template>

			<!-- Success -->
			<template v-else-if="bundle.response">
				<!-- Summary -->
				<div
					class="rounded-2xl border border-white/20 bg-gradient-to-br from-white/10 to-white/5 p-6 backdrop-blur-sm"
				>
					<h4 class="text-lg font-semibold text-blue-200 mb-3">Analysis Summary</h4>
					<p class="text-slate-200 text-base leading-relaxed">
						{{ bundle.response.resultText }}
					</p>
				</div>

				<!-- SQL controls -->
				<div class="flex items-center gap-3">
					<Button
						size="lg"
						variant="secondary"
						class="bg-white/10 border-white/30 text-white hover:bg-white/20 font-semibold"
						@click="showSQL = !showSQL"
					>
						{{ showSQL ? '🔼 Hide SQL Query' : '🔽 View SQL Query' }}
					</Button>
					<Button
						v-if="showSQL"
						size="lg"
						variant="outline"
						class="border-blue-400/40 bg-blue-500/10 text-blue-200 hover:bg-blue-500/20 font-semibold"
						@click="copySql(bundle.response.sql)"
						title="Copy SQL to clipboard"
					>
						📋 Copy SQL
					</Button>
				</div>

				<!-- SQL -->
				<transition
					name="fade"
					mode="out-in"
				>
					<div
						v-if="showSQL"
						class="rounded-2xl border border-white/30 bg-black/40 backdrop-blur-sm overflow-hidden"
					>
						<div
							class="bg-gradient-to-r from-slate-800/50 to-slate-700/30 px-4 py-3 border-b border-white/20"
						>
							<p class="text-sm font-semibold text-slate-300">Generated SQL Query</p>
						</div>
						<pre
							class="max-h-80 overflow-auto p-6 text-sm text-blue-200 font-mono leading-relaxed"
						><code>{{ bundle.response.sql }}</code></pre>
					</div>
				</transition>

				<Separator class="bg-white/20" />

				<!-- Graph -->
				<div
					v-if="bundle.response.graph"
					class="space-y-4"
				>
					<h4 class="text-xl font-bold text-white">Data Visualization</h4>
					<GraphView
						:rows="bundle.response.rows"
						:spec="bundle.response.graph"
					/>
				</div>

				<!-- 🔵 shadcn Table -->
				<div class="space-y-4">
					<h4 class="text-xl font-bold text-white">Detailed Results</h4>

					<div
						class="overflow-hidden rounded-2xl border border-white/30 bg-gradient-to-br from-white/5 to-transparent backdrop-blur-sm"
					>
						<Table class="min-w-full">
							<TableCaption class="text-slate-400">
								Showing {{ bundle.response.rows.length }} of max 100 rows ·
								{{ bundle.response.columns.length }} columns
							</TableCaption>

							<TableHeader
								class="sticky top-0 z-10 bg-white/10 backdrop-blur-xl border-b border-white/20"
							>
								<TableRow>
									<TableHead
										v-for="col in bundle.response.columns"
										:key="col"
										class="px-4 py-3 text-left font-bold text-white text-base uppercase tracking-wide"
										:class="numericCols.has(col) ? 'text-right' : 'text-left'"
									>
										{{ col }}
									</TableHead>
								</TableRow>
							</TableHeader>

							<TableBody>
								<TableRow
									v-for="(row, i) in bundle.response.rows"
									:key="i"
									class="even:bg-white/5 hover:bg-white/10 transition-colors border-b border-white/10 last:border-b-0"
								>
									<TableCell
										v-for="col in bundle.response.columns"
										:key="col"
										class="px-4 py-3 text-slate-200 text-base"
										:class="numericCols.has(col) ? 'text-right font-mono tabular-nums' : ''"
									>
										{{ (row[col] ?? '—') as any }}
									</TableCell>
								</TableRow>
							</TableBody>
						</Table>

						<div
							class="border-t border-white/20 bg-gradient-to-r from-white/10 to-white/5 px-4 py-3"
						>
							<div class="flex items-center justify-between">
								<p class="text-sm font-medium text-slate-300">
									Showing {{ bundle.response.rows.length }} of max 100 rows
								</p>
								<p class="text-xs text-slate-400">{{ bundle.response.columns.length }} columns</p>
							</div>
						</div>
					</div>
				</div>
			</template>
		</CardContent>
	</Card>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: all .3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(-10px); }
</style>
