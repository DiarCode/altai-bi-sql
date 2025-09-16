// src/modules/workspaces/workspaces.module.ts

import { Module } from '@nestjs/common'
import { WorkspacesController } from './workspaces.controller'
import { WorkspacesService } from './services/workspaces.service'
import { PrismaModule } from 'src/prisma/prisma.module'
import { CommonModule } from 'src/common/common.module'
import { SchemaReaderService } from './services/schema-reader.service'
import { LlmModule } from 'src/common/llm/llm.module'
import { AuthModule } from '../auth/auth.module'

@Module({
	imports: [PrismaModule, CommonModule, LlmModule, AuthModule],
	controllers: [WorkspacesController],
	providers: [WorkspacesService, SchemaReaderService],
	exports: [WorkspacesService, SchemaReaderService],
})
export class WorkspacesModule {}
