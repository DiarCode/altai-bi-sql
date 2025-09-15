import { Injectable, UnauthorizedException } from '@nestjs/common'
import { sign, verify, JwtPayload, SignOptions } from 'jsonwebtoken'
import { AppConfigService } from '../config/config.service'

export interface UserJwtPayload extends JwtPayload {
	userId: number
}

@Injectable()
export class JwtService {
	constructor(private readonly config: AppConfigService) {}

	signUser(payload: UserJwtPayload, overrideExp?: string): string {
		const secret = this.config.userJwt.secret
		if (!secret) {
			throw new UnauthorizedException('Learner JWT secret is not configured')
		}

		const rawExpires: string = overrideExp ?? this.config.userJwt.expiresIn
		const expiresIn = rawExpires as SignOptions['expiresIn']
		const options: SignOptions = { expiresIn }

		return sign(payload, secret, options)
	}

	verifyUser(token: string): UserJwtPayload {
		const secret = this.config.userJwt.secret
		if (!secret) {
			throw new UnauthorizedException('Learner JWT secret is not configured')
		}

		try {
			const raw = verify(token, secret)
			if (typeof raw === 'string') {
				throw new UnauthorizedException('Invalid user token payload')
			}
			if (typeof raw === 'object' && raw !== null && typeof raw.userId === 'number') {
				return { userId: raw.userId }
			}
			throw new UnauthorizedException('Invalid user token payload')
		} catch {
			throw new UnauthorizedException('Invalid or expired user token')
		}
	}
}
