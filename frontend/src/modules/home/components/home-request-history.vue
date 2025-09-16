<script setup lang="ts">
import type { RequestBundle } from '../models/bi.models';
import ResultCard from './home-result-card.vue';





defineProps<{
  items: RequestBundle[];
  onRetry?: (b: RequestBundle) => void;
}>();
</script>

<template>
	<div class="space-y-4">
		<ResultCard
			v-for="item in items"
			:key="item.request.id"
			:bundle="item"
			:onRetry="onRetry"
		/>
	</div>
</template>
