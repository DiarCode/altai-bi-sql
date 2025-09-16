import {
	Body,
	Controller,
	Get,
	Param,
	ParseIntPipe,
	Post,
	UseGuards,
	UseInterceptors,
} from '@nestjs/common'
import { ApiResponse, ApiTags } from '@nestjs/swagger'
import { GetCurrentUser } from 'src/common/decorators/get-current-users.decorator'
import { UserClaims } from 'src/common/types/user-request.interface'
import { CreateDataRequestDto, DataRequestResultDto } from './dtos/data-requests.dto'
import { DataRequestsService } from './services/data-requests.service'
import { WorkspaceRateLimitInterceptor } from './interceptors/workspace-rate-limit.interceptor'
import { UsersAuthGuard } from 'src/common/guards/users-auth.guard'

@ApiTags('data-requests')
@Controller('workspaces/:workspaceId/requests')
@UseGuards(UsersAuthGuard)
@UseInterceptors(new WorkspaceRateLimitInterceptor(30, 60_000))
export class DataRequestsController {
	constructor(private readonly service: DataRequestsService) {}

	@Post()
	@ApiResponse({ status: 202, description: 'Request accepted', type: DataRequestResultDto })
	async create(
		@GetCurrentUser() user: UserClaims,
		@Param('workspaceId', ParseIntPipe) workspaceId: number,
		@Body() dto: CreateDataRequestDto,
	): Promise<DataRequestResultDto> {
		return this.service.createAndExecute(user.id, workspaceId, dto.prompt)
	}

	@Get('latest')
	@ApiResponse({ status: 200, description: 'Latest request', type: DataRequestResultDto })
	async getLatest(
		@GetCurrentUser() user: UserClaims,
		@Param('workspaceId', ParseIntPipe) workspaceId: number,
	): Promise<DataRequestResultDto> {
		return this.service.getLatest(user.id, workspaceId)
	}

	@Get(':id')
	@ApiResponse({ status: 200, description: 'Request status/result', type: DataRequestResultDto })
	async getOne(
		@GetCurrentUser() user: UserClaims,
		@Param('workspaceId', ParseIntPipe) workspaceId: number,
		@Param('id', ParseIntPipe) id: number,
	): Promise<DataRequestResultDto> {
		return this.service.getOne(user.id, workspaceId, id)
	}

	@Get()
	@ApiResponse({ status: 200, description: 'List recent requests', type: [DataRequestResultDto] })
	async getAll(
		@GetCurrentUser() user: UserClaims,
		@Param('workspaceId', ParseIntPipe) workspaceId: number,
	): Promise<DataRequestResultDto[]> {
		return this.service.getAll(user.id, workspaceId)
	}
}
