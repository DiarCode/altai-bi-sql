import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString, MaxLength } from 'class-validator'

export class CreateDataRequestDto {
	@ApiProperty()
	@IsString()
	@IsNotEmpty()
	@MaxLength(1000)
	prompt: string
}

export class DataRequestResultDto {
	@ApiProperty()
	requestId: number

	@ApiProperty()
	status: string

	@ApiProperty({ required: false })
	responseId?: string

	@ApiProperty({ required: false })
	sqlScript?: string

	@ApiProperty({ required: false })
	resultText?: string

	@ApiProperty({ required: false, type: Object })
	resultTable?: Record<string, unknown[]>

	@ApiProperty({ required: false, type: Object })
	graphConfig?: unknown
}
