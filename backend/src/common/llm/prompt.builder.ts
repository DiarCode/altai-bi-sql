import { Injectable } from '@nestjs/common'
import { PrismaService } from 'src/prisma/prisma.service'
import { PromptRegistry } from './prompt.registry'

export interface BuiltPrompt {
	messages: { role: 'system' | 'user'; content: string }[]
	maxTokens?: number
}

@Injectable()
export class PromptBuilderService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly registry: PromptRegistry,
	) {}

	buildCarAnalysisPrompt(pipelineResult: any, carInfo: any, partners: any[]): BuiltPrompt {
		const tpl = this.registry.get('car-analysis')

		let user = tpl.user
		user = user.replace(/{{carInfo}}/g, JSON.stringify(carInfo))
		user = user.replace(/{{partners}}/g, JSON.stringify(partners))
		user = user.replace(/{{pipelineResult}}/g, JSON.stringify(pipelineResult))

		return {
			messages: [
				{ role: 'system', content: tpl.system.trim() },
				{ role: 'user', content: user.trim() },
			],
			maxTokens: tpl.maxTokens,
		}
	}
}
