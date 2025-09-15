<template>
	<Button
		:class="cn(buttonClasses, props.class)"
		:disabled="disabled || loading"
		:variant="shadcnVariant"
		:size="shadcnSize"
		@click="$emit('click')"
	>
		<div v-if="loading" class="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2"></div>
		<slot />
	</Button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Button } from '@/core/components/ui/button'
import { cn } from '@/core/utils/tailwind.utils'

interface Props {
	variant?: 'primary' | 'secondary' | 'outline' | 'destructive' | 'ghost' | 'link'
	size?: 'sm' | 'md' | 'lg' | 'icon'
	disabled?: boolean
	loading?: boolean
	fullWidth?: boolean
	class?: string
}

interface Emits {
	'click': []
}

const props = withDefaults(defineProps<Props>(), {
	variant: 'primary',
	size: 'md',
	disabled: false,
	loading: false,
	fullWidth: false
})

defineEmits<Emits>()

// Map our variants to shadcn variants
const shadcnVariant = computed(() => {
	const variantMap = {
		primary: 'default',
		secondary: 'secondary',
		outline: 'outline',
		destructive: 'destructive',
		ghost: 'ghost',
		link: 'link'
	} as const
	
	return variantMap[props.variant] || 'default'
})

// Map our sizes to shadcn sizes
const shadcnSize = computed(() => {
	const sizeMap = {
		sm: 'sm',
		md: 'default',
		lg: 'lg',
		icon: 'icon'
	} as const
	
	return sizeMap[props.size] || 'default'
})

const buttonClasses = computed(() => {
	const classes = []
	
	if (props.fullWidth) {
		classes.push('w-full')
	}
	
	if (props.loading) {
		classes.push('opacity-70')
	}
	
	return classes.join(' ')
})
</script>
