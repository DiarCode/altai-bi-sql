// src/modules/auth/user/utils/user.mapper.ts

import { User as PrismaUser, WORKSPACE_PURPOSE } from '@prisma/client'
import { UserDto } from '../dtos/users-auth.dtos'
import { toBaseWorkspaces } from 'src/modules/workspaces/utils/workspaces.mapper'

export type UserWithWorkspaces = PrismaUser & {
	workspaces: {
		id: number
		name: string
		createdAt: Date
		updatedAt: Date
		description: string
		purpose: WORKSPACE_PURPOSE
		ownerId: number
	}[]
}

export function toUserDto(raw: UserWithWorkspaces): UserDto {
	return {
		id: raw.id,
		fullName: raw.fullName,
		phoneNumber: raw.phoneNumber,
		createdAt: raw.createdAt,
		updatedAt: raw.updatedAt,
		workspaces: toBaseWorkspaces(raw.workspaces),
	}
}
