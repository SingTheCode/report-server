import { Injectable } from '@nestjs/common';
import { LRUCache } from 'lru-cache';
import { get_encoding, Tiktoken } from '@dqbd/tiktoken';
import { RagRepository } from './rag.repository';
import { OpenAiService } from '../../infrastructure/openai/openai.service';
import { BuildEmbeddingsInput } from './dto/input/build-embeddings.input';
import { SearchEmbeddingsInput } from './dto/input/search-embeddings.input';
import { SearchResultOutput } from './dto/output/search-result.output';

@Injectable()
export class RagService {
  private enc: Tiktoken;
  private queryVectorCache: LRUCache<string, number[]>;
  private searchCache: LRUCache<string, SearchResultOutput>;

  constructor(
    private ragRepo: RagRepository,
    private openai: OpenAiService,
  ) {
    this.enc = get_encoding('cl100k_base');
    this.queryVectorCache = new LRUCache({ max: 500, ttl: 1000 * 60 * 10 });
    this.searchCache = new LRUCache({ max: 500, ttl: 1000 * 30 });
  }

  private chunkByTokens(text: string, size = 500, overlap = 80): string[] {
    const tokens = this.enc.encode(text);
    const chunks: string[] = [];
    let start = 0;

    while (start < tokens.length) {
      const end = Math.min(start + size, tokens.length);
      const chunkTokens = tokens.slice(start, end);
      chunks.push(new TextDecoder().decode(this.enc.decode(chunkTokens)));
      start = Math.max(end - overlap, start + 1);
    }

    return chunks;
  }

  private normalize(vec: number[]): number[] {
    let norm = 0;
    for (const v of vec) norm += v * v;
    norm = Math.sqrt(norm) || 1;
    return vec.map((v) => v / norm);
  }

  private dot(a: number[], b: number[]): number {
    let s = 0;
    for (let i = 0; i < a.length; i++) s += a[i] * b[i];
    return s;
  }

  async buildEmbeddings(input: BuildEmbeddingsInput) {
    let totalChunks = 0;

    for (const doc of input.documents) {
      await this.ragRepo.deleteByDocumentId(doc.id);

      const chunks = this.chunkByTokens(doc.content);
      const vectors = await this.openai.embedBatchSafe(chunks);

      const embeddings = chunks.map((content, i) => ({
        documentId: doc.id,
        chunkIndex: i,
        content,
        vector: this.normalize(vectors[i]),
      }));

      await this.ragRepo.saveEmbeddings(embeddings);
      totalChunks += chunks.length;
      this.searchCache.clear();
    }

    return {
      success: true,
      documentCount: input.documents.length,
      chunkCount: totalChunks,
    };
  }

  async search(input: SearchEmbeddingsInput): Promise<SearchResultOutput> {
    const limit = input.limit ?? 5;
    const cacheKey = `${input.query}::${limit}`;

    const cached = this.searchCache.get(cacheKey);
    if (cached) return cached;

    let queryVector = this.queryVectorCache.get(input.query);
    if (!queryVector) {
      if (this.openai.countTokens(input.query) > 8192) {
        throw new Error('Query too large (> 8192 tokens)');
      }
      queryVector = this.normalize(await this.openai.embedText(input.query));
      this.queryVectorCache.set(input.query, queryVector);
    }

    const embeddings = await this.ragRepo.findAllEmbeddings();
    const qv = queryVector;

    const results = embeddings
      .map((e) => ({
        documentId: e.documentId,
        content: e.content,
        similarity: this.dot(qv, e.vector),
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    const out: SearchResultOutput = { results };
    this.searchCache.set(cacheKey, out);
    return out;
  }
}
