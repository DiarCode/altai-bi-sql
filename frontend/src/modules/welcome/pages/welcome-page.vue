<script setup lang="ts">
import { ArrowRight, BarChart3, Shield, Sparkles } from 'lucide-vue-next';
import { useRouter } from 'vue-router';



import BG_URL from '@/core/assets/home/earth-space.jpg';
import { Button } from '@/core/components/ui/button';
import { Card } from '@/core/components/ui/card';





const router = useRouter()

const goToLogin = () => router.push('/auth/login')
const goToRegister = () => router.push('/auth/register')
</script>

<template>
	<div
		class="relative min-h-screen w-full bg-cover bg-center bg-fixed"
		:style="{ backgroundImage: `url(${BG_URL})` }"
	>
		<!-- Enhanced overlay with gradient -->
		<div
			class="absolute inset-0 bg-gradient-to-br from-slate-950/50 via-slate-900/40 to-blue-950/30"
		/>

		<main class="relative z-10 flex min-h-screen items-center justify-center px-6 py-6">
			<div class="w-full max-w-4xl mx-auto">
				<!-- Hero Section -->
				<div class="text-center mb-12">
					<h1 class="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
						Business<span
							class="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400"
							>AI</span
						>
					</h1>

					<p class="text-xl md:text-2xl text-slate-300 mb-8 max-w-3xl mx-auto leading-relaxed">
						Transform your business questions into powerful analytics with artificial intelligence
					</p>
				</div>

				<!-- Features Grid -->
				<div class="grid md:grid-cols-3 gap-6 mb-12">
					<!-- Feature 1 -->
					<Card
						class="p-6 border border-white/20 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-lg"
					>
						<div class="flex items-center gap-3 mb-4">
							<div class="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
								<BarChart3 class="w-5 h-5 text-blue-400" />
							</div>
							<h3 class="text-lg font-semibold text-white">Smart Analytics</h3>
						</div>
						<p class="text-slate-300 text-sm leading-relaxed">
							Ask questions in natural language and get SQL queries with data visualization
						</p>
					</Card>

					<!-- Feature 2 -->
					<Card
						class="p-6 border border-white/20 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-lg"
					>
						<div class="flex items-center gap-3 mb-4">
							<div class="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
								<Sparkles class="w-5 h-5 text-emerald-400" />
							</div>
							<h3 class="text-lg font-semibold text-white">AI Assistant</h3>
						</div>
						<p class="text-slate-300 text-sm leading-relaxed">
							Powerful artificial intelligence understands your business context and provides
							insights
						</p>
					</Card>

					<!-- Feature 3 -->
					<Card
						class="p-6 border border-white/20 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-lg"
					>
						<div class="flex items-center gap-3 mb-4">
							<div class="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
								<Shield class="w-5 h-5 text-purple-400" />
							</div>
							<h3 class="text-lg font-semibold text-white">Security</h3>
						</div>
						<p class="text-slate-300 text-sm leading-relaxed">
							Your data is protected by modern encryption methods and remains confidential
						</p>
					</Card>
				</div>

				<!-- CTA Section -->
				<Card
					class="p-8 border border-white/20 bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-lg text-center"
				>
					<h2 class="text-2xl md:text-3xl font-bold text-white mb-4">
						Ready to start working with data?
					</h2>
					<p class="text-slate-300 text-lg mb-8 max-w-2xl mx-auto">
						Join thousands of companies already using BusinessAI to make data-driven decisions
					</p>

					<div class="flex flex-col sm:flex-row gap-4 justify-center items-center">
						<Button
							@click="goToRegister"
							size="lg"
							class="w-full sm:w-auto h-12 px-8 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
						>
							<span class="flex items-center gap-2">
								Start Free
								<ArrowRight class="w-4 h-4" />
							</span>
						</Button>

						<Button
							@click="goToLogin"
							size="lg"
							variant="outline"
							class="w-full sm:w-auto h-12 px-8 border-white/30 bg-white/10 text-white hover:bg-white/20 font-semibold rounded-xl transition-all duration-300"
						>
							Already have an account?
						</Button>
					</div>
				</Card>

				<!-- Footer -->
				<div class="mt-12 text-center">
					<p class="text-slate-400 text-sm">© 2025 BusinessAI. Altai Team.</p>
				</div>
			</div>
		</main>
	</div>
</template>
