import { Module } from '@nestjs/common'
import { CommonModule } from 'src/common/common.module'
import { PrismaModule } from 'src/prisma/prisma.module'
import { AppConfigModule } from 'src/common/config/config.module'
import { UsersSessionService } from './services/users-session.service'
import { UsersAuthGuard } from 'src/common/guards/users-auth.guard'
import { UsersAuthController } from './users-auth.controller'
import { UsersOtpService } from './services/users-otp.service'
import { WhatsAppAdapter } from 'src/common/adapters/whatsapp-built-in.adapter'
import { HttpModule } from '@nestjs/axios'
import { UsersProfileService } from './services/users-profile.service'

@Module({
	imports: [PrismaModule, CommonModule, AppConfigModule, HttpModule],
	providers: [
		UsersSessionService,
		UsersAuthGuard,
		UsersOtpService,
		WhatsAppAdapter,
		UsersProfileService,
	],
	exports: [UsersSessionService, UsersAuthGuard],
	controllers: [UsersAuthController],
})
export class AuthModule {}
