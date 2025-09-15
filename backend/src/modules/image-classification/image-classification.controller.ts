import {
	Get,
	NotFoundException,
	Controller,
	Post,
	UploadedFiles,
	UseInterceptors,
	BadRequestException,
	UseGuards,
} from '@nestjs/common'
import { FileFieldsInterceptor } from '@nestjs/platform-express'
import { CarAnalysisDto } from './dtos/car-analysis.dto'
import { CarAnalysisMapper } from './utils/car-analysis.mapper'
import { ImageClassificationService } from './image-classification.service'
import { GetCurrentUser } from 'src/common/decorators/get-current-users.decorator'
import { UserClaims } from 'src/common/types/user-request.interface'
import {
	isClassificationResultValid,
	isLLMCarAnalysisResultValid,
	isMultiClassificationResultValid,
	ClassificationPipelineResult,
} from './interfaces'
import { UsersAuthGuard } from 'src/common/guards/users-auth.guard'
import { Param } from '@nestjs/common'

@UseGuards(UsersAuthGuard)
@Controller('image-classification')
export class ImageClassificationController {
	private readonly service: ImageClassificationService

	constructor(service: ImageClassificationService) {
		this.service = service
	}

	/**
	 * Accepts a car photo (bytes), calls classification pipeline, and returns LLM analysis.
	 */
	@Post('analyze-car')
	@UseInterceptors(
		FileFieldsInterceptor([
			{ name: 'front', maxCount: 1 },
			{ name: 'back', maxCount: 1 },
			{ name: 'left', maxCount: 1 },
			{ name: 'right', maxCount: 1 },
		]),
	)
	async analyzeCar(
		@UploadedFiles()
		files: {
			front?: Express.Multer.File[]
			back?: Express.Multer.File[]
			left?: Express.Multer.File[]
			right?: Express.Multer.File[]
		},
		@GetCurrentUser() user: UserClaims,
	): Promise<CarAnalysisDto> {
		const orderedKeys: (keyof typeof files)[] = ['front', 'back', 'left', 'right']
		const present: Express.Multer.File[] = []
		for (const k of orderedKeys) {
			const arr = files[k]
			if (arr && arr.length > 0) present.push(arr[0])
		}
		if (present.length === 0) {
			throw new BadRequestException('At least one of front/back/left/right images is required')
		}
		const buffers = present.map(f => f.buffer).filter(Boolean)
		let pipelineResult: ClassificationPipelineResult | ClassificationPipelineResult[]
		if (buffers.length === 1) {
			const single = await this.service.callClassificationPipeline(buffers[0])
			if (!isClassificationResultValid(single)) {
				throw new BadRequestException('Invalid classification pipeline result')
			}
			pipelineResult = single
		} else {
			const multi = await this.service.callClassificationPipelineMulti(buffers)
			if (!isMultiClassificationResultValid(multi) || multi.length !== buffers.length) {
				throw new BadRequestException('Failed to classify all images')
			}
			pipelineResult = multi
		}
		const llmResult = await this.service.analyzeCarWithLLM(pipelineResult, user.id)
		if (!isLLMCarAnalysisResultValid(llmResult)) {
			throw new BadRequestException('Invalid LLM analysis result')
		}
		// Fetch created record with zones to map using existing logic
		const created = await this.service.getAnalysisById(user.id, llmResult.id)
		if (!created) throw new NotFoundException('Analysis not found after creation')
		return CarAnalysisMapper.toDto(created)
	}

	@Get('latest')
	async getLatestAnalysis(@GetCurrentUser() user: UserClaims): Promise<CarAnalysisDto> {
		const analysis = await this.service.getLatestAnalysis(user.id)
		if (!analysis) throw new NotFoundException('No analysis found')
		return CarAnalysisMapper.toDto(analysis)
	}

	@Get('analyses')
	async getAnalyses(@GetCurrentUser() user: UserClaims): Promise<CarAnalysisDto[]> {
		const list = await this.service.getAllAnalyses(user.id)
		return list.map(a => CarAnalysisMapper.toDto(a))
	}

	@Get('analyses/:id')
	async getAnalysisById(
		@GetCurrentUser() user: UserClaims,
		@Param('id') id: string,
	): Promise<CarAnalysisDto> {
		const analysisId = Number(id)
		if (Number.isNaN(analysisId)) throw new BadRequestException('Invalid id')
		const analysis = await this.service.getAnalysisById(user.id, analysisId)
		if (!analysis) throw new NotFoundException('Analysis not found')
		return CarAnalysisMapper.toDto(analysis)
	}
}
