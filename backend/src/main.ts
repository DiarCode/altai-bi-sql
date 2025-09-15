import 'module-alias/register'

import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import morgan from 'morgan'
import { Logger } from 'nestjs-pino'
import { AppModule } from './app.module'
import { AppConfigService } from './common/config/config.service'

async function bootstrap() {
	const app = await NestFactory.create(AppModule)
	app.setGlobalPrefix('api/v1')

	app.use(cookieParser())

	const config = new DocumentBuilder()
		.setTitle('altai-carscan API')
		.setDescription('altai-carscan API Documentation')
		.setVersion('1.0')
		.addTag('altai-carscan')
		.build()
	const documentFactory = () => SwaggerModule.createDocument(app, config)
	SwaggerModule.setup('api', app, documentFactory)

	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true,
			forbidNonWhitelisted: true,
			transform: true,
			transformOptions: {
				enableImplicitConversion: true,
			},
		}),
	)

	app.useLogger(app.get(Logger))
	app.use(morgan('dev'))

	// The SecurityMiddleware handles CORS and Host header validation
	app.enableCors({
		origin: app.get(AppConfigService).security.backendCorsOrigins,
		methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
		credentials: true,
	})
	app.use(helmet())

	await app.listen(process.env.SERVER_PORT ?? 8080)
}

void bootstrap()
