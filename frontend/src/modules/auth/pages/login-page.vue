<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowRight, Phone, Key } from 'lucide-vue-next'

import BG_URL from '@/core/assets/images/home-bg.jpg'
import { Button } from '@/core/components/ui/button'
import { Card } from '@/core/components/ui/card'
import { Input } from '@/core/components/ui/input'
import { Label } from '@/core/components/ui/label'
import { useAuth } from '../composables/use-auth.composable'
import OtpInput from '../components/otp-input.vue'

const router = useRouter()
const { authState, otpCode, login, verifyOtp, resetAuthState } = useAuth()

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
}

// Validation
const isValidPhone = computed(() => {
  const digits = phoneInput.value.replace(/\D/g, '')
  return digits.length === 11 && (digits.startsWith('7') || digits.startsWith('8'))
})

const handlePhoneSubmit = async () => {
  if (!isValidPhone.value) return
  await login(phoneInput.value)
}

const handleOtpComplete = (otp: string) => {
  otpCode.value = otp
}

const handleOtpSubmit = async () => {
  if (otpCode.value.length !== 4) return
  await verifyOtp()
}

const goToRegister = () => {
  router.push('/auth/register')
}

const goBack = () => {
  resetAuthState()
  phoneInput.value = ''
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
			<!-- Login Card -->
			<Card
				class="w-full max-w-md overflow-hidden rounded-3xl border border-white/20 bg-slate-100/5 backdrop-blur-lg"
			>
				<div class="p-8">
					<!-- Phone Step -->
					<div v-if="authState.currentStep === 'phone'">
						<!-- Header -->
						<div class="mb-8 text-center">
							<h1 class="text-3xl font-bold text-white mb-2">Login to System</h1>
							<p class="text-slate-300 text-base">
								Enter your phone number to receive a code
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

						<!-- Phone Form -->
						<form
							@submit.prevent="handlePhoneSubmit"
							class="space-y-6"
						>
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
								:disabled="!isValidPhone || authState.isLoading"
								class="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
							>
								<span v-if="authState.isLoading">Sending...</span>
								<span v-else class="flex items-center justify-center gap-2">
									Get Code
									<ArrowRight class="w-4 h-4" />
								</span>
							</Button>
						</form>

						<!-- Register Link -->
						<div class="mt-8 pt-6 border-t border-white/20">
							<p class="text-center text-slate-300">
								Don't have an account?
								<button
									@click="goToRegister"
									class="text-blue-400 hover:text-blue-300 font-semibold transition-colors duration-300 ml-1"
								>
									Sign Up
								</button>
							</p>
						</div>
					</div>

					<!-- OTP Step -->
					<div v-else-if="authState.currentStep === 'otp'">
						<!-- Header -->
						<div class="mb-8 text-center">
							<h1 class="text-3xl font-bold text-white mb-2">Enter Code</h1>
							<p class="text-slate-300 text-base">
								Code sent to {{ authState.phoneNumber }}
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

						<!-- OTP Form -->
						<form
							@submit.prevent="handleOtpSubmit"
							class="space-y-6"
						>
							<!-- OTP Input -->
							<div class="space-y-4">
								<Label class="text-white font-medium flex items-center justify-center gap-2">
									<Key class="w-4 h-4" />
									Verification Code
								</Label>
								<OtpInput
									v-model="otpCode"
									@complete="handleOtpComplete"
								/>
								<p class="text-center text-sm text-slate-400">
									Enter code <span class="font-mono font-bold">1111</span> for testing
								</p>
							</div>

							<!-- Submit Button -->
							<Button
								type="submit"
								:disabled="otpCode.length !== 4 || authState.isLoading"
								class="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
							>
								<span v-if="authState.isLoading">Verifying...</span>
								<span v-else class="flex items-center justify-center gap-2">
									Login
									<ArrowRight class="w-4 h-4" />
								</span>
							</Button>
						</form>

						<!-- Back Button -->
						<div class="mt-6">
							<Button
								@click="goBack"
								variant="outline"
								class="w-full border-white/30 bg-white/10 text-white hover:bg-white/20 transition-all duration-300"
							>
								Back
							</Button>
						</div>
					</div>
				</div>
			</Card>
		</main>
	</div>
</template>