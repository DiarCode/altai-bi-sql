// src/modules/auth/user/utils/user.mapper.ts

import { User as PrismaUser } from '@prisma/client'
import { UserDto } from '../dtos/users-auth.dtos'

export function toUserDto(raw: PrismaUser): UserDto {
	return {
		id: raw.id,
		name: raw.name,
		phoneNumber: raw.phoneNumber,
		carModel: raw.carModel ?? '',
		carYear: raw.carYear ?? 0,
		carColor: raw.carColor ?? '',
		vinNumber: raw.vinNumber ?? '',
		city: raw.city ?? '',
		createdAt: raw.createdAt,
		updatedAt: raw.updatedAt,
	}
}
