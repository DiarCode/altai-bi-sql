// src/modules/auth/user/dtos/user-auth.dtos.ts

import { ApiProperty } from '@nestjs/swagger'
import { IsString, Matches, Length, IsNotEmpty, IsNumber } from 'class-validator'
/**
 * Step 1: Request a one-time code
 */
export class RequestOtpDto {
	@ApiProperty({ description: 'Phone in E.164 format' })
	@IsString()
	@Matches(/^\+\d{6,15}$/, { message: 'Must be E.164 format' })
	phoneNumber: string
}

export class SignUpDto {
	@ApiProperty({ description: 'Full name' })
	@IsString()
	@IsNotEmpty()
	name: string

	@ApiProperty({ description: 'Phone in E.164 format' })
	@IsString()
	@Matches(/^\+\d{6,15}$/, { message: 'Must be E.164 format' })
	phoneNumber: string

	@ApiProperty({ description: 'City' })
	@IsString()
	@IsNotEmpty()
	city: string

	// car info
	@ApiProperty({ description: 'Car model' })
	@IsString()
	@IsNotEmpty()
	carModel: string

	@ApiProperty({ description: 'Car year' })
	@IsNumber()
	@IsNotEmpty()
	carYear: number

	@ApiProperty({ description: 'Car color' })
	@IsString()
	@IsNotEmpty()
	carColor: string

	@ApiProperty({ description: 'Car vin number' })
	@IsString()
	@IsNotEmpty()
	vinNumber: string
}
/**
 * Step 2: Verify the code
 */
export class VerifyUserOtpDto {
	@ApiProperty({ description: 'Phone used in request' })
	@IsString()
	@Matches(/^\+\d{6,15}$/, { message: 'Must be E.164 format' })
	phoneNumber: string

	@ApiProperty({ description: '4-digit one-time code' })
	@IsString()
	@Length(4, 4)
	@Matches(/^\d+$/, { message: 'Numeric only' })
	code: string
}

/**
 * “Me” response
 */
export class UserDto {
	@ApiProperty()
	id: number

	@ApiProperty()
	name: string

	@ApiProperty()
	phoneNumber: string

	@ApiProperty()
	carModel: string

	@ApiProperty()
	carYear: number

	@ApiProperty()
	carColor: string

	@ApiProperty()
	vinNumber: string

	@ApiProperty()
	city: string

	@ApiProperty()
	createdAt: Date

	@ApiProperty()
	updatedAt: Date
}

export class SuccessVerifyOtpResponse {
	@ApiProperty({ description: 'Success status' })
	success: boolean

	@ApiProperty({ description: 'Expiration time in seconds' })
	expiresIn: number
}
