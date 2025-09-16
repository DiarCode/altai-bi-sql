// src/modules/workspaces/workspaces.controller.ts

import {
	Controller,
	Get,
	Post,
	Put,
	Delete,
	Body,
	Param,
	ParseIntPipe,
	UseGuards,
} from '@nestjs/common'
import { ApiResponse, ApiTags } from '@nestjs/swagger'
import { GetCurrentUser } from 'src/common/decorators/get-current-users.decorator'
import { UserClaims } from 'src/common/types/user-request.interface'
import { WorkspacesService } from './services/workspaces.service'
import {
	CreateWorkspaceDto,
	UpdateWorkspaceDto,
	UpsertDataSourceDto,
	WorkspaceDto,
} from './dtos/workspaces.dtos'
import {
	BusinessMetadataDto,
	UpdateTableBusinessDto,
	UpdateColumnBusinessDto,
} from './dtos/workspaces.dtos'
import { UsersAuthGuard } from 'src/common/guards/users-auth.guard'

@ApiTags('workspaces')
@UseGuards(UsersAuthGuard)
@Controller('workspaces')
export class WorkspacesController {
	constructor(private readonly workspacesService: WorkspacesService) {}

	@Get()
	@ApiResponse({
		status: 200,
		description: 'List of user workspaces',
		type: [WorkspaceDto],
	})
	async getAllWorkspaces(@GetCurrentUser() user: UserClaims): Promise<WorkspaceDto[]> {
		return this.workspacesService.getAllWorkspaces(user.id)
	}

	@Post()
	@ApiResponse({
		status: 201,
		description: 'Workspace created successfully',
		type: WorkspaceDto,
	})
	async createWorkspace(
		@GetCurrentUser() user: UserClaims,
		@Body() dto: CreateWorkspaceDto,
	): Promise<WorkspaceDto> {
		return this.workspacesService.createWorkspace(user.id, dto)
	}

	@Get(':id')
	@ApiResponse({
		status: 200,
		description: 'Workspace details',
		type: WorkspaceDto,
	})
	async getWorkspaceById(
		@GetCurrentUser() user: UserClaims,
		@Param('id', ParseIntPipe) id: number,
	): Promise<WorkspaceDto> {
		return this.workspacesService.getWorkspaceById(id, user.id)
	}

	@Put(':id')
	@ApiResponse({
		status: 200,
		description: 'Workspace updated successfully',
		type: WorkspaceDto,
	})
	async updateWorkspace(
		@GetCurrentUser() user: UserClaims,
		@Param('id', ParseIntPipe) id: number,
		@Body() dto: UpdateWorkspaceDto,
	): Promise<WorkspaceDto> {
		return this.workspacesService.updateWorkspace(id, user.id, dto)
	}

	@Delete(':id')
	@ApiResponse({
		status: 204,
		description: 'Workspace deleted successfully',
	})
	async deleteWorkspace(
		@GetCurrentUser() user: UserClaims,
		@Param('id', ParseIntPipe) id: number,
	): Promise<void> {
		return this.workspacesService.deleteWorkspace(id, user.id)
	}

	@Put(':id/config')
	@ApiResponse({
		status: 200,
		description: 'Data source config updated successfully',
	})
	async upsertDataSource(
		@GetCurrentUser() user: UserClaims,
		@Param('id', ParseIntPipe) id: number,
		@Body() dto: UpsertDataSourceDto,
	): Promise<void> {
		return this.workspacesService.upsertDataSource(id, user.id, dto)
	}

	@Post(':id/ingest')
	@ApiResponse({ status: 202, description: 'Metadata ingestion started' })
	async startIngestion(
		@GetCurrentUser() user: UserClaims,
		@Param('id', ParseIntPipe) id: number,
	): Promise<{ ingestionId: number }> {
		return this.workspacesService.startIngestion(id, user.id)
	}

	@Get(':id/ingest/latest')
	@ApiResponse({ status: 200, description: 'Latest ingestion status' })
	async getLatestIngestion(
		@GetCurrentUser() user: UserClaims,
		@Param('id', ParseIntPipe) id: number,
	) {
		return this.workspacesService.getLatestIngestion(id, user.id)
	}

	// Business metadata endpoints
	@Get(':id/metadata')
	@ApiResponse({ status: 200, description: 'Business metadata', type: BusinessMetadataDto })
	async getBusinessMetadata(
		@GetCurrentUser() user: UserClaims,
		@Param('id', ParseIntPipe) id: number,
	): Promise<BusinessMetadataDto> {
		return this.workspacesService.getBusinessMetadata(id, user.id)
	}

	@Put(':id/metadata/tables/:tableId')
	@ApiResponse({ status: 204, description: 'Table business metadata updated' })
	async updateTableBusiness(
		@GetCurrentUser() user: UserClaims,
		@Param('id', ParseIntPipe) id: number,
		@Param('tableId', ParseIntPipe) tableId: number,
		@Body() dto: UpdateTableBusinessDto,
	): Promise<void> {
		await this.workspacesService.updateTableBusiness(id, user.id, tableId, dto)
	}

	@Put(':id/metadata/tables/:tableId/columns/:columnId')
	@ApiResponse({ status: 204, description: 'Column business metadata updated' })
	async updateColumnBusiness(
		@GetCurrentUser() user: UserClaims,
		@Param('id', ParseIntPipe) id: number,
		@Param('tableId', ParseIntPipe) tableId: number,
		@Param('columnId', ParseIntPipe) columnId: number,
		@Body() dto: UpdateColumnBusinessDto,
	): Promise<void> {
		await this.workspacesService.updateColumnBusiness(id, user.id, tableId, columnId, dto)
	}
}
