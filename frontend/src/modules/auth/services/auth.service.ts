import type {
	LoginRequest,
	RegisterRequest,
	OtpVerificationRequest,
	AuthResponse,
	User
} from '../models/auth.models'

// Mock storage for users
const mockUsers: User[] = []
let currentUser: User | null = null

class AuthService {
	// Mock delay to simulate API calls
	private async mockDelay(ms = 1000): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms))
	}

	// Format phone number
	private formatPhoneNumber(phone: string): string {
		let phoneNumber = phone.replace(/\D/g, '')
		if (phoneNumber.startsWith('8')) {
			phoneNumber = '7' + phoneNumber.slice(1)
		}
		if (!phoneNumber.startsWith('+')) {
			phoneNumber = '+' + phoneNumber
		}
		return phoneNumber
	}

	// Validate phone number
	private isValidPhone(phone: string): boolean {
		const phoneRegex = /^(\+7|8)[0-9]{10}$/
		return phoneRegex.test(phone)
	}

	// Request OTP for login
	async login(request: LoginRequest): Promise<AuthResponse> {
		await this.mockDelay(800)
		
		if (!this.isValidPhone(request.phoneNumber)) {
			return {
				success: false,
				message: 'Неверный формат номера телефона'
			}
		}

		const formattedPhone = this.formatPhoneNumber(request.phoneNumber)
		const user = mockUsers.find(u => u.phoneNumber === formattedPhone)
		
		if (!user) {
			return {
				success: false,
				message: 'Пользователь с таким номером не найден'
			}
		}

		return {
			success: true,
			message: 'OTP код отправлен'
		}
	}

	// Verify OTP and create session (hardcoded to "1111")
	async verifyOtp(request: OtpVerificationRequest): Promise<AuthResponse> {
		await this.mockDelay(500)
		
		// Hardcoded OTP check as requested
		if (request.otp !== '1111') {
			return {
				success: false,
				message: 'Неверный код подтверждения'
			}
		}

		const formattedPhone = this.formatPhoneNumber(request.phoneNumber)
		const user = mockUsers.find(u => u.phoneNumber === formattedPhone)
		
		if (!user) {
			return {
				success: false,
				message: 'Пользователь не найден'
			}
		}

		currentUser = user
		
		return {
			success: true,
			message: 'Авторизация успешна',
			token: 'mock-token',
			user
		}
	}

	// Registration with mock logic
	async register(request: RegisterRequest): Promise<AuthResponse> {
		await this.mockDelay(1000)
		
		// Basic validation
		if (!request.fullName.trim()) {
			return {
				success: false,
				message: 'Имя обязательно для заполнения'
			}
		}

		if (!this.isValidPhone(request.phoneNumber)) {
			return {
				success: false,
				message: 'Неверный формат номера телефона'
			}
		}

		const formattedPhone = this.formatPhoneNumber(request.phoneNumber)
		
		// Check if user already exists
		const existingUser = mockUsers.find(u => u.phoneNumber === formattedPhone)
		if (existingUser) {
			return {
				success: false,
				message: 'Пользователь с таким номером уже существует'
			}
		}

		// Create new user
		const newUser: User = {
			id: crypto.randomUUID(),
			fullName: request.fullName,
			phoneNumber: formattedPhone,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString()
		}

		mockUsers.push(newUser)

		return {
			success: true,
			message: 'Регистрация успешна. SMS с кодом отправлен'
		}
	}

	// Get current user
	async getCurrentUser(): Promise<User | null> {
		await this.mockDelay(200)
		return currentUser
	}

	// Logout and clear session
	async logout(): Promise<void> {
		await this.mockDelay(200)
		currentUser = null
	}
}

export const authService = new AuthService()
