// src/common/services/encryption.service.ts

import { Injectable } from '@nestjs/common'
import * as crypto from 'crypto'
import { AppConfigService } from '../config/config.service'

@Injectable()
export class EncryptionService {
	private readonly algorithm = 'aes-256-cbc'
	private readonly key: Buffer
	private readonly config: AppConfigService

	constructor(config: AppConfigService) {
		this.config = config
		const secret = this.config.encryption.key || 'default-encryption-key-change-in-prod'
		this.key = crypto.scryptSync(secret, 'salt', 32)
	}

	encrypt(text: string): string {
		const iv = crypto.randomBytes(16)
		const cipher = crypto.createCipheriv(this.algorithm, this.key, iv)
		let encrypted = cipher.update(text, 'utf8', 'hex')
		encrypted += cipher.final('hex')
		return iv.toString('hex') + ':' + encrypted
	}

	decrypt(encryptedText: string): string {
		const parts = encryptedText.split(':')
		const iv = Buffer.from(parts.shift()!, 'hex')
		const encrypted = parts.join(':')
		const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv)
		let decrypted = decipher.update(encrypted, 'hex', 'utf8')
		decrypted += decipher.final('utf8')
		return decrypted
	}
}
