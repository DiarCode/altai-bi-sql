<script setup lang="ts">
import { ref, computed } from 'vue'

interface Option {
	value: string
	label: string
}

interface Props {
	modelValue: string
	options: Option[]
	label?: string
	placeholder?: string
	required?: boolean
	disabled?: boolean
	error?: string
	hint?: string
	class?: string
}

interface Emits {
	'update:modelValue': [value: string]
}

const props = withDefaults(defineProps<Props>(), {
	required: false,
	disabled: false,
	placeholder: 'Выберите...'
})

const emit = defineEmits<Emits>()

const selectId = ref(`select-${Math.random().toString(36).substr(2, 9)}`)

const selectClasses = computed(() => {
	const baseClasses = [
		'w-full',
		'px-4',
		'py-3',
		'border-2',
		'rounded-lg',
		'text-base',
		'transition-colors',
		'duration-200',
		'bg-background',
		'text-foreground',
		'focus:outline-none',
		'focus:ring-2',
		'focus:ring-primary/50',
		'disabled:opacity-50',
		'disabled:cursor-not-allowed',
		'appearance-none',
		'bg-no-repeat',
		'bg-right',
		'pr-10',
		'cursor-pointer'
	]
	
	const borderClasses = props.error
		? ['border-destructive', 'focus:border-destructive']
		: ['border-border', 'focus:border-primary']
	
	return [...baseClasses, ...borderClasses].join(' ')
})

const handleChange = (event: Event) => {
	const target = event.target as HTMLSelectElement
	emit('update:modelValue', target.value)
}
</script>

<template>
	<div class="space-y-2">
		<label
			v-if="label"
			:for="selectId"
			class="block text-sm font-medium text-foreground"
		>
			{{ label }}
			<span v-if="required" class="text-destructive">*</span>
		</label>
		
		<div class="relative">
			<select
				:id="selectId"
				:value="modelValue"
				:required="required"
				:disabled="disabled"
				:class="selectClasses"
				@change="handleChange"
			>
				<option value="" disabled>{{ placeholder }}</option>
				<option
					v-for="option in options"
					:key="option.value"
					:value="option.value"
				>
					{{ option.label }}
				</option>
			</select>
			
			<!-- Custom dropdown arrow -->
			<div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
				<svg class="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
				</svg>
			</div>
		</div>
		
		<p v-if="error" class="text-sm text-destructive">
			{{ error }}
		</p>
		
		<p v-if="hint && !error" class="text-sm text-muted-foreground">
			{{ hint }}
		</p>
	</div>
</template>