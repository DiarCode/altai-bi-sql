import { Module } from '@nestjs/common'
import { AppConfigModule } from './config/config.module'
import { JwtService } from './services/jwt.service'
import { CookieService } from './services/cookie.service'
import { MediaUrlService } from './services/media-url.service'

@Module({
	imports: [AppConfigModule],
	providers: [JwtService, CookieService, MediaUrlService],
	exports: [JwtService, CookieService, MediaUrlService],
})
export class CommonModule {}
