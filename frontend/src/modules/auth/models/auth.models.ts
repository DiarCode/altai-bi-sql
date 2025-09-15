import type { KazakhstanCity } from '../constants/cities.constants'

export interface LoginRequest {
	phoneNumber: string
}

export interface OtpVerificationRequest {
	phoneNumber: string
	otp: string
}

export interface RegisterRequest {
	phoneNumber: string
	name: string
	carModel: string
	carYear: number
	carColor: string
	carVin: string
	city: KazakhstanCity
}

export interface AuthResponse {
	success: boolean
	message: string
	token?: string
}

export interface User {
	id: number
	name: string
	phoneNumber: string
	carModel: string
	carYear: number
	carColor: string
	vinNumber: string
	city: string
	createdAt: Date
	updatedAt: Date
}
