<script setup lang="ts">
import { reactiveOmit } from "@vueuse/core";
import type { DialogTriggerProps } from "reka-ui";
import { DialogTrigger, useForwardProps } from "reka-ui";
import type { HTMLAttributes } from "vue";



import { cn } from '@/core/utils/tailwind.utils';





const props = defineProps<DialogTriggerProps & { class?: HTMLAttributes["class"] }>()

const delegatedProps = reactiveOmit(props, "class")
const forwardedProps = useForwardProps(delegatedProps)
</script>

<template>
	<DialogTrigger
		data-slot="dialog-trigger"
		v-bind="forwardedProps"
		:class="cn('', props.class)"
	>
		<slot />
	</DialogTrigger>
</template>
