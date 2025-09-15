// src/modules/auth/user/services/user-session.service.ts

import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PrismaService } from 'src/prisma/prisma.service'
import { JwtService } from 'src/common/services/jwt.service'
import { AppConfigService } from 'src/common/config/config.service'
import { parseExpirationDate } from 'src/common/utils/expiration.util'

@Injectable()
export class UsersSessionService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly jwtService: JwtService,
		private readonly config: AppConfigService,
	) {}

	private async linkSessionToUser(userId: number, sessionId: number): Promise<void> {
		await this.prisma.user.update({
			where: { id: userId },
			data: { session: { connect: { id: sessionId } } },
		})
	}

	/** Issue or refresh a JWT session */
	async upsertSession(userId: number): Promise<string> {
		const now = new Date()
		const expiresAt = parseExpirationDate(this.config.userJwt.expiresIn, now)
		const existing = await this.prisma.usersSession.findUnique({
			where: { userId },
		})
		const token = this.jwtService.signUser({ userId })

		if (existing) {
			const updated = await this.prisma.usersSession.update({
				where: { id: existing.id },
				data: { token, expiresAt },
			})
			await this.linkSessionToUser(userId, updated.id)
			return updated.token
		}

		const created = await this.prisma.usersSession.create({
			data: { userId, token, expiresAt },
		})
		await this.linkSessionToUser(userId, created.id)
		return created.token
	}

	/** Validate JWT + DB session */
	async validateUserSession(token: string): Promise<number> {
		let payload: { userId: number }
		try {
			payload = this.jwtService.verifyUser(token)
		} catch {
			throw new UnauthorizedException('Invalid or expired token')
		}

		const session = await this.prisma.usersSession.findFirst({
			where: { token, expiresAt: { gt: new Date() } },
		})
		if (!session) throw new UnauthorizedException('Session revoked or expired')
		return payload.userId
	}

	/** Revoke the session */
	async revokeUserSession(token: string): Promise<void> {
		await this.prisma.usersSession.deleteMany({ where: { token } })
	}
}
