<template>
	<div class="relative grid place-items-center">
		<svg
			:width="size"
			:height="size"
			viewBox="0 0 120 120"
		>
			<circle
				cx="60"
				cy="60"
				r="52"
				class="fill-none stroke-slate-300 dark:stroke-white/20"
				stroke-width="10"
			/>
			<circle
				cx="60"
				cy="60"
				r="52"
				class="fill-none"
				:style="{ stroke: 'currentColor' }"
				:class="colorClass"
				stroke-linecap="round"
				stroke-width="10"
				:stroke-dasharray="circumference"
				:stroke-dashoffset="dashOffset"
				transform="rotate(-90,60,60)"
			/>
		</svg>
		<div class="absolute text-center leading-tight">
			<div class="text-3xl font-semibold text-slate-900 dark:text-slate-100">{{ value }}%</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed } from 'vue';





interface Props { value: number; size?: number; tone?: 'primary'|'amber'|'red'; label?: string }
const props = withDefaults(defineProps<Props>(), { size: 148, tone: 'primary', label: 'Индекс' })
const circumference = 2 * Math.PI * 52
const dashOffset = computed(() => circumference - (props.value / 100) * circumference)
const colorClass = computed(() =>
  props.tone === 'red' ? 'text-red-600' : props.tone === 'amber' ? 'text-amber-600' : 'text-primary'
)
</script>
