import { Injectable } from '@nestjs/common'
import { Response, Request } from 'express'
import { AppConfigService } from '../config/config.service'

@Injectable()
export class CookieService {
	private readonly cookieName = 'ALTAI_SESSION'
	private readonly maxAge: number

	constructor(private readonly config: AppConfigService) {
		this.maxAge = 24 * 3600 * 1000 // 1 day
	}

	private normalizeOrigin(value: string): string {
		return value.trim().toLowerCase().replace(/\/$/, '')
	}

	private isRequestAllowed(req: Request, hostname: string | undefined): boolean {
		const allowedOrigins = (this.config.security.backendCorsOrigins || [])
			.map(s => s?.trim())
			.filter(Boolean)
			.map(s => this.normalizeOrigin(s))

		const allowedHosts = (this.config.security.allowedHosts || [])
			.map(s => s?.trim().toLowerCase())
			.filter(Boolean)

		// Host check (always required)
		if (!hostname) return false
		const hostOk = allowedHosts.includes(hostname.toLowerCase())

		// Origin check (only when Origin header is present)
		const originHeader = req.headers.origin
		if (!originHeader) {
			return hostOk
		}
		let normalizedOrigin: string | undefined
		try {
			normalizedOrigin = this.normalizeOrigin(originHeader)
		} catch {
			return false
		}
		const originOk = allowedOrigins.includes(normalizedOrigin)
		return hostOk && originOk
	}

	private resolveDomainFromRequest(req: Request): string | undefined {
		// Prefer Origin header; fall back to host derived by Express
		let hostname: string | undefined
		const origin = req.headers.origin
		if (origin) {
			try {
				hostname = new URL(origin).hostname
			} catch {
				// ignore malformed origin
			}
		}
		if (!hostname) {
			hostname = req.hostname
		}
		// For localhost or IPs, omit Domain (host-only cookie)
		if (!hostname || hostname === 'localhost' || /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) {
			return undefined
		}
		// Validate against allowlists before returning a domain
		if (!this.isRequestAllowed(req, hostname)) {
			return undefined
		}
		return hostname
	}

	setAuthCookie(req: Request, res: Response, token: string, maxAgeMs?: number) {
		const domain = this.resolveDomainFromRequest(req)
		// If domain is undefined due to disallowed origin/host or localhost/IP, we still set a host-only cookie
		res.cookie(this.cookieName, token, {
			domain,
			path: '/',
			httpOnly: true,
			secure: this.config.isProduction,
			sameSite: this.config.isProduction ? 'none' : 'lax',
			maxAge: maxAgeMs ?? this.maxAge,
		})
	}

	getAuthCookie(req: Request): string | undefined {
		const cookies = req.cookies as Record<string, unknown> | undefined
		const token = cookies ? cookies[this.cookieName] : undefined
		return typeof token === 'string' ? token : undefined
	}

	clearAuthCookie(req: Request, res: Response) {
		const domain = this.resolveDomainFromRequest(req)
		res.clearCookie(this.cookieName, {
			domain,
			path: '/',
		})
	}
}
