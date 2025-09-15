<script setup lang="ts">
import { ArrowRight } from 'lucide-vue-next';
import { useRouter } from 'vue-router';
import { Vue3Lottie } from "vue3-lottie";



import CarAnimation from '@/core/assets/animations/taxi.json';





const router = useRouter()
const goToLogin = () => router.push('/auth/login')
</script>

<template>
	<div class="min-h-screen bg-primary text-slate-900">
		<!-- Subtle background shapes -->
		<div class="pointer-events-none fixed inset-0 -z-10 opacity-30">
			<div
				class="absolute -top-20 -right-16 h-72 w-72 rounded-full blur-3xl"
				style="background: radial-gradient(closest-side, rgba(16,185,129,.35), transparent)"
			/>
			<div
				class="absolute bottom-10 left-[-60px] h-64 w-64 rounded-full blur-3xl"
				style="background: radial-gradient(closest-side, rgba(148,163,184,.35), transparent)"
			/>
		</div>

		<!-- Main / hero -->
		<main class="px-6 pb-32 flex items-center justify-center h-screen">
			<section class="mx-auto  max-w-sm">
				<!-- Lottie hero (transparent background, rounded) -->
				<div class="mb-8">
					<!-- Use your .json below; keep transparent for glass look -->
					<!-- If you don't have it yet, leave src as a placeholder -->
					<Vue3Lottie
						:animation-data="CarAnimation"
						loop
						autoplay
					/>
					<!-- graceful fallback -->
					<div class="sr-only">Анимация: процесс сканирования авто</div>
				</div>

				<!-- Big headline -->
				<h1 class="text-4xl leading-tight font-bold tracking-tight">
					Сканируйте. <span class="text-indigo-600">Анализируйте.</span> Действуйте.
				</h1>

				<p class="mt-4 text-lg text-slate-800">
					Помощник по визуальной диагностике автомобиля и быстрой оценке работ.
				</p>
			</section>
		</main>

		<!-- Bottom actions (safe-area aware) -->
		<footer class="fixed bottom-0 left-0 px-4 py-4 w-full">
			<div class="mx-auto max-w-sm space-y-3">
				<button
					class="w-full inline-flex items-center justify-center gap-2 rounded-3xl bg-black text-white font-semibold py-4 transition"
					@click="goToLogin"
				>
					Начать
					<ArrowRight class="h-5 w-5 opacity-80" />
				</button>
			</div>
		</footer>
	</div>
</template>

<style scoped>
/* small devices: tighten spacing a bit */
@media (max-width: 360px) {
  h1 { font-size: 1.9rem; line-height: 1.2; }
}
</style>
