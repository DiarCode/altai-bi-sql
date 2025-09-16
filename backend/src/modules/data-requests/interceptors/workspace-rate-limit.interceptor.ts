import {
	CallHandler,
	ExecutionContext,
	Injectable,
	NestInterceptor,
	BadRequestException,
} from '@nestjs/common'
import { Observable } from 'rxjs'

@Injectable()
export class WorkspaceRateLimitInterceptor implements NestInterceptor {
	private readonly limit: number
	private readonly windowMs: number
	private readonly state = new Map<number, { count: number; windowStart: number }>()

	constructor(limit = 30, windowMs = 60_000) {
		this.limit = limit
		this.windowMs = windowMs
	}

	intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
		const req = context
			.switchToHttp()
			.getRequest<{ params: { workspaceId?: string; id?: string } }>()
		const wsId = Number(req.params.workspaceId || req.params.id)
		if (!Number.isFinite(wsId)) return next.handle()

		const now = Date.now()
		const entry = this.state.get(wsId) || { count: 0, windowStart: now }
		if (now - entry.windowStart >= this.windowMs) {
			entry.windowStart = now
			entry.count = 0
		}
		entry.count += 1
		this.state.set(wsId, entry)
		if (entry.count > this.limit) {
			throw new BadRequestException('Rate limit exceeded for this workspace')
		}
		return next.handle()
	}
}
