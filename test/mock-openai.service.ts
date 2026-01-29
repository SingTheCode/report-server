import { Injectable } from '@nestjs/common';

/**
 * 테스트용 모킹 OpenAiService
 * 실제 API 호출 없이 고정된 벡터를 반환
 */
@Injectable()
export class MockOpenAiService {
  countTokens(text: string): number {
    return text.split(/\s+/).length;
  }

  embedText(text: string): Promise<number[]> {
    if (this.countTokens(text) > 8192) {
      throw new Error('Embedding input too large (> 8192 tokens)');
    }
    return Promise.resolve(this.generateMockVector(text));
  }

  embedBatch(texts: string[]): Promise<number[][]> {
    return Promise.resolve(texts.map((t) => this.generateMockVector(t)));
  }

  embedBatchSafe(texts: string[]): Promise<number[][]> {
    return this.embedBatch(texts);
  }

  // 텍스트 기반 결정론적 벡터 생성 (동일 텍스트 = 동일 벡터)
  private generateMockVector(text: string): number[] {
    const hash = this.simpleHash(text);
    const vector: number[] = [];
    for (let i = 0; i < 1536; i++) {
      vector.push(Math.sin(hash + i) * 0.5 + 0.5);
    }
    return this.normalize(vector);
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }

  private normalize(vec: number[]): number[] {
    let norm = 0;
    for (const v of vec) norm += v * v;
    norm = Math.sqrt(norm) || 1;
    return vec.map((v) => v / norm);
  }
}
