import { Module } from '@nestjs/common';
import { SupabaseModule } from '../../infrastructure/supabase/supabase.module';
import { RagService } from './rag.service';
import { RagRepository } from './rag.repository';
import { OpenAiModule } from '../../infrastructure/openai/openai.module';

@Module({
  imports: [SupabaseModule, OpenAiModule],
  providers: [RagService, RagRepository],
  exports: [RagService],
})
export class RagModule {}
