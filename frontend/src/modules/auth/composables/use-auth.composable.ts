import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { authService } from '../services/auth.service'
import type { LoginRequest, RegisterRequest, OtpVerificationRequest } from '../models/auth.models'
import type { KazakhstanCity } from '../constants/cities.constants'

export function useAuth() {
	const router = useRouter()
	const isLoading = ref(false)
	const error = ref<string | null>(null)
	
	const loginState = reactive({
		phoneNumber: '',
		step: 'phone' as 'phone' | 'otp'
	})
	
	const registerState = reactive({
		phoneNumber: '',
		name: '',
		carModel: '',
		carYear: new Date().getFullYear(),
		carColor: '',
		carVin: '',
		city: '' as KazakhstanCity | ''
	})
	
	const otpCode = ref('')
	
	const login = async (phoneNumber: string) => {
		isLoading.value = true
		error.value = null
		
		try {
			const response = await authService.login({ phoneNumber })
			
			if (response.success) {
				loginState.phoneNumber = phoneNumber
				loginState.step = 'otp'
			} else {
				error.value = response.message
			}
		} catch (err) {
			error.value = 'Произошла ошибка при отправке SMS'
		} finally {
			isLoading.value = false
		}
	}
	
	const register = async () => {
		isLoading.value = true
		error.value = null
		
		try {
			// Validate required fields
			if (!registerState.city) {
				error.value = 'Выберите город'
				isLoading.value = false
				return
			}
			
			const request: RegisterRequest = {
				phoneNumber: registerState.phoneNumber,
				name: registerState.name,
				carModel: registerState.carModel,
				carYear: registerState.carYear,
				carColor: registerState.carColor,
				carVin: registerState.carVin,
				city: registerState.city as KazakhstanCity
			}
			
			const response = await authService.register(request)
			
			if (response.success) {
				// After successful registration, redirect to login with pre-filled phone
				router.push({
					path: '/auth/login',
					query: { phone: registerState.phoneNumber }
				})
			} else {
				error.value = response.message
			}
		} catch (err) {
			error.value = 'Произошла ошибка при регистрации'
		} finally {
			isLoading.value = false
		}
	}
	
	const verifyOtp = async (phoneNumber: string, otp: string) => {
		isLoading.value = true
		error.value = null
		
		try {
			const response = await authService.verifyOtp({ phoneNumber, otp })
			
			if (response.success) {
				if (response.token) {
					localStorage.setItem('token', response.token)
				}
				// Navigate to scan page
				router.push('/app/home')
			} else {
				error.value = response.message
			}
		} catch (err) {
			error.value = 'Произошла ошибка при подтверждении кода'
		} finally {
			isLoading.value = false
		}
	}
	
	const logout = async () => {
		await authService.logout()
		router.push('/welcome')
	}
	
	const resetForm = () => {
		loginState.phoneNumber = ''
		loginState.step = 'phone'
		registerState.phoneNumber = ''
		registerState.name = ''
		registerState.carModel = ''
		registerState.carYear = new Date().getFullYear()
		registerState.carColor = ''
		registerState.carVin = ''
		registerState.city = ''
		otpCode.value = ''
		error.value = null
	}
	
	return {
		isLoading,
		error,
		loginState,
		registerState,
		otpCode,
		login,
		register,
		verifyOtp,
		logout,
		resetForm
	}
}