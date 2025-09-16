export interface LoginRequest {
	phoneNumber: string
}

export interface OtpVerificationRequest {
	phoneNumber: string
	otp: string
}

export interface RegisterRequest {
	phoneNumber: string
	fullName: string
}

export interface AuthResponse {
	success: boolean
	message: string
	token?: string
	user?: User
}

export interface User {
	id: string
	fullName: string
	phoneNumber: string
	createdAt: string
	updatedAt: string
}

export type AuthStep = 'phone' | 'otp' | 'complete'

export interface AuthState {
	isAuthenticated: boolean
	user: User | null
	currentStep: AuthStep
	phoneNumber: string
	isLoading: boolean
	error: string | null
}
