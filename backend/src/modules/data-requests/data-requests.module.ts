import { Module } from '@nestjs/common'
import { DataRequestsController } from './data-requests.controller'
import { DataRequestsService } from './services/data-requests.service'
import { PrismaModule } from 'src/prisma/prisma.module'
import { CommonModule } from 'src/common/common.module'
import { SqlGuardModule } from '../sql-guard/sql-guard.module'
import { LlmModule } from 'src/common/llm/llm.module'
import { AuthModule } from '../auth/auth.module'

@Module({
	imports: [PrismaModule, CommonModule, SqlGuardModule, LlmModule, AuthModule],
	controllers: [DataRequestsController],
	providers: [DataRequestsService],
})
export class DataRequestsModule {}
