import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { DevtoolsModule } from '@nestjs/devtools-integration'
import { LoggerModule } from 'nestjs-pino'

import { AppConfigModule } from './common/config/config.module'
import { PrismaModule } from './prisma/prisma.module'

import { SecurityMiddleware } from './common/middleware/security.middleware'

import { ScheduleModule } from '@nestjs/schedule'
import { BossModule } from './common/queue/boss.module'
import { AuthModule } from './modules/auth/auth.module'
import { S3Module } from './common/s3/s3.module'
import { CommonModule } from './common/common.module'
import { ImageClassificationModule } from './modules/image-classification/image-classification.module'

@Module({
	imports: [
		// Dev / logging
		DevtoolsModule.register({ http: process.env.NODE_ENV !== 'production' }),
		LoggerModule.forRoot({
			pinoHttp: {
				level: process.env.NODE_ENV !== 'production' ? 'debug' : 'info',
				transport: process.env.NODE_ENV !== 'production' ? { target: 'pino-pretty' } : undefined,
			},
		}),

		// Global config & DB
		ConfigModule.forRoot({ isGlobal: true }),
		AppConfigModule,
		ScheduleModule.forRoot(),
		BossModule,
		S3Module,
		CommonModule,
		PrismaModule,
		// authentication
		AuthModule,
		ImageClassificationModule,
	],
})
export class AppModule implements NestModule {
	configure(consumer: MiddlewareConsumer) {
		consumer.apply(SecurityMiddleware).forRoutes('*')
	}
}
