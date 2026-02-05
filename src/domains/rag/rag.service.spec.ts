import { Test, TestingModule } from '@nestjs/testing';
import { RagService } from './rag.service';
import { RagRepository } from './rag.repository';
import { OpenAiService } from '../../infrastructure/openai/openai.service';

describe('RagService', () => {
  let service: RagService;
  let mockRagRepo: Partial<RagRepository>;
  let mockOpenAi: Partial<OpenAiService>;

  beforeEach(async () => {
    mockRagRepo = {
      saveEmbeddings: jest.fn(),
      deleteByDocumentId: jest.fn(),
      findAllEmbeddings: jest.fn(),
    };

    mockOpenAi = {
      countTokens: jest.fn().mockReturnValue(10),
      embedText: jest.fn().mockResolvedValue([0.1, 0.2, 0.3]),
      embedBatchSafe: jest
        .fn()
        .mockImplementation((chunks: string[]) =>
          Promise.resolve(chunks.map(() => [0.1, 0.2, 0.3])),
        ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RagService,
        { provide: RagRepository, useValue: mockRagRepo },
        { provide: OpenAiService, useValue: mockOpenAi },
      ],
    }).compile();

    service = module.get<RagService>(RagService);
  });

  describe('buildEmbeddings', () => {
    // Given: 문서 배열이 주어졌을 때
    // When: buildEmbeddings를 호출하면
    // Then: 기존 임베딩 삭제, 새 임베딩 생성이 수행된다
    test('문서를 임베딩으로 변환하여 저장한다', async () => {
      // Given
      const input = {
        documents: [{ id: 'doc1', content: 'test content' }],
      };

      // When
      const result = await service.buildEmbeddings(input);

      // Then
      expect(mockRagRepo.deleteByDocumentId).toHaveBeenCalledWith('doc1');
      expect(mockOpenAi.embedBatchSafe).toHaveBeenCalled();
      expect(mockRagRepo.saveEmbeddings).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.documentCount).toBe(1);
    });

    // Given: 여러 문서가 주어졌을 때
    // When: buildEmbeddings를 호출하면
    // Then: 각 문서에 대해 임베딩이 생성된다
    test('여러 문서를 처리한다', async () => {
      // Given
      const input = {
        documents: [
          { id: 'doc1', content: 'content 1' },
          { id: 'doc2', content: 'content 2' },
        ],
      };

      // When
      const result = await service.buildEmbeddings(input);

      // Then
      expect(result.documentCount).toBe(2);
      expect(mockRagRepo.deleteByDocumentId).toHaveBeenCalledTimes(2);
    });
  });

  describe('search', () => {
    // Given: 임베딩이 저장되어 있을 때
    // When: search를 호출하면
    // Then: 유사도 순으로 정렬된 결과를 반환한다
    test('쿼리와 유사한 문서를 검색한다', async () => {
      // Given
      const embeddings = [
        { documentId: 'doc1', content: 'content 1', vector: [0.1, 0.2, 0.3] },
        { documentId: 'doc2', content: 'content 2', vector: [0.9, 0.8, 0.7] },
      ];
      (mockRagRepo.findAllEmbeddings as jest.Mock).mockResolvedValue(
        embeddings,
      );

      // When
      const result = await service.search({ query: 'test query', limit: 5 });

      // Then
      expect(result.results).toBeDefined();
      expect(result.results.length).toBeLessThanOrEqual(5);
      expect(mockOpenAi.embedText).toHaveBeenCalledWith('test query');
    });

    // Given: 동일한 쿼리로 두 번 검색할 때
    // When: 두 번째 검색을 수행하면
    // Then: 캐시된 결과를 반환한다 (embedText 호출 1회)
    test('동일 쿼리는 캐시된 결과를 반환한다', async () => {
      // Given
      const embeddings = [
        { documentId: 'doc1', content: 'content', vector: [0.1, 0.2, 0.3] },
      ];
      (mockRagRepo.findAllEmbeddings as jest.Mock).mockResolvedValue(
        embeddings,
      );

      // When
      await service.search({ query: 'cached query', limit: 5 });
      await service.search({ query: 'cached query', limit: 5 });

      // Then - embedText는 첫 번째 호출에서만 실행
      expect(mockOpenAi.embedText).toHaveBeenCalledTimes(1);
    });

    // Given: 쿼리가 8192 토큰을 초과할 때
    // When: search를 호출하면
    // Then: 에러를 던진다
    test('쿼리 토큰 초과 시 에러를 던진다', async () => {
      // Given
      (mockOpenAi.countTokens as jest.Mock).mockReturnValue(9000);

      // When & Then
      await expect(
        service.search({ query: 'very long query', limit: 5 }),
      ).rejects.toThrow(/too large/i);
    });
  });
});
