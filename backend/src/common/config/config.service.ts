import { Injectable } from '@nestjs/common'
import { ConfigService as NestConfigService } from '@nestjs/config'

export interface DatabaseConfig {
	url: string
}
export interface JwtConfig {
	secret: string
	expiresIn: string
}
export interface ClientConfig {
	url: string
	cookieDomain: string
}
export interface WhatsappConfig {
	version: string
	phoneId: string
	accessToken: string
}
export interface OpenAIConfig {
	apiKey: string
	model: string // chat/completions
	maxTokens: number
}

export interface SecurityConfig {
	backendCorsOrigins: string[]
	allowedHosts: string[]
}

export interface S3Config {
	accessEndpoint: string
	responseEndpoint: string
	region: string
	accessKeyId: string
	secretAccessKey: string
	bucket: string
	imagePrefix: string // e.g. “images/”
	audioPrefix: string // e.g. “audio/”
	usePathStyle: boolean
}

export interface ClassificationPipelineUrl {
	classificationPipelineUrl: string
}

@Injectable()
export class AppConfigService {
	constructor(private readonly config: NestConfigService) {}

	private get<T = string>(key: string, defaultValue?: T): T {
		return defaultValue !== undefined
			? this.config.get<T>(key, defaultValue)
			: this.config.get<T>(key)!
	}

	get database(): DatabaseConfig {
		return {
			url: this.get<string>('DATABASE_URL'),
		}
	}

	// Separate JWT for users
	get userJwt(): JwtConfig {
		return {
			secret: this.get<string>('USER_JWT_SECRET', 'changeme'),
			expiresIn: this.get<string>('USER_JWT_EXPIRATION', '720h'),
		}
	}

	get client(): ClientConfig {
		const url = this.get<string>('CLIENT_URL', 'http://localhost:3000')
		return {
			url,
			cookieDomain: new URL(url).hostname,
		}
	}

	get whatsapp(): WhatsappConfig {
		return {
			version: this.get<string>('WHATSAPP_API_VERSION'),
			phoneId: this.get<string>('WHATSAPP_PHONE_NUMBER_ID'),
			accessToken: this.get<string>('WHATSAPP_ACCESS_TOKEN'),
		}
	}

	get openai(): OpenAIConfig {
		return {
			apiKey: this.get<string>('OPENAI_API_KEY'),
			model: this.get<string>('OPENAI_MODEL', 'gpt-4.1-2025-04-14'),
			maxTokens: this.get<number>('OPENAI_MAX_TOKENS', 1000),
		}
	}

	get s3(): S3Config {
		return {
			accessEndpoint: this.get<string>('S3_ACCESS_ENDPOINT', 'http://localhost:9000'),
			responseEndpoint: this.get<string>('S3_RESPONSE_ENDPOINT', 'http://localhost:9000'),
			region: this.get<string>('S3_REGION', 'ap-northeast-2'),
			accessKeyId: this.get<string>('S3_ACCESS_KEY', 'minio'),
			secretAccessKey: this.get<string>('S3_SECRET_KEY', 'minio123'),
			bucket: this.get<string>('S3_BUCKET', 'altai-carscan-media'),
			imagePrefix: this.get<string>('S3_IMAGE_PREFIX', 'images'),
			audioPrefix: this.get<string>('S3_AUDIO_PREFIX', 'audio'),
			usePathStyle: this.get<boolean>('S3_PATH_STYLE', true),
		}
	}

	get classificationPipelineUrl(): string {
		return this.get<string>(
			'CLASSIFICATION_PIPELINE_URL',
			'https://maulerrr--indrive-quality-analyze-bytes.modal.run',
		)
	}

	get nodeEnv(): string {
		return this.get<string>('NODE_ENV', 'development')
	}
	get isProduction(): boolean {
		return this.nodeEnv === 'production'
	}

	get security(): SecurityConfig {
		return {
			backendCorsOrigins: this.get<string>('SECURITY_BACKEND_CORS_ORIGINS', '').split(','),
			allowedHosts: this.get<string>('SECURITY_ALLOWED_HOSTS', '').split(','),
		}
	}
}
