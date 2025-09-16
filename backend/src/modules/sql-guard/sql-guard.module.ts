import { Module } from '@nestjs/common'
import { SqlGuardService } from './sql-guard.service'

@Module({
	providers: [SqlGuardService],
	exports: [SqlGuardService],
})
export class SqlGuardModule {}
