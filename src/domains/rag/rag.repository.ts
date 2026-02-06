import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Embedding } from './entities/embedding.entity';

@Injectable()
export class RagRepository {
  constructor(
    @InjectRepository(Embedding)
    private embRepo: Repository<Embedding>,
  ) {}

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
    const totalEmbeddings = await this.embRepo.count();
    return { totalEmbeddings };
  }
}
