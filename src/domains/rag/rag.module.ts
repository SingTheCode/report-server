import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RagResolver } from './rag.resolver';
import { RagService } from './rag.service';
import { RagRepository } from './rag.repository';
import { Document } from './entities/document.entity';
import { Embedding } from './entities/embedding.entity';
import { OpenAiModule } from '../../infrastructure/openai/openai.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Document, Embedding]),
    OpenAiModule,
  ],
  providers: [RagResolver, RagService, RagRepository],
  exports: [RagService],
})
export class RagModule {}
