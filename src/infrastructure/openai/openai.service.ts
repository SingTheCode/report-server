import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { get_encoding, Tiktoken } from '@dqbd/tiktoken';

@Injectable()
export class OpenAiService {
  private client: OpenAI;
  private enc: Tiktoken;

  private readonly MAX_TOKENS = 8192;
  private readonly MAX_BATCH_SIZE = 2048;
  private readonly MODEL = 'text-embedding-3-small';

  constructor(config: ConfigService) {
    this.client = new OpenAI({ apiKey: config.get('OPENAI_API_KEY') });
    this.enc = get_encoding('cl100k_base');
  }

  countTokens(text: string): number {
    return this.enc.encode(text).length;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }

  private async withRetry<T>(fn: () => Promise<T>, maxRetry = 5): Promise<T> {
    let attempt = 0;

    while (true) {
      try {
        return await fn();
      } catch (e: any) {
        attempt++;
        const status = e?.status || e?.response?.status;
        const retryable = status === 429 || (status >= 500 && status < 600);

        if (!retryable || attempt > maxRetry) throw e;

        const base = Math.min(2000 * 2 ** (attempt - 1), 15000);
        const jitter = Math.floor(Math.random() * 300);
        await this.sleep(base + jitter);
      }
    }
  }

  async embedText(text: string): Promise<number[]> {
    if (this.countTokens(text) > this.MAX_TOKENS) {
      throw new Error(`Embedding input too large (> ${this.MAX_TOKENS} tokens)`);
    }

    const res = await this.withRetry(() =>
      this.client.embeddings.create({ model: this.MODEL, input: text }),
    );
    return res.data[0].embedding;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length > this.MAX_BATCH_SIZE) {
      throw new Error(`Too many inputs (max ${this.MAX_BATCH_SIZE})`);
    }

    for (const t of texts) {
      if (this.countTokens(t) > this.MAX_TOKENS) {
        throw new Error(`One of inputs too large (> ${this.MAX_TOKENS} tokens)`);
      }
    }

    const res = await this.withRetry(() =>
      this.client.embeddings.create({ model: this.MODEL, input: texts }),
    );
    return res.data.map((d) => d.embedding);
  }

  async embedBatchSafe(texts: string[], chunkSize = 256): Promise<number[][]> {
    const out: number[][] = [];

    for (let i = 0; i < texts.length; i += chunkSize) {
      const part = texts.slice(i, i + chunkSize);
      const vecs = await this.embedBatch(part);
      out.push(...vecs);
    }

    return out;
  }
}
