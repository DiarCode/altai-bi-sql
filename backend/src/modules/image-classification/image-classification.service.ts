import axios from 'axios'
import { AppConfigService } from 'src/common/config/config.service'
import { CarAnalysis, CarAnalysisZone, CarStatus, IMPORTANCE, URGENCY } from '@prisma/client'
import {
	ClassificationPipelineResult,
	LLMCarAnalysisResult,
	isClassificationResultValid,
	ensureZoneName,
	ensureImportance,
	ensureUrgency,
	ensureStatus,
} from './interfaces'
import { mapPipelineResultForLLM } from './utils/pipeline-llm.mapper'

import { Injectable } from '@nestjs/common'
import { S3Service } from 'src/common/s3/s3.service'
import { PrismaService } from 'src/prisma/prisma.service'
import { LLMCarAnalysisAdapter } from 'src/common/adapters/llm-car-analysis.adapter'

@Injectable()
export class ImageClassificationService {
	private readonly s3: S3Service
	constructor(
		s3: S3Service,
		private readonly config: AppConfigService,
		private readonly prisma: PrismaService,
		private readonly llmCarAnalysisAdapter: LLMCarAnalysisAdapter,
	) {
		this.s3 = s3
	}

	async uploadImageToS3(key: string, buffer: Buffer): Promise<void> {
		await this.s3.uploadImage(key, buffer, 'image/jpeg')
	}

	async callClassificationPipeline(imageBuffer: Buffer): Promise<ClassificationPipelineResult> {
		// Call external pipeline endpoint with image bytes
		const url = this.config.classificationPipelineUrl
		const response = await axios.post<ClassificationPipelineResult>(url, imageBuffer, {
			headers: { 'Content-Type': 'application/octet-stream' },
		})
		return response.data
	}

	async callClassificationPipelineMulti(
		imageBuffers: Buffer[],
	): Promise<ClassificationPipelineResult[]> {
		const results: ClassificationPipelineResult[] = []
		for (const buf of imageBuffers) {
			try {
				const single = await this.callClassificationPipeline(buf)
				if (isClassificationResultValid(single)) results.push(single)
			} catch {
				// intentionally ignore single image failure
			}
		}
		return results
	}

	async analyzeCarWithLLM(
		pipelineResult: ClassificationPipelineResult | ClassificationPipelineResult[],
		userId: number,
	): Promise<LLMCarAnalysisResult> {
		// Fetch user info
		const user = await this.prisma.user.findUnique({
			where: { id: userId },
			select: { carModel: true, carYear: true, city: true, vinNumber: true, id: true },
		})
		if (!user) throw new Error('User not found')

		// Fetch partners and services (stub, replace with real queries)
		const partners = await this.prisma.inDrivePartner.findMany({ where: { city: user.city ?? '' } })

		const carInfo = {
			carModel: user.carModel || '',
			carYear: user.carYear || 0,
			city: user.city || '',
			vin: user.vinNumber || '',
		}

		// Map pipeline result(s) for LLM
		const mappedPipelineResult = mapPipelineResultForLLM(pipelineResult)

		let llmResult = await this.llmCarAnalysisAdapter.analyze(
			mappedPipelineResult,
			userId,
			carInfo,
			partners,
		)

		// Normalize & sanitize enums
		llmResult = {
			...llmResult,
			status: ensureStatus(llmResult.status),
			zones: llmResult.zones.map(z => ({
				...z,
				name: ensureZoneName(z.name),
				aiAnalysis: {
					...z.aiAnalysis,
					importance: ensureImportance(z.aiAnalysis.importance),
					urgency: ensureUrgency(z.aiAnalysis.urgency),
					timeToFix:
						z.aiAnalysis.timeToFix && z.aiAnalysis.timeToFix.trim().length > 0
							? z.aiAnalysis.timeToFix
							: '1-2 дня',
				},
			})),
		}
		// Guarantee summary present
		if (!llmResult.summary || llmResult.summary.trim().length === 0) {
			llmResult.summary = 'Краткое резюме недоступно: повторите анализ позже.'
		}

		// Save to DB
		const created = await this.prisma.carAnalysis.create({
			data: {
				userId,
				carModel: llmResult.carModel,
				carYear: llmResult.carYear,
				city: llmResult.city,
				vin: llmResult.vin,
				totalEstimatedCost: llmResult.totalEstimatedCost,
				overallScore: llmResult.overallScore,
				status: llmResult.status as CarStatus,
				summary: llmResult.summary,
				zones: {
					create: llmResult.zones.map(z => ({
						name: z.name,
						breaking: z.breaking,
						hasRust: z.hasRust,
						isDirty: z.isDirty,
						importance: z.aiAnalysis.importance as IMPORTANCE,
						consequences: z.aiAnalysis.consequences,
						estimatedCost: z.aiAnalysis.estimatedCost,
						urgency: z.aiAnalysis.urgency as URGENCY,
						timeToFix: z.aiAnalysis.timeToFix,
					})),
				},
			},
			include: { zones: true },
		})
		return {
			...llmResult,
			id: created.id,
			createdAt: created.createdAt,
			summary: created.summary || llmResult.summary,
			zones: created.zones.map(z => ({
				name: ensureZoneName(z.name),
				breaking: z.breaking,
				hasRust: z.hasRust,
				isDirty: z.isDirty,
				aiAnalysis: {
					importance: ensureImportance(z.importance),
					consequences: z.consequences,
					estimatedCost: z.estimatedCost,
					urgency: ensureUrgency(z.urgency),
					timeToFix: z.timeToFix || '1-2 дня',
				},
			})),
		}
	}

	async getLatestAnalysis(
		userId: number,
	): Promise<(CarAnalysis & { zones: CarAnalysisZone[] }) | null> {
		return await this.prisma.carAnalysis.findFirst({
			where: { userId },
			orderBy: { createdAt: 'desc' },
			include: { zones: true },
		})
	}

	async getAllAnalyses(userId: number): Promise<Array<CarAnalysis & { zones: CarAnalysisZone[] }>> {
		return this.prisma.carAnalysis.findMany({
			where: { userId },
			orderBy: { createdAt: 'desc' },
			include: { zones: true },
		})
	}

	async getAnalysisById(
		userId: number,
		analysisId: number,
	): Promise<(CarAnalysis & { zones: CarAnalysisZone[] }) | null> {
		return this.prisma.carAnalysis.findFirst({
			where: { id: analysisId, userId },
			include: { zones: true },
		})
	}
}
