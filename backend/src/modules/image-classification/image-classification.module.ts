import { Module } from '@nestjs/common'
import { ImageClassificationController } from './image-classification.controller'
import { ImageClassificationService } from './image-classification.service'
import { S3Module } from 'src/common/s3/s3.module'
import { LlmModule } from 'src/common/llm/llm.module'
import { PrismaModule } from 'src/prisma/prisma.module'
import { AppConfigModule } from 'src/common/config/config.module'
import { CommonModule } from 'src/common/common.module'
import { AuthModule } from '../auth/auth.module'

@Module({
	imports: [AppConfigModule, CommonModule, S3Module, LlmModule, PrismaModule, AuthModule],
	controllers: [ImageClassificationController],
	providers: [ImageClassificationService],
})
export class ImageClassificationModule {}
