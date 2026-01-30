import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorklogResolver } from './worklog.resolver';
import { WorklogService } from './worklog.service';
import { WorklogRepository } from './worklog.repository';
import { WorklogController } from './worklog.controller';
import { Worklog } from './entities/worklog.entity';
import { RagModule } from '../rag/rag.module';

@Module({
  imports: [TypeOrmModule.forFeature([Worklog]), RagModule],
  controllers: [WorklogController],
  providers: [WorklogResolver, WorklogService, WorklogRepository],
  exports: [WorklogRepository],
})
export class WorklogModule {}
