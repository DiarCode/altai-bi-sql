import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { authService } from '../services/auth.service'
import type { LoginRequest, RegisterRequest, OtpVerificationRequest, AuthState } from '../models/auth.models'

export function useAuth() {
	const router = useRouter()
	
	const authState = reactive<AuthState>({
		isAuthenticated: false,
		user: null,
		currentStep: 'phone',
		phoneNumber: '',
		isLoading: false,
		error: null
	})
	
	const registerData = reactive({
		fullName: '',
		phoneNumber: ''
	})
	
	const otpCode = ref('')
	
	const login = async (phoneNumber: string) => {
		authState.isLoading = true
		authState.error = null
		
		try {
			const request: LoginRequest = { phoneNumber }
			const response = await authService.login(request)
			
			if (response.success) {
				authState.phoneNumber = phoneNumber
				authState.currentStep = 'otp'
			} else {
				authState.error = response.message
			}
		} catch (err) {
			authState.error = 'Произошла ошибка при входе'
		} finally {
			authState.isLoading = false
		}
	}
	
	const register = async () => {
		authState.isLoading = true
		authState.error = null
		
		try {
			const request: RegisterRequest = {
				phoneNumber: registerData.phoneNumber,
				fullName: registerData.fullName
			}
			
			const response = await authService.register(request)
			
			if (response.success) {
				authState.phoneNumber = registerData.phoneNumber
				authState.currentStep = 'otp'
				router.push('/auth/login')
			} else {
				authState.error = response.message
			}
		} catch (err) {
			authState.error = 'Произошла ошибка при регистрации'
		} finally {
			authState.isLoading = false
		}
	}
	
	const verifyOtp = async () => {
		authState.isLoading = true
		authState.error = null
		
		try {
			const request: OtpVerificationRequest = {
				phoneNumber: authState.phoneNumber,
				otp: otpCode.value
			}
			
			const response = await authService.verifyOtp(request)
			
			if (response.success && response.user) {
				authState.isAuthenticated = true
				authState.user = response.user
				authState.currentStep = 'complete'
				router.push('/app/home')
			} else {
				authState.error = response.message
			}
		} catch (err) {
			authState.error = 'Произошла ошибка при проверке кода'
		} finally {
			authState.isLoading = false
		}
	}
	
	const logout = async () => {
		try {
			await authService.logout()
			authState.isAuthenticated = false
			authState.user = null
			authState.currentStep = 'phone'
			authState.phoneNumber = ''
			authState.error = null
			otpCode.value = ''
			registerData.fullName = ''
			registerData.phoneNumber = ''
			router.push('/welcome')
		} catch (err) {
			console.error('Logout error:', err)
		}
	}
	
	const resetAuthState = () => {
		authState.currentStep = 'phone'
		authState.phoneNumber = ''
		authState.error = null
		otpCode.value = ''
	}

	return {
		authState,
		registerData,
		otpCode,
		login,
		register,
		verifyOtp,
		logout,
		resetAuthState
	}
}