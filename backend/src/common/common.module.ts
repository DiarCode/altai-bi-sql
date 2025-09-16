import { Module } from '@nestjs/common'
import { AppConfigModule } from './config/config.module'
import { JwtService } from './services/jwt.service'
import { CookieService } from './services/cookie.service'
import { MediaUrlService } from './services/media-url.service'
import { EncryptionService } from './services/encryption.service'

@Module({
	imports: [AppConfigModule],
	providers: [JwtService, CookieService, MediaUrlService, EncryptionService],
	exports: [JwtService, CookieService, MediaUrlService, EncryptionService],
})
export class CommonModule {}
