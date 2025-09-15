import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common'
import { UsersSessionService } from 'src/modules/auth/services/users-session.service'
import { CookieService } from '../services/cookie.service'
import { PrismaService } from 'src/prisma/prisma.service'
import { UserRequest } from '../types/user-request.interface'

@Injectable()
export class UsersAuthGuard implements CanActivate {
	constructor(
		private readonly sessions: UsersSessionService,
		private readonly cookieService: CookieService,
		private readonly prisma: PrismaService,
	) {}

	async canActivate(ctx: ExecutionContext): Promise<boolean> {
		const req = ctx.switchToHttp().getRequest<UserRequest>()
		const token = this.cookieService.getAuthCookie(req)
		if (!token) throw new UnauthorizedException('Authentication token missing')

		const userId = await this.sessions.validateUserSession(token)

		if (!userId) {
			throw new UnauthorizedException('Learner not found')
		}

		req.user = {
			id: userId,
		}

		return true
	}
}
