<script setup lang="ts">
import { ref } from 'vue'
import { Input } from '@/core/components/ui/input'
import { Label } from '@/core/components/ui/label'
import { cn } from '@/core/utils/tailwind.utils'

interface Props {
	modelValue: string | number
	label?: string
	placeholder?: string
	type?: string
	required?: boolean
	disabled?: boolean
	loading?: boolean
	error?: string
	hint?: string
	inputmode?: 'search' | 'text' | 'email' | 'tel' | 'url' | 'numeric' | 'none' | 'decimal'
	pattern?: string
	maxlength?: number
	class?: string
}

interface Emits {
	'update:modelValue': [value: string | number]
	'blur': []
	'focus': []
}

const props = withDefaults(defineProps<Props>(), {
	type: 'text',
	required: false,
	disabled: false,
	loading: false
})

const emit = defineEmits<Emits>()

const inputId = ref(`input-${Math.random().toString(36).substr(2, 9)}`)

const handleInput = (value: string | number) => {
	const convertedValue = props.type === 'number' ? Number(value) : value
	emit('update:modelValue', convertedValue)
}
</script>

<template>
	<div class="space-y-2">
		<Label
			v-if="label"
			:for="inputId"
			class="block text-sm font-medium text-foreground"
		>
			{{ label }}
			<span v-if="required" class="text-destructive">*</span>
		</Label>
		
		<div class="relative">
			<Input
				:id="inputId"
				:type="type"
				:modelValue="modelValue"
				:placeholder="placeholder"
				:required="required"
				:disabled="disabled"
				:inputmode="inputmode"
				:pattern="pattern"
				:maxlength="maxlength"
				:class="cn('', error && 'border-destructive focus:border-destructive', props.class)"
				@update:modelValue="handleInput"
				@blur="$emit('blur')"
				@focus="$emit('focus')"
			/>
			
			<div v-if="loading" class="absolute right-3 top-1/2 transform -translate-y-1/2">
				<div class="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
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
