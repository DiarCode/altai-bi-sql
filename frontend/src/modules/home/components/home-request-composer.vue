<script setup lang="ts">
import { onMounted, ref, useTemplateRef } from 'vue';



import { Textarea } from '@/core/components/ui/textarea';





const emit = defineEmits<{
  (e: 'submit', prompt: string): void;
}>();

const value = ref('');
const loading = ref(false);
const textareaRef = useTemplateRef<HTMLTextAreaElement>("textareaRef");

async function onSubmit() {
  const prompt = value.value.trim();
  if (!prompt) return;
  loading.value = true;
  emit('submit', prompt);

  setTimeout(() => {
    loading.value = false;
    value.value = '';
  }, 50);
}

onMounted(() => {
  window.addEventListener('keydown', (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') onSubmit();
  });
});
</script>

<template>
	<!-- Enhanced input container -->
	<div
		class="rounded-3xl border border-white/30 overflow-hidden bg-gradient-to-br from-white/15 to-white/5 sm:p-6 backdrop-blur-xl shadow-xl"
	>
		<div class="flex-1 sm:space-y-4">
			<Textarea
				ref="textareaRef"
				v-model="value"
				placeholder="Ask anything"
				class="min-h-[100px] resize-y border border-white/20 bg-white/10 text-white placeholder:text-slate-300/70 font-light !text-2xl sm:!text-3xl px-6 py-4 leading-relaxed sm:backdrop-blur-sm "
				:disabled="loading"
				aria-label="Business question prompt"
			/>

			<!-- Helper text -->
			<div class="sm:flex items-center justify-between text-sm hidden">
				<p class="text-slate-300/80">Speak naturally - our AI understands your business language</p>
				<p class="text-slate-400 font-mono text-xs">⌘/Ctrl + Enter to send</p>
			</div>

			<!-- <Button
				variant="secondary"
				size="sm"
				class="flex sm:hidden"
			>
				Send
				<ChevronRight />
			</Button> -->
		</div>
	</div>
</template>
