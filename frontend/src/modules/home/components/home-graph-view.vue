<script setup lang="ts">
import { computed } from 'vue';



import type { GraphSpec } from '../models/bi.models';





const props = defineProps<{
  rows: Record<string, unknown>[];
  spec: GraphSpec;
}>();

const width = 900;
const height = 320;
const pad = 60;

const points = computed(() => {
  const xKey = props.spec.xColumn;
  const yKey = props.spec.yColumnName;
  const xs = props.rows.map(r => String(r[xKey]));
  const ys = props.rows.map(r => Number(r[yKey] ?? 0));

  const uniqX = xs;
  const xMin = 0;
  const xMax = Math.max(uniqX.length - 1, 1);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys, 1);

  const xScale = (i: number) =>
    pad + (i - xMin) * ((width - pad * 2) / (xMax - xMin));
  const yScale = (v: number) =>
    height - pad - (v - yMin) * ((height - pad * 2) / (yMax - yMin || 1));

  return {
    xs,
    ys,
    xScale,
    yScale,
    yMin,
    yMax,
  };
});

const polyline = computed(() => {
  if (props.spec.type !== 'LINEAR') return '';
  return points.value.ys
    .map((y, i) => `${points.value.xScale(i)},${points.value.yScale(y)}`)
    .join(' ');
});

const barWidth = computed(() => {
  const availableWidth = width - pad * 2;
  const barCount = points.value.ys.length;
  return Math.min(40, (availableWidth / barCount) * 0.7);
});
</script>

<template>
	<div class="w-full space-y-4">
		<!-- Chart header -->
		<div class="flex items-center gap-4 text-sm text-slate-300">
			<span class="flex items-center gap-2">
				<span class="font-medium">Y-Axis:</span>
				<code
					class="px-2 py-1 rounded bg-blue-500/20 text-blue-200 font-mono"
					>{{ spec.yColumnName }}</code
				>
			</span>
			<span class="flex items-center gap-2">
				<span class="font-medium">X-Axis:</span>
				<code
					class="px-2 py-1 rounded bg-cyan-500/20 text-cyan-200 font-mono"
					>{{ spec.xColumn }}</code
				>
			</span>
		</div>

		<!-- Chart container -->
		<div
			class="overflow-hidden h-80 rounded-3xl border border-white/30 bg-gradient-to-br from-slate-900/30 to-slate-800/20 backdrop-blur-sm"
		>
			<svg
				:viewBox="`0 0 ${width} ${height}`"
				class="min-h-full"
				role="img"
				:aria-label="`${spec.type} chart showing ${spec.yColumnName} by ${spec.xColumn}`"
			>
				<!-- Enhanced grid -->
				<defs>
					<linearGradient
						id="gridGradient"
						x1="0%"
						y1="0%"
						x2="0%"
						y2="100%"
					>
						<stop
							offset="0%"
							style="stop-color:rgba(148, 163, 184, 0.3);stop-opacity:1"
						/>
						<stop
							offset="100%"
							style="stop-color:rgba(148, 163, 184, 0.1);stop-opacity:1"
						/>
					</linearGradient>
					<linearGradient
						id="barGradient"
						x1="0%"
						y1="0%"
						x2="0%"
						y2="100%"
					>
						<stop
							offset="0%"
							style="stop-color:rgba(59, 130, 246, 0.8);stop-opacity:1"
						/>
						<stop
							offset="100%"
							style="stop-color:rgba(59, 130, 246, 0.4);stop-opacity:1"
						/>
					</linearGradient>
					<linearGradient
						id="lineGradient"
						x1="0%"
						y1="0%"
						x2="100%"
						y2="0%"
					>
						<stop
							offset="0%"
							style="stop-color:rgba(59, 130, 246, 1);stop-opacity:1"
						/>
						<stop
							offset="50%"
							style="stop-color:rgba(34, 197, 94, 1);stop-opacity:1"
						/>
						<stop
							offset="100%"
							style="stop-color:rgba(168, 85, 247, 1);stop-opacity:1"
						/>
					</linearGradient>
				</defs>

				<!-- Background -->
				<rect
					width="100%"
					height="100%"
					fill="rgba(15, 23, 42, 0.3)"
				/>

				<!-- Grid lines -->
				<g opacity="0.4">
					<!-- Horizontal grid lines -->
					<line
						v-for="i in 6"
						:key="`h-${i}`"
						:x1="pad"
						:x2="width - pad"
						:y1="pad + (i-1) * ((height - 2*pad) / 5)"
						:y2="pad + (i-1) * ((height - 2*pad) / 5)"
						stroke="url(#gridGradient)"
						stroke-width="1"
						stroke-dasharray="4 6"
					/>
					<!-- Vertical grid lines -->
					<template v-for="(_, i) in points.ys">
						<line
							:key="`v-${i}`"
							:x1="points.xScale(i)"
							:x2="points.xScale(i)"
							:y1="pad"
							:y2="height - pad"
							stroke="rgba(148, 163, 184, 0.2)"
							stroke-width="1"
							stroke-dasharray="2 4"
							v-if="i % Math.ceil(points.ys.length / 8) === 0"
						/>
					</template>
				</g>

				<!-- Y-axis labels -->
				<g class="text-slate-300 text-xs font-medium">
					<text
						v-for="i in 6"
						:key="`y-label-${i}`"
						:x="pad - 10"
						:y="pad + (i-1) * ((height - 2*pad) / 5) + 4"
						text-anchor="end"
						fill="rgba(203, 213, 225, 0.8)"
					>
						{{ Math.round(points.yMax - (i-1) * (points.yMax - points.yMin) / 5).toLocaleString() }}
					</text>
				</g>

				<!-- X-axis labels (show every few labels to avoid crowding) -->
				<g class="text-slate-300 text-xs font-medium">
					<template v-for="(x, i) in points.xs">
						<text
							:key="`x-label-${i}`"
							:x="points.xScale(i)"
							:y="height - pad + 20"
							text-anchor="middle"
							fill="rgba(203, 213, 225, 0.8)"
							v-if="i % Math.ceil(points.xs.length / 8) === 0"
						>
							{{ x.length > 10 ? x.substring(0, 10) + '...' : x }}
						</text>
					</template>
				</g>

				<!-- Chart content based on type -->
				<template v-if="spec.type === 'BAR'">
					<g>
						<!-- Bar shadows for depth -->
						<rect
							v-for="(y, i) in points.ys"
							:key="`shadow-${i}`"
							:x="points.xScale(i) - barWidth/2 + 2"
							:y="points.yScale(y) + 2"
							:width="barWidth"
							:height="Math.max(0, height - pad - points.yScale(y))"
							rx="6"
							fill="rgba(0, 0, 0, 0.2)"
						/>
						<!-- Actual bars with gradient -->
						<rect
							v-for="(y, i) in points.ys"
							:key="`bar-${i}`"
							:x="points.xScale(i) - barWidth/2"
							:y="points.yScale(y)"
							:width="barWidth"
							:height="Math.max(0, height - pad - points.yScale(y))"
							rx="6"
							fill="url(#barGradient)"
							stroke="rgba(59, 130, 246, 0.6)"
							stroke-width="1"
							class="hover:opacity-80 transition-opacity cursor-pointer"
						/>
						<!-- Value labels on bars -->
						<template v-for="(y, i) in points.ys">
							<text
								:key="`bar-label-${i}`"
								:x="points.xScale(i)"
								:y="points.yScale(y) - 8"
								text-anchor="middle"
								class="text-xs font-semibold fill-white"
								v-if="points.ys.length <= 15"
							>
								{{ y.toLocaleString() }}
							</text>
						</template>
					</g>
				</template>

				<template v-else>
					<!-- Area fill under the line -->
					<path
						:d="`M ${points.xScale(0)},${height - pad} L ${polyline} L ${points.xScale(points.ys.length - 1)},${height - pad} Z`"
						fill="rgba(59, 130, 246, 0.1)"
						stroke="none"
					/>

					<!-- Main line with gradient -->
					<polyline
						:points="polyline"
						fill="none"
						stroke="url(#lineGradient)"
						stroke-width="3"
						stroke-linecap="round"
						stroke-linejoin="round"
						filter="drop-shadow(0 2px 4px rgba(59, 130, 246, 0.3))"
					/>

					<!-- Data points -->
					<g>
						<circle
							v-for="(y, i) in points.ys"
							:key="`point-${i}`"
							:cx="points.xScale(i)"
							:cy="points.yScale(y)"
							r="5"
							fill="white"
							stroke="rgba(59, 130, 246, 1)"
							stroke-width="3"
							class="hover:r-6 transition-all cursor-pointer drop-shadow-lg"
						/>
						<!-- Value labels on hover points -->
						<template v-for="(y, i) in points.ys">
							<text
								:key="`point-label-${i}`"
								:x="points.xScale(i)"
								:y="points.yScale(y) - 12"
								text-anchor="middle"
								class="text-xs font-semibold fill-white opacity-0 hover:opacity-100 transition-opacity"
								v-if="points.ys.length <= 12"
							>
								{{ y.toLocaleString() }}
							</text>
						</template>
					</g>
				</template>

				<!-- Chart title -->
				<text
					:x="width / 2"
					y="25"
					text-anchor="middle"
					class="text-sm font-bold fill-white"
				>
					{{ spec.yColumnName }} by {{ spec.xColumn }}
				</text>
			</svg>
		</div>

		<!-- Chart statistics -->
		<div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
			<div class="rounded-xl border border-white/20 bg-white/5 p-3 backdrop-blur-sm">
				<p class="text-xs text-slate-400 font-medium">Total Points</p>
				<p class="text-lg font-bold text-white">{{ points.ys.length }}</p>
			</div>
			<div class="rounded-xl border border-white/20 bg-white/5 p-3 backdrop-blur-sm">
				<p class="text-xs text-slate-400 font-medium">Average</p>
				<p class="text-lg font-bold text-emerald-300">
					{{ Math.round(points.ys.reduce((a, b) => a + b, 0) / points.ys.length).toLocaleString() }}
				</p>
			</div>
			<div class="rounded-xl border border-white/20 bg-white/5 p-3 backdrop-blur-sm">
				<p class="text-xs text-slate-400 font-medium">Maximum</p>
				<p class="text-lg font-bold text-blue-300">{{ Math.max(...points.ys).toLocaleString() }}</p>
			</div>
			<div class="rounded-xl border border-white/20 bg-white/5 p-3 backdrop-blur-sm">
				<p class="text-xs text-slate-400 font-medium">Minimum</p>
				<p class="text-lg font-bold text-cyan-300">{{ Math.min(...points.ys).toLocaleString() }}</p>
			</div>
		</div>
	</div>
</template>
