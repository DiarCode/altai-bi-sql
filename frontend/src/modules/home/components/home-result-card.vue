<script setup lang="ts">
import { Button } from '@/core/components/ui/button';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/core/components/ui/table';



import type { RequestBundle } from '../models/history.models';
import GraphView from './home-graph-view.vue';





defineProps<{
  bundle: RequestBundle
  onRetry?: (b: RequestBundle) => void
}>()

/** Detect numeric columns for right alignment */
// const numericCols = computed<Set<string>>(() => {
//   const cols = props.bundle.response?.columns ?? []
//   const rows = props.bundle.response?.rows ?? []
//   const sample = rows.slice(0, 20)
//   const set = new Set<string>()
//   cols.forEach((c) => {
//     let numericCount = 0
//     sample.forEach((r) => {
//       const v = r?.[c]
//       if (typeof v === 'number') numericCount++
//       else if (typeof v === 'string' && v.trim() !== '' && !isNaN(Number(v))) numericCount++
//     })
//     if (numericCount >= Math.ceil(sample.length * 0.6)) set.add(c)
//   })
//   return set
// })
</script>

<template>
	<div>
		<div class="space-y-4 pb-4">
			<p class="font-medium text-white text-2xl leading-relaxed tracking-tight">
				{{ bundle.request.prompt }}
			</p>
		</div>

		<div class="space-y-10 sm:space-y-12">
			<!-- Loading -->
			<div
				v-if="bundle.request.status === 'pending'"
				class="space-y-6"
			>
				<div class="space-y-3">
					<div class="bg-white/20 rounded-lg w-3/4 h-6 animate-pulse" />
					<div class="bg-white/15 rounded-lg w-1/2 h-4 animate-pulse" />
				</div>
				<div
					class="bg-gradient-to-br from-white/20 to-white/5 rounded-2xl w-full h-64 animate-pulse"
				/>
				<div class="space-y-2">
					<div class="bg-white/10 rounded w-full h-4 animate-pulse" />
					<div class="bg-white/10 rounded w-4/5 h-4 animate-pulse" />
					<div class="bg-white/10 rounded w-3/4 h-4 animate-pulse" />
				</div>
			</div>

			<!-- Error -->
			<template v-else-if="bundle.request.status === 'error'">
				<div class="space-y-4">
					<div
						class="bg-gradient-to-br from-rose-500/15 to-rose-600/10 backdrop-blur-sm p-6 border border-rose-400/40 rounded-2xl"
					>
						<div class="flex items-start gap-3">
							<div
								class="flex flex-shrink-0 justify-center items-center bg-rose-400 mt-0.5 rounded-full w-6 h-6"
							>
								<span class="font-bold text-white text-xs">!</span>
							</div>
							<div class="space-y-2">
								<h4 class="font-semibold text-rose-200 text-lg">Analysis Failed</h4>
								<p class="text-rose-300/90 leading-relaxed">
									{{ bundle.request.errorMessage || 'Something went wrong while processing your request.' }}
								</p>
							</div>
						</div>
					</div>
					<Button
						variant="outline"
						size="lg"
						class="bg-rose-500/10 hover:bg-rose-500/20 border-rose-400/30 font-semibold text-rose-200"
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
					class="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm px-4 py-4 border border-white/20 rounded-2xl"
				>
					<p class="font-light text-slate-200 text-base leading-relaxed">
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

				<!-- Table -->
				<div class="space-y-4">
					<div
						class="bg-slate-500/5 to-transparent backdrop-blur-lg border border-white/20 rounded-2xl overflow-hidden"
					>
						<Table class="min-w-full">
							<TableCaption class="text-slate-400">
								Showing {{ bundle.response.rows.length }} of max 100 rows ·
								{{ bundle.response.columns.length }} columns
							</TableCaption>

							<TableHeader
								class="top-0 z-10 sticky bg-white/10 backdrop-blur-xl border-white/20 border-b"
							>
								<TableRow>
									<TableHead
										v-for="col in bundle.response.columns"
										:key="col"
										class="px-4 py-3 font-bold text-white text-base text-left"
									>
										{{ col }}
									</TableHead>
								</TableRow>
							</TableHeader>

							<TableBody>
								<TableRow
									v-for="(row, i) in bundle.response.rows"
									:key="i"
									class="hover:bg-white/10 even:bg-white/5 border-white/10 border-b last:border-b-0 transition-colors duration-300"
								>
									<TableCell
										v-for="col in bundle.response.columns"
										:key="col"
										class="px-4 py-3 text-slate-200 text-base"
									>
										{{ (row[col] ?? '—') as any }}
									</TableCell>
								</TableRow>
							</TableBody>
						</Table>

						<div
							class="bg-gradient-to-r from-white/10 to-white/5 px-4 py-3 border-white/20 border-t"
						>
							<div class="flex justify-between items-center">
								<p class="font-medium text-slate-300 text-sm">
									Showing {{ bundle.response.rows.length }} of max 100 rows
								</p>
								<p class="text-slate-400 text-xs">{{ bundle.response.columns.length }} columns</p>
							</div>
						</div>
					</div>
				</div>

				<div
					class="bg-black/40 backdrop-blur-sm border border-white/30 rounded-2xl overflow-hidden"
				>
					<div
						class="bg-gradient-to-r from-slate-800/50 to-slate-700/30 px-4 py-3 border-white/20 border-b"
					>
						<p class="font-semibold text-slate-300 text-sm">Generated SQL Query</p>
					</div>
					<pre
						class="p-6 max-h-80 overflow-auto font-mono text-blue-200 text-sm leading-relaxed"
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
