import type {
	LoginRequest,
	RegisterRequest,
	OtpVerificationRequest,
	AuthResponse,
	User
} from '../models/auth.models'
import { apiClient } from '@/core/configs/axios-instance.config'

interface ApiError {
	response?: {
		data?: {
			message?: string
		}
	}
}

class AuthService {
	private handleError(error: unknown, defaultMessage: string): string {
		if (error && typeof error === 'object' && 'response' in error) {
			const apiError = error as ApiError
			return apiError.response?.data?.message || defaultMessage
		}
		return defaultMessage
	}

	// Request OTP for login
	async login(request: LoginRequest): Promise<AuthResponse> {
		try {
			// Basic phone number validation (Kazakhstan format)
			const phoneRegex = /^(\+7|8)[0-9]{10}$/
			if (!phoneRegex.test(request.phoneNumber)) {
				return {
					success: false,
					message: 'Неверный формат номера телефона'
				}
			}

			// Convert phone to E.164 format for backend
			let phoneNumber = request.phoneNumber.replace(/\D/g, '')
			if (phoneNumber.startsWith('8')) {
				phoneNumber = '7' + phoneNumber.slice(1)
			}
			if (!phoneNumber.startsWith('+')) {
				phoneNumber = '+' + phoneNumber
			}

			await apiClient.post('/users/otp/request', {
				phoneNumber
			})

			return {
				success: true,
				message: 'SMS с кодом отправлен'
			}
		} catch (error: unknown) {
			console.error('Login error:', error)
			return {
				success: false,
				message: this.handleError(error, 'Произошла ошибка при отправке SMS')
			}
		}
	}

	// Verify OTP and create session (still accepts hardcoded "1111")
	async verifyOtp(request: OtpVerificationRequest): Promise<AuthResponse> {
		try {
			// Keep hardcoded OTP check as requested
			if (request.otp !== '1111') {
				return {
					success: false,
					message: 'Неверный код подтверждения'
				}
			}

			// Convert phone to E.164 format for backend
			let phoneNumber = request.phoneNumber.replace(/\D/g, '')
			if (phoneNumber.startsWith('8')) {
				phoneNumber = '7' + phoneNumber.slice(1)
			}
			if (!phoneNumber.startsWith('+')) {
				phoneNumber = '+' + phoneNumber
			}

			const response = await apiClient.post('/users/otp/verify', {
				phoneNumber,
				code: request.otp
			})

			if (response.data.success) {
				return {
					success: true,
					message: 'Авторизация успешна',
					token: 'session-created' // Backend uses cookies, not JWT tokens
				}
			} else {
				return {
					success: false,
					message: 'Ошибка при создании сессии'
				}
			}
		} catch (error: unknown) {
			console.error('OTP verification error:', error)
			return {
				success: false,
				message: this.handleError(error, 'Произошла ошибка при подтверждении кода')
			}
		}
	}

	// Registration with backend API
	async register(request: RegisterRequest): Promise<AuthResponse> {
		try {
			// Basic validation
			if (!request.name.trim()) {
				return {
					success: false,
					message: 'Имя обязательно для заполнения'
				}
			}

			if (!request.carModel.trim()) {
				return {
					success: false,
					message: 'Модель автомобиля обязательна для заполнения'
				}
			}

			if (request.carYear < 1990 || request.carYear > new Date().getFullYear()) {
				return {
					success: false,
					message: 'Неверный год выпуска автомобиля'
				}
			}

			// Convert phone to E.164 format for backend
			let phoneNumber = request.phoneNumber.replace(/\D/g, '')
			if (phoneNumber.startsWith('8')) {
				phoneNumber = '7' + phoneNumber.slice(1)
			}
			if (!phoneNumber.startsWith('+')) {
				phoneNumber = '+' + phoneNumber
			}

			// Call backend signup endpoint
			await apiClient.post('/users/signup', {
				name: request.name,
				phoneNumber,
				city: request.city,
				carModel: request.carModel,
				carYear: request.carYear,
				carColor: request.carColor,
				vinNumber: request.carVin // Backend uses 'vinNumber' instead of 'carVin'
			})

			return {
				success: true,
				message: 'Регистрация успешна. SMS с кодом отправлен'
			}
		} catch (error: unknown) {
			console.error('Registration error:', error)
			return {
				success: false,
				message: this.handleError(error, 'Произошла ошибка при регистрации')
			}
		}
	}

	// Get current user from backend
	async getCurrentUser(): Promise<User | null> {
		try {
			const response = await apiClient.get<User>('/users/me')
			return response.data
		} catch (error: unknown) {
			console.error('Get current user error:', error)
			return null
		}
	}

	// Logout and clear backend session
	async logout(): Promise<void> {
		try {
			await apiClient.post('/users/logout')
		} catch (error: unknown) {
			console.error('Logout error:', error)
			// Even if logout fails on backend, we should clear local state
		}

		// Clear any local storage items (keeping for backward compatibility)
		localStorage.removeItem('user')
		localStorage.removeItem('token')
	}
}

export const authService = new AuthService()
