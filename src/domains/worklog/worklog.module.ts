import { Module } from '@nestjs/common';
import { SupabaseModule } from '../../infrastructure/supabase/supabase.module';
import { WorklogResolver } from './worklog.resolver';
import { WorklogService } from './worklog.service';
import { WorklogRepository } from './worklog.repository';
import { WorklogController } from './worklog.controller';
import { RagModule } from '../rag/rag.module';

@Module({
  imports: [SupabaseModule, RagModule],
  controllers: [WorklogController],
  providers: [WorklogResolver, WorklogService, WorklogRepository],
  exports: [WorklogRepository],
})
export class WorklogModule {}
