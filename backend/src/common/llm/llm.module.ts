import { Module } from '@nestjs/common'
import { PromptRegistry } from './prompt.registry'
import { PromptBuilderService } from './prompt.builder'
import { LLMCarAnalysisAdapter } from '../adapters/llm-car-analysis.adapter'
import { PrismaModule } from 'src/prisma/prisma.module'
import { AppConfigModule } from '../config/config.module'

@Module({
	imports: [AppConfigModule, PrismaModule],
	providers: [PromptRegistry, PromptBuilderService, LLMCarAnalysisAdapter],
	exports: [PromptBuilderService, PromptRegistry, LLMCarAnalysisAdapter],
})
export class LlmModule {}
