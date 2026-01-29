import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from './entities/document.entity';
import { Embedding } from './entities/embedding.entity';

@Injectable()
export class RagRepository {
  constructor(
    @InjectRepository(Document)
    private docRepo: Repository<Document>,
    @InjectRepository(Embedding)
    private embRepo: Repository<Embedding>,
  ) {}

  async saveDocument(doc: { id: string; content: string; metadata?: string }): Promise<void> {
    await this.docRepo.save(doc);
  }

  async saveEmbeddings(embeddings: Partial<Embedding>[]): Promise<void> {
    await this.embRepo.save(embeddings);
  }

  async deleteByDocumentId(documentId: string): Promise<void> {
    await this.embRepo.delete({ documentId });
  }

  async findAllEmbeddings(): Promise<Embedding[]> {
    return this.embRepo.find();
  }

  async getStatus() {
    const [totalDocuments, totalEmbeddings] = await Promise.all([
      this.docRepo.count(),
      this.embRepo.count(),
    ]);
    return { totalDocuments, totalEmbeddings };
  }
}
