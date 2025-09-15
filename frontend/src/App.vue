<script setup lang="ts">
import { useColorMode } from '@vueuse/core';
import 'vue-sonner/style.css';



import { Toaster } from '@/core/components/ui/sonner';





// vue-sonner v2 requires this import





useColorMode({initialValue:'light'})
</script>

<template>
	<Toaster
		class="pointer-events-auto"
		:duration="3000"
		rich-colors
	/>

	<RouterView />
</template>

<style scoped></style>
