// src/modules/auth/user/services/user-profile.service.ts

import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common'
import { PrismaService } from 'src/prisma/prisma.service'
import { SignUpDto, UserDto } from '../dtos/users-auth.dtos'
import { toUserDto } from '../utils/users.mapper'
import { WORKSPACE_PURPOSE } from '@prisma/client'

@Injectable()
export class UsersProfileService {
	constructor(private readonly prisma: PrismaService) {}

	async signUp(dto: SignUpDto): Promise<void> {
		await this.prisma.user.create({
			data: {
				phoneNumber: dto.phoneNumber,
				fullName: dto.fullName,
			},
		})

		await this.prisma.workspace.create({
			data: {
				name: `${dto.fullName}'s Workspace`,
				description: 'Personal workspace',
				purpose: WORKSPACE_PURPOSE.DEFAULT,
				owner: { connect: { phoneNumber: dto.phoneNumber } },
			},
		})
	}

	/** Find user by phone (for OTP verify) */
	async findByPhone(phone: string): Promise<{ id: number }> {
		const user = await this.prisma.user.findUnique({
			where: { phoneNumber: phone },
			select: { id: true },
		})
		if (!user) throw new UnauthorizedException('No such user')
		return user
	}

	/** “Me” endpoint */
	async getById(userId: number): Promise<UserDto> {
		const raw = await this.prisma.user.findUnique({
			where: { id: userId },
			include: { workspaces: true },
		})

		if (!raw) {
			throw new NotFoundException(`User #${userId} not found`)
		}

		return toUserDto(raw)
	}
}
