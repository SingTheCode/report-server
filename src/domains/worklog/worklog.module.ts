import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorklogResolver } from './worklog.resolver';
import { WorklogService } from './worklog.service';
import { WorklogRepository } from './worklog.repository';
import { WorklogController } from './worklog.controller';
import { Worklog } from './entities/worklog.entity';
import { NotionModule } from '../../infrastructure/notion/notion.module';
import { RagModule } from '../rag/rag.module';

@Module({
  imports: [TypeOrmModule.forFeature([Worklog]), NotionModule, RagModule],
  controllers: [WorklogController],
  providers: [WorklogResolver, WorklogService, WorklogRepository],
})
export class WorklogModule {}
