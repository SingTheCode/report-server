import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RagService } from './rag.service';
import { RagRepository } from './rag.repository';
import { Embedding } from './entities/embedding.entity';
import { OpenAiModule } from '../../infrastructure/openai/openai.module';

@Module({
  imports: [TypeOrmModule.forFeature([Embedding]), OpenAiModule],
  providers: [RagService, RagRepository],
  exports: [RagService],
})
export class RagModule {}
