<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowRight, User, Phone } from 'lucide-vue-next'

import BG_URL from '@/core/assets/images/home-bg.jpg'
import { Button } from '@/core/components/ui/button'
import { Card } from '@/core/components/ui/card'
import { Input } from '@/core/components/ui/input'
import { Label } from '@/core/components/ui/label'
import { useAuth } from '../composables/use-auth.composable'

const router = useRouter()
const { authState, registerData, register } = useAuth()

const phoneInput = ref('')

// Format phone number on input
const handlePhoneInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  let value = target.value.replace(/\D/g, '')
  
  if (value.startsWith('8')) {
    value = '7' + value.slice(1)
  }
  
  if (value.length > 11) {
    value = value.slice(0, 11)
  }
  
  // Format display
  if (value.length > 0) {
    if (value.startsWith('7')) {
      phoneInput.value = '+' + value
    } else {
      phoneInput.value = '+7' + value
    }
  } else {
    phoneInput.value = ''
  }
  
  registerData.phoneNumber = phoneInput.value
}

// Validation
const isValidPhone = computed(() => {
  const digits = phoneInput.value.replace(/\D/g, '')
  return digits.length === 11 && (digits.startsWith('7') || digits.startsWith('8'))
})

const isValidForm = computed(() => {
  return registerData.fullName.trim().length >= 2 && isValidPhone.value
})

const handleSubmit = async () => {
  if (!isValidForm.value) return
  await register()
}

const goToLogin = () => {
  router.push('/auth/login')
}
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

		<main class="relative z-10 flex min-h-screen items-center justify-center px-6 py-8">
			<!-- Registration Card -->
			<Card
				class="w-full max-w-md overflow-hidden rounded-3xl border border-white/20 bg-slate-100/5 backdrop-blur-lg"
			>
				<div class="p-8">
					<!-- Header -->
					<div class="mb-8 text-center">
						<h1 class="text-3xl font-bold text-white mb-2">Create Account</h1>
						<p class="text-slate-300 text-base">
							Enter your details to register
						</p>
					</div>

					<!-- Error Message -->
					<div
						v-if="authState.error"
						class="mb-6 p-4 rounded-2xl border border-rose-400/40 bg-gradient-to-br from-rose-500/15 to-rose-600/10 backdrop-blur-sm"
					>
						<p class="text-rose-200 text-sm font-medium">
							{{ authState.error }}
						</p>
					</div>

					<!-- Registration Form -->
					<form
						@submit.prevent="handleSubmit"
						class="space-y-6"
					>
						<!-- Full Name Field -->
						<div class="space-y-2">
							<Label
								for="fullName"
								class="text-white font-medium flex items-center gap-2"
							>
								<User class="w-4 h-4" />
								Full Name
							</Label>
							<Input
								id="fullName"
								v-model="registerData.fullName"
								type="text"
								placeholder="John Doe"
								class="h-12 border-white/30 bg-white/10 text-white placeholder:text-slate-300/70 backdrop-blur-sm focus:border-blue-400/50 focus:ring-blue-400/50"
								required
							/>
						</div>

						<!-- Phone Number Field -->
						<div class="space-y-2">
							<Label
								for="phone"
								class="text-white font-medium flex items-center gap-2"
							>
								<Phone class="w-4 h-4" />
								Phone Number
							</Label>
							<Input
								id="phone"
								v-model="phoneInput"
								type="tel"
								placeholder="+7 701 234 5678"
								class="h-12 border-white/30 bg-white/10 text-white placeholder:text-slate-300/70 backdrop-blur-sm focus:border-blue-400/50 focus:ring-blue-400/50"
								@input="handlePhoneInput"
								required
							/>
						</div>

						<!-- Submit Button -->
						<Button
							type="submit"
							:disabled="!isValidForm || authState.isLoading"
							class="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
						>
							<span v-if="authState.isLoading">Registering...</span>
							<span v-else class="flex items-center justify-center gap-2">
								Sign Up
								<ArrowRight class="w-4 h-4" />
							</span>
						</Button>
					</form>

					<!-- Login Link -->
					<div class="mt-8 pt-6 border-t border-white/20">
						<p class="text-center text-slate-300">
							Already have an account?
							<button
								@click="goToLogin"
								class="text-blue-400 hover:text-blue-300 font-semibold transition-colors duration-300 ml-1"
							>
								Login
							</button>
						</p>
					</div>
				</div>
			</Card>
		</main>
	</div>
</template>