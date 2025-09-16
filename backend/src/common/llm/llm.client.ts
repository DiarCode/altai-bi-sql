import { Injectable } from '@nestjs/common'
import { AppConfigService } from '../config/config.service'

export interface LlmMessage {
	role: string
	content: string
	name?: string
}

export interface LlmCompletionRequest {
	model: string
	messages: LlmMessage[]
	max_completion_tokens?: number
	temperature?: number
	stream?: boolean
	response_format?: {
		type: 'text' | 'json_object' | 'json_schema'
		json_schema?: unknown
		strict?: boolean
	}
}

export interface LlmCompletionChoice {
	message?: { content?: string }
	text?: string
}

export interface LlmCompletionResponse {
	id?: string
	choices?: LlmCompletionChoice[]
	output_text?: string
}

@Injectable()
export class LlmClientService {
	private readonly baseUrl: string

	constructor(private readonly config: AppConfigService) {
		this.baseUrl = this.config.LLM.baseUrl
	}

	async completions(req: LlmCompletionRequest, retries = 2): Promise<LlmCompletionResponse> {
		const url = `${this.baseUrl}/v1/completions`
		const body = {
			model: req.model || this.config.LLM.model,
			messages: req.messages,
			max_completion_tokens: req.max_completion_tokens ?? this.config.LLM.maxTokens,
			temperature: req.temperature ?? 0,
			stream: req.stream ?? false,
			response_format: req.response_format ?? { type: 'text' },
		}

		for (let attempt = 0; attempt <= retries; attempt++) {
			try {
				const res = await fetch(url, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(body),
				})
				if (!res.ok) throw new Error(`LLM HTTP ${res.status}`)
				const json = (await res.json()) as LlmCompletionResponse
				return json
			} catch (err) {
				if (attempt === retries) throw err
				await new Promise(r => setTimeout(r, 500 * (attempt + 1)))
			}
		}
		throw new Error('LLM request failed')
	}

	static firstText(resp: LlmCompletionResponse): string | undefined {
		if (resp.output_text) return resp.output_text
		const c = resp.choices?.[0]
		return c?.message?.content || c?.text
	}
}
