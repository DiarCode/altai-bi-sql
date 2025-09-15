<script setup lang="ts">
import { ref, watch } from 'vue'

interface Props {
	modelValue: string
	length?: number
}

interface Emits {
	'update:modelValue': [value: string]
	'complete': [value: string]
}

const props = withDefaults(defineProps<Props>(), {
	length: 4
})

const emit = defineEmits<Emits>()

const otp = ref<string[]>(new Array(props.length).fill(''))

// Watch for external changes
watch(() => props.modelValue, (newValue) => {
	if (newValue.length === 0) {
		otp.value = new Array(props.length).fill('')
	}
}, { immediate: true })

const handleInput = (event: Event, index: number) => {
	const target = event.target as HTMLInputElement
	const value = target.value.replace(/[^0-9]/g, '') // Only allow numbers
	
	if (value.length > 0) {
		otp.value[index] = value
		// Move to next input
		if (index < props.length - 1) {
			const nextInput = target.parentElement?.children[index + 1] as HTMLInputElement
			nextInput?.focus()
		}
	} else {
		otp.value[index] = ''
	}
	
	updateModelValue()
}

const handleKeyDown = (event: KeyboardEvent, index: number) => {
	const target = event.target as HTMLInputElement
	
	if (event.key === 'Backspace') {
		if (otp.value[index] === '' && index > 0) {
			// Move to previous input if current is empty
			const prevInput = target.parentElement?.children[index - 1] as HTMLInputElement
			prevInput?.focus()
		} else {
			otp.value[index] = ''
			updateModelValue()
		}
	} else if (event.key === 'ArrowLeft' && index > 0) {
		const prevInput = target.parentElement?.children[index - 1] as HTMLInputElement
		prevInput?.focus()
	} else if (event.key === 'ArrowRight' && index < props.length - 1) {
		const nextInput = target.parentElement?.children[index + 1] as HTMLInputElement
		nextInput?.focus()
	}
}

const handlePaste = (event: ClipboardEvent) => {
	event.preventDefault()
	const pasteData = event.clipboardData?.getData('text') || ''
	const digits = pasteData.replace(/[^0-9]/g, '').slice(0, props.length)
	
	for (let i = 0; i < props.length; i++) {
		otp.value[i] = digits[i] || ''
	}
	
	updateModelValue()
}

const updateModelValue = () => {
	const value = otp.value.join('')
	emit('update:modelValue', value)
	
	if (value.length === props.length) {
		emit('complete', value)
	}
}
</script>

<template>
	<div class="flex justify-center space-x-3">
		<input
			v-for="(digit, index) in otp"
			:key="index"
			:value="otp[index]"
			type="text"
			inputmode="numeric"
			pattern="[0-9]*"
			maxlength="1"
			class="w-12 h-12 text-center text-xl font-semibold border-2 border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-background text-foreground"
			@input="handleInput($event, index)"
			@keydown="handleKeyDown($event, index)"
			@paste="handlePaste"
		/>
	</div>
</template>
