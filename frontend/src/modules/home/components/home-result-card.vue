<script setup lang="ts">
import { computed } from 'vue';



import { Button } from '@/core/components/ui/button';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/core/components/ui/table';



import type { RequestBundle } from '../models/bi.models';
import GraphView from './home-graph-view.vue';





const props = defineProps<{
  bundle: RequestBundle;
  onRetry?: (b: RequestBundle) => void;
}>();

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
	<div>
		<div class="space-y-4 pb-4">
			<p class="text-2xl font-medium tracking-tight text-white leading-relaxed">
				{{ bundle.request.prompt }}
			</p>
		</div>

		<div class="space-y-12">
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
					class="rounded-2xl border border-white/20 bg-gradient-to-br from-white/10 to-white/5 px-4 py-4 backdrop-blur-sm"
				>
					<p class="text-slate-200 text-base font-light leading-relaxed">
						{{ bundle.response.resultText }}
					</p>
				</div>

				<!-- Graph -->
				<div v-if="bundle.response.graph">
					<GraphView
						:rows="bundle.response.rows"
						:spec="bundle.response.graph"
					/>
				</div>

				<!-- 🔵 shadcn Table -->
				<div class="space-y-4">
					<div
						class="overflow-hidden rounded-2xl border border-white/20 bg-slate-500/5 to-transparent backdrop-blur-lg"
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
									class="even:bg-white/5 hover:bg-white/10 transition-colors duration-300 border-b border-white/10 last:border-b-0"
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

				<div
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
			</template>
		</div>
	</div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: all .5s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(-10px); }
</style>
