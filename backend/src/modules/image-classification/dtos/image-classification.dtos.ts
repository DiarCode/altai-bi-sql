import { IsString } from 'class-validator'

export class ClassifyImageDto {
	@IsString()
	angle: string
}
