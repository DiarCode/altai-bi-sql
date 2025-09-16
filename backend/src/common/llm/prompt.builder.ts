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

	buildSqlPrompt(prompt: string, metadata: unknown, foreignKeys: unknown): BuiltPrompt {
		const tpl = this.registry.get('sql-generate')
		const user = tpl.user
			.replace(/{{prompt}}/g, prompt)
			.replace(/{{metadata}}/g, JSON.stringify(metadata, null, 2))
			.replace(/{{foreignKeys}}/g, JSON.stringify(foreignKeys, null, 2))
		return {
			messages: [
				{ role: 'system', content: tpl.system.trim() },
				{ role: 'user', content: user.trim() },
			],
			maxTokens: tpl.maxTokens,
		}
	}

	buildResultTextPrompt(rows: unknown[]): BuiltPrompt {
		const tpl = this.registry.get('result-text')
		const user = tpl.user.replace(/{{rows}}/g, JSON.stringify(rows, null, 2))
		return {
			messages: [
				{ role: 'system', content: tpl.system.trim() },
				{ role: 'user', content: user.trim() },
			],
			maxTokens: tpl.maxTokens,
		}
	}

	buildGraphConfigPrompt(rows: unknown[]): BuiltPrompt {
		const tpl = this.registry.get('graph-config')
		const user = tpl.user.replace(/{{rows}}/g, JSON.stringify(rows, null, 2))
		return {
			messages: [
				{ role: 'system', content: tpl.system.trim() },
				{ role: 'user', content: user.trim() },
			],
			maxTokens: tpl.maxTokens,
		}
	}

	buildBusinessNamesPrompt(
		schema: string,
		table: string,
		columns: Array<{
			columnName: string
			dataType: string
			isPrimaryKey?: boolean
			isForeignKey?: boolean
			isNullable?: boolean
		}>,
	): BuiltPrompt {
		const tpl = this.registry.get('business-names')
		const user = tpl.user
			.replace(/{{schema}}/g, schema)
			.replace(/{{table}}/g, table)
			.replace(/{{columns}}/g, JSON.stringify(columns, null, 2))
		return {
			messages: [
				{ role: 'system', content: tpl.system.trim() },
				{ role: 'user', content: user.trim() },
			],
			maxTokens: tpl.maxTokens,
		}
	}

	buildSqlRepairPrompt(
		originalPrompt: string,
		previousSql: string,
		dbError: string,
		metadata: unknown,
		foreignKeys: unknown,
	): BuiltPrompt {
		const tpl = this.registry.get('sql-repair')
		const user = tpl.user
			.replace(/{{prompt}}/g, originalPrompt)
			.replace(/{{previousSql}}/g, previousSql)
			.replace(/{{dbError}}/g, dbError)
			.replace(/{{metadata}}/g, JSON.stringify(metadata, null, 2))
			.replace(/{{foreignKeys}}/g, JSON.stringify(foreignKeys, null, 2))
		return {
			messages: [
				{ role: 'system', content: tpl.system.trim() },
				{ role: 'user', content: user.trim() },
			],
			maxTokens: tpl.maxTokens,
		}
	}
}
