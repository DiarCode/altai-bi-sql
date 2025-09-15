<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';



import AppButton from '../components/app-button.vue';
import AppInput from '../components/app-input.vue';
import AppSelect from '../components/app-select.vue';
import { useAuth } from '../composables/use-auth.composable';
import { KAZAKHSTAN_CITIES } from '../constants/cities.constants';





type Step = 'account' | 'car'

const router = useRouter()
const authState = useAuth()
const currentYear = new Date().getFullYear()
const step = ref<Step>('account')

/* ---------- Options ---------- */
const cityOptions = computed(() =>
  KAZAKHSTAN_CITIES.map(c => ({ value: c, label: c }))
)

/* ---------- Helpers & Formatters ---------- */
const formatRegisterPhone = (value: string) => {
  let s = value.replace(/\D/g, '').slice(0, 11)
  if (s.startsWith('8')) s = '7' + s.slice(1)
  if (s.startsWith('7')) return '+' + s
  return s ? '+7' + s : ''
}
const handlePhoneInput = (val: string | number) => {
  authState.registerState.phoneNumber = formatRegisterPhone(String(val))
}
const handleVinInput = (val: string | number) => {
  authState.registerState.carVin = String(val).toUpperCase()
}

/* ---------- Validation (ALL required) ---------- */
const phoneError = computed(() => {
  const v = authState.registerState.phoneNumber || ''
  const d = v.replace(/\D/g, '')
  return d.length === 11 && (d.startsWith('7') || d.startsWith('8')) ? undefined : 'Неверный формат номера'
})
const nameError = computed(() => {
  const v = (authState.registerState.name || '').trim()
  return v.length >= 2 ? undefined : 'Минимум 2 символа'
})
const cityError = computed(() => {
  const v = authState.registerState.city
  return KAZAKHSTAN_CITIES.includes(v) ? undefined : 'Выберите город'
})
const carModelError = computed(() => {
  const v = (authState.registerState.carModel || '').trim()
  return v.length >= 2 ? undefined : 'Минимум 2 символа'
})
const carYearError = computed(() => {
  const y = Number(authState.registerState.carYear)
  return y >= 1990 && y <= currentYear ? undefined : `Год между 1990 и ${currentYear}`
})
const carColorError = computed(() => {
  const v = (authState.registerState.carColor || '').trim()
  return v.length >= 2 ? undefined : 'Минимум 2 символа'
})
const carVinError = computed(() => {
  const v = (authState.registerState.carVin || '').trim().toUpperCase()
  if (v.length !== 17) return 'VIN — 17 символов'
  return /^[A-HJ-NPR-Z0-9]{17}$/.test(v) ? undefined : 'Недопустимые символы'
})

/* ---------- Step validity ---------- */
const isAccountValid = computed(() =>
  !phoneError.value && !nameError.value && !cityError.value &&
  !!authState.registerState.phoneNumber && !!authState.registerState.name && !!authState.registerState.city
)
const isCarValid = computed(() =>
  !carModelError.value && !carYearError.value && !carColorError.value && !carVinError.value &&
  !!authState.registerState.carModel && !!authState.registerState.carYear &&
  !!authState.registerState.carColor && !!authState.registerState.carVin
)

/* ---------- Actions ---------- */
const nextStep = () => { if (isAccountValid.value) step.value = 'car' }
const prevStep = () => { step.value = 'account' }
const handleRegister = async () => { if (isCarValid.value) await authState.register() }
const goBack = () => router.push('/welcome')
const goToLogin = () => router.push('/auth/login')

onMounted(() => authState.resetForm())
</script>

<template>
	<div class="bg-gradient-to-b from-white via-slate-50 to-slate-100 min-h-screen text-slate-900">
		<!-- soft accents -->
		<div class="-z-10 fixed inset-0 opacity-25 pointer-events-none">
			<div
				class="-top-24 -right-28 absolute blur-3xl rounded-full w-80 h-80"
				style="background:radial-gradient(closest-side, rgba(16,185,129,.25), transparent)"
			/>
		</div>

		<!-- Header -->
		<header class="px-5 pt-4">
			<div class="flex justify-between items-center mx-auto max-w-sm">
				<button
					@click="goBack"
					aria-label="Назад"
					class="inline-grid place-items-center bg-white/80 hover:bg-white border border-slate-200 rounded-xl w-10 h-10 transition"
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
				<h1 class="font-semibold text-xl tracking-tight">Регистрация</h1>
				<div class="w-10 h-10"></div>
			</div>

			<!-- Stepper -->
			<div class="mx-auto mt-3 max-w-sm">
				<div class="flex items-center gap-2">
					<div class="flex-1 bg-slate-200 rounded-full h-2 overflow-hidden">
						<div
							class="bg-lime-600 h-full transition-all"
							:style="{ width: step === 'account' ? '50%' : '100%' }"
						/>
					</div>
					<span class="font-medium text-slate-600 text-xs">
						{{ step === 'account' ? 'Шаг 1/2' : 'Шаг 2/2' }}
					</span>
				</div>
			</div>
		</header>

		<!-- Content -->
		<main class="mt-4 px-5 pb-56">
			<div class="mx-auto max-w-sm">
				<section
					class="bg-white/80 shadow-sm backdrop-blur p-6 border border-slate-200 rounded-3xl"
				>
					<h2 class="mb-1 font-bold text-3xl leading-tight">
						{{ step === 'account' ? 'Личные данные' : 'Данные автомобиля' }}
					</h2>
					<p class="mb-6 text-slate-600 text-base">
						{{ step === 'account'
              ? 'Заполните основные контакты для создания аккаунта'
              : 'Укажите сведения об автомобиле для точных рекомендаций' }}
					</p>

					<!-- STEP 1: Account -->
					<div
						v-if="step === 'account'"
						class="space-y-5"
					>
						<AppInput
							:modelValue="authState.registerState.phoneNumber"
							@update:modelValue="handlePhoneInput"
							label="Номер телефона"
							placeholder="+7 777 123 45 67"
							type="tel"
							inputmode="tel"
							required
							:error="phoneError"
							hint="Формат: +7 и 10 цифр"
						/>
						<AppInput
							v-model="authState.registerState.name"
							label="Полное имя"
							placeholder="Как к вам обращаться"
							required
							:error="nameError"
						/>
						<AppSelect
							v-model="authState.registerState.city"
							label="Город"
							:options="cityOptions"
							placeholder="Выберите город"
							required
							:error="cityError"
						/>
					</div>

					<!-- STEP 2: Car -->
					<div
						v-else
						class="space-y-5"
					>
						<AppInput
							:modelValue="authState.registerState.carVin"
							@update:modelValue="handleVinInput"
							label="VIN"
							placeholder="Напр., 1HGBH41JXMN109186"
							required
							:maxlength="17"
							:error="carVinError"
						/>
						<div class="gap-3 grid grid-cols-2">
							<AppInput
								v-model="authState.registerState.carModel"
								label="Марка и модель"
								placeholder="Toyota Camry"
								required
								:error="carModelError"
							/>
							<AppInput
								v-model="authState.registerState.carYear"
								label="Год"
								type="number"
								inputmode="numeric"
								:min="1990"
								:max="currentYear"
								required
								:error="carYearError"
							/>
						</div>
						<AppInput
							v-model="authState.registerState.carColor"
							label="Цвет"
							placeholder="Белый"
							required
							:error="carColorError"
						/>
					</div>
				</section>

				<!-- Bottom sticky actions -->
				<div
					class="right-0 bottom-0 pb-[calc(16px+env(safe-area-inset-bottom))] left-0 z-10 fixed bg-gradient-to-t from-white to-white/70 backdrop-blur px-5 pt-4 border-slate-200 border-t"
				>
					<div class="flex items-center gap-3 mx-auto max-w-sm">
						<AppButton
							v-if="step === 'car'"
							variant="secondary"
							class="flex-1 h-12"
							@click="prevStep"
						>
							Назад
						</AppButton>

						<AppButton
							v-if="step === 'account'"
							class="flex-1 h-12"
							:disabled="!isAccountValid"
							@click="nextStep"
						>
							Далее
						</AppButton>

						<AppButton
							v-else
							class="flex-1 h-12"
							:loading="authState.isLoading.value"
							:disabled="!isCarValid"
							@click="handleRegister"
						>
							Создать аккаунт
						</AppButton>
					</div>

					<p class="mt-6 text-slate-600 text-sm text-center">
						Уже есть аккаунт?
						<button
							@click="goToLogin"
							class="font-medium text-lime-700 hover:underline"
						>
							Войти
						</button>
					</p>
				</div>
			</div>
		</main>
	</div>
</template>
