<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';



import AppButton from '../components/app-button.vue';
import AppInput from '../components/app-input.vue';
import OtpInput from '../components/otp-input.vue';
import { useAuth } from '../composables/use-auth.composable';





const router = useRouter()
const authState = useAuth()

const phoneNumber = ref('')
const resendTimer = ref(0)
let resendInterval: NodeJS.Timeout | null = null

const isValidPhone = computed(() => {
	const digits = phoneNumber.value.replace(/\D/g, '')
	// Should have exactly 11 digits for +7 format or 11 digits for 8 format
	return digits.length === 11 && (digits.startsWith('7') || digits.startsWith('8'))
})

const formatPhoneNumber = (value: string) => {
	// Remove all non-digits first
	let cleanValue = value.replace(/\D/g, '')

	// Limit to maximum 11 digits
	cleanValue = cleanValue.slice(0, 11)

	// If starts with 8, replace with 7
	if (cleanValue.startsWith('8')) {
		cleanValue = '7' + cleanValue.slice(1)
	}

	// If starts with 7, add + prefix
	if (cleanValue.startsWith('7')) {
		return '+' + cleanValue
	} else if (cleanValue.length > 0) {
		// If user types any other number, assume they want Kazakhstan format
		return '+7' + cleanValue
	} else {
		return ''
	}
}

const handlePhoneInput = (value: string | number) => {
	const stringValue = String(value)
	const formatted = formatPhoneNumber(stringValue)
	phoneNumber.value = formatted
}

const handleLogin = async () => {
	await authState.login(phoneNumber.value)
	if (authState.loginState.step === 'otp') {
		startResendTimer()
	}
}

const handleOtpVerification = async () => {
	await authState.verifyOtp(authState.loginState.phoneNumber, authState.otpCode.value)
}

const handleOtpComplete = async (otp: string) => {
	if (otp.length === 4) {
		await authState.verifyOtp(authState.loginState.phoneNumber, otp)
	}
}

const resendCode = async () => {
	if (resendTimer.value > 0) return

	await authState.login(authState.loginState.phoneNumber)
	startResendTimer()
}

const startResendTimer = () => {
	resendTimer.value = 60
	resendInterval = setInterval(() => {
		resendTimer.value--
		if (resendTimer.value <= 0) {
			if (resendInterval) {
				clearInterval(resendInterval)
				resendInterval = null
			}
		}
	}, 1000)
}

const goBack = () => {
	if (authState.loginState.step === 'otp') {
		authState.loginState.step = 'phone'
		authState.otpCode.value = ''
		authState.error.value = null
	} else {
		router.push('/welcome')
	}
}

const goToRegister = () => {
	router.push('/auth/register')
}

// Cleanup
onUnmounted(() => {
	if (resendInterval) {
		clearInterval(resendInterval)
	}
})

// Reset form when component mounts
onMounted(() => {
	authState.resetForm()
	
	// Check if phone number is provided from registration redirect
	const queryPhone = router.currentRoute.value.query.phone as string
	if (queryPhone) {
		phoneNumber.value = queryPhone
	}
})
</script>

<template>
	<div class="min-h-screen bg-slate-100 text-slate-900">
		<!-- soft background accents -->
		<div class="pointer-events-none fixed inset-0 -z-10 opacity-30">
			<div
				class="absolute -top-24 -right-24 h-80 w-80 rounded-full blur-3xl"
				style="background: radial-gradient(closest-side, rgba(16,185,129,.25), transparent)"
			/>
			<div
				class="absolute bottom-0 left-[-120px] h-72 w-72 rounded-full blur-3xl"
				style="background: radial-gradient(closest-side, rgba(148,163,184,.25), transparent)"
			/>
		</div>

		<!-- Header -->
		<header class="px-5 pt-4">
			<div class="mx-auto max-w-sm flex items-center justify-between">
				<button
					@click="goBack"
					class="h-10 w-10 inline-grid place-items-center rounded-xl border border-slate-200 bg-white/80 hover:bg-white transition"
					aria-label="Назад"
				>
					<svg
						class="w-5 h-5 text-slate-700"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M15 19l-7-7 7-7"
						/>
					</svg>
				</button>

				<h1 class="text-xl font-semibold tracking-tight">Вход</h1>

				<div class="h-10 w-10"></div>
			</div>
		</header>

		<!-- Content -->
		<main class="px-5 flex items-center justify-center h-[94vh]">
			<div class="mx-auto max-w-sm">
				<!-- Card -->
				<section
					class="rounded-3xl border border-slate-200 bg-white/80 backdrop-blur p-6 shadow-sm"
				>
					<!-- PHONE STEP -->
					<div
						v-if="authState.loginState.step === 'phone'"
						class="space-y-6"
					>
						<header class="text-center">
							<h2 class="text-3xl leading-tight font-bold">Добро пожаловать</h2>
							<p class="mt-2 text-base text-slate-600">Введите номер телефона, чтобы продолжить</p>
						</header>

						<form
							@submit.prevent="handleLogin"
							class="space-y-5"
						>
							<app-input
								:modelValue="phoneNumber"
								@update:modelValue="handlePhoneInput"
								label="Номер телефона"
								placeholder="+7 777 123 45 67"
								type="tel"
								inputmode="tel"
								pattern="[+7-0-9]*"
								required
								class="py-6"
								:error="authState.error.value || undefined"
							/>

							<app-button
								type="submit"
								:loading="authState.isLoading.value"
								:disabled="!isValidPhone"
								full-width
								size="lg"
								class="h-12 text-base"
							>
								Получить код
							</app-button>
						</form>
					</div>

					<!-- OTP STEP -->
					<div
						v-else
						class="space-y-6"
					>
						<header class="text-center">
							<h2 class="text-3xl leading-tight font-bold">Подтверждение</h2>
							<p class="mt-2 text-base text-slate-600">
								Мы отправили код на номер<br />
								<span
									class="font-semibold text-slate-900"
									>{{ authState.loginState.phoneNumber }}</span
								>
							</p>
							<button
								@click="authState.loginState.step = 'phone'"
								class="mt-2 text-sm text-lime-600 hover:underline"
							>
								Изменить номер
							</button>
						</header>

						<form
							@submit.prevent="handleOtpVerification"
							class="space-y-6"
						>
							<div class="space-y-3">
								<label class="block text-sm font-medium text-slate-900 text-center">
									Код подтверждения
								</label>
								<otp-input
									v-model="authState.otpCode.value"
									:length="4"
									@complete="handleOtpComplete"
								/>
								<p
									v-if="authState.error.value"
									class="text-sm text-red-600 text-center"
								>
									{{ authState.error.value }}
								</p>
							</div>

							<app-button
								type="submit"
								:loading="authState.isLoading.value"
								:disabled="authState.otpCode.value.length !== 4"
								full-width
								size="lg"
								class="h-12 text-base"
							>
								Подтвердить
							</app-button>

							<div class="text-center">
								<button
									type="button"
									@click="resendCode"
									:disabled="resendTimer > 0"
									class="text-sm font-medium text-slate-600 hover:text-emerald-700 disabled:opacity-50"
								>
									{{ resendTimer > 0 ? `Отправить повторно через ${resendTimer}с` : 'Отправить код повторно' }}
								</button>
							</div>
						</form>
					</div>
				</section>

				<!-- Tiny demo note -->
				<div class="mt-5 rounded-2xl border border-slate-200 bg-white/70 backdrop-blur p-4">
					<div class="flex items-start gap-3">
						<div class="h-8 w-8 grid place-items-center rounded-xl bg-lime-100 text-lime-700">
							<svg
								class="w-4 h-4"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
							>
								<path
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
								/>
							</svg>
						</div>
						<div class="text-sm">
							<p class="font-medium">Демо-режим</p>
							<p class="mt-0.5 text-slate-600">
								Используйте код
								<span class="font-mono bg-slate-100 px-1.5 py-0.5 rounded">1111</span> для входа.
							</p>
						</div>
					</div>
				</div>

				<!-- Footer -->
				<p class="mt-6 text-center text-sm text-slate-600">
					Нет аккаунта?
					<button
						@click="goToRegister"
						class="text-lime-600 font-medium hover:underline"
					>
						Зарегистрируйтесь
					</button>
				</p>
			</div>
		</main>
	</div>
</template>
