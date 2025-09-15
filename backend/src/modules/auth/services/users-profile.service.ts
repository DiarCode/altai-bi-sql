// src/modules/auth/user/services/user-profile.service.ts

import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common'
import { PrismaService } from 'src/prisma/prisma.service'
import { SignUpDto, UserDto } from '../dtos/users-auth.dtos'
import { toUserDto } from '../utils/users.mapper'

@Injectable()
export class UsersProfileService {
	constructor(private readonly prisma: PrismaService) {}

	async signUp(dto: SignUpDto): Promise<void> {
		await this.prisma.user.create({
			data: {
				phoneNumber: dto.phoneNumber,
				name: dto.name,
				city: dto.city,
				carModel: dto.carModel,
				carYear: dto.carYear,
				carColor: dto.carColor,
				vinNumber: dto.vinNumber,
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
		})

		if (!raw) {
			throw new NotFoundException(`User #${userId} not found`)
		}

		return toUserDto(raw)
	}
}
