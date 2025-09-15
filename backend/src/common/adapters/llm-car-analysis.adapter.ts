import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common'
import { OpenAI } from 'openai'
import {
	LLMCarAnalysisResult,
	isLLMCarAnalysisResultValid,
} from 'src/modules/image-classification/interfaces'
import { PromptBuilderService } from '../llm/prompt.builder'
import { AppConfigService } from '../config/config.service'

@Injectable()
export class LLMCarAnalysisAdapter {
	private static readonly MAX_RETRIES = 3
	private readonly logger = new Logger(LLMCarAnalysisAdapter.name)
	private readonly client: OpenAI

	constructor(
		private readonly config: AppConfigService,
		private readonly promptBuilder: PromptBuilderService,
	) {
		this.client = new OpenAI({ apiKey: this.config.openai.apiKey })
	}

	async analyze(
		mappedPipelineResult: Record<string, any>,
		userId: number,
		carInfo: { carModel: string; carYear: number; city: string; vin: string },
		partners: any[],
	): Promise<LLMCarAnalysisResult> {
		const { messages, maxTokens } = this.promptBuilder.buildCarAnalysisPrompt(
			mappedPipelineResult,
			carInfo,
			partners,
		)

		let lastError: unknown
		for (let attempt = 1; attempt <= LLMCarAnalysisAdapter.MAX_RETRIES; attempt++) {
			try {
				const res = await this.client.chat.completions.create({
					model: this.config.openai.model,
					max_tokens: maxTokens,
					messages,
				})
				const text = res.choices[0]?.message?.content ?? '{}'
				this.logger.debug(`Attempt ${attempt}: LLM response text: ${text}`)

				const parsed = JSON.parse(text) as unknown
				if (isLLMCarAnalysisResultValid(parsed)) {
					return parsed
				}

				this.logger.warn(
					`Attempt ${attempt}: AI returned malformed analyze output, retrying...`,
					parsed,
				)
			} catch (err) {
				lastError = err
				this.logger.error(`Attempt ${attempt}: Error calling LLM for car analysis: ${err}`)
			}
		}

		this.logger.error('All retries failed for LLM car analysis', lastError)
		throw new InternalServerErrorException('Failed to analyze car with LLM')
	}
}
