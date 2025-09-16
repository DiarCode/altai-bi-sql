import { Module } from '@nestjs/common'
import { PromptRegistry } from './prompt.registry'
import { PromptBuilderService } from './prompt.builder'
import { PrismaModule } from 'src/prisma/prisma.module'
import { AppConfigModule } from '../config/config.module'
import { LlmClientService } from './llm.client'

@Module({
	imports: [AppConfigModule, PrismaModule],
	providers: [PromptRegistry, PromptBuilderService, LlmClientService],
	exports: [PromptBuilderService, PromptRegistry, LlmClientService],
})
export class LlmModule {}
