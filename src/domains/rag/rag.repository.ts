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
    const [uniqueDocResult, totalEmbeddings] = await Promise.all([
      this.embRepo
        .createQueryBuilder('e')
        .select('COUNT(DISTINCT e.documentId)', 'count')
        .getRawOne(),
      this.embRepo.count(),
    ]);
    return {
      totalDocuments: Number(uniqueDocResult.count),
      totalEmbeddings,
    };
  }
}
