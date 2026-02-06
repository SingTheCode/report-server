import { Test, TestingModule } from '@nestjs/testing';
import { RagRepository } from './rag.repository';
import { SUPABASE_ADMIN_CLIENT } from '../../infrastructure/supabase/supabase.module';

describe('RagRepository', () => {
  let repository: RagRepository;
  let mockClient: any;

  beforeEach(async () => {
    mockClient = {
      from: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RagRepository,
        { provide: SUPABASE_ADMIN_CLIENT, useValue: mockClient },
      ],
    }).compile();

    repository = module.get<RagRepository>(RagRepository);
  });

  describe('saveEmbeddings', () => {
    // Given: 임베딩 배열이 주어졌을 때
    // When: saveEmbeddings를 호출하면
    // Then: supabase client의 upsert가 호출된다
    test('임베딩을 저장한다', async () => {
      // Given
      const embeddings = [
        { document_id: 1, chunk_index: 0, content: 'chunk', vector: [0.1] },
      ];
      mockClient.from.mockReturnValue({
        upsert: jest.fn().mockResolvedValue({ error: null }),
      });

      // When
      await repository.saveEmbeddings(embeddings);

      // Then
      expect(mockClient.from).toHaveBeenCalledWith('embeddings');
    });
  });

  describe('deleteByDocumentId', () => {
    // Given: documentId가 주어졌을 때
    // When: deleteByDocumentId를 호출하면
    // Then: 해당 문서의 임베딩이 삭제된다
    test('문서 ID로 임베딩을 삭제한다', async () => {
      // Given
      mockClient.from.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      });

      // When
      await repository.deleteByDocumentId(1);

      // Then
      expect(mockClient.from).toHaveBeenCalledWith('embeddings');
    });
  });

  describe('findAllEmbeddings', () => {
    // Given: 임베딩이 저장되어 있을 때
    // When: findAllEmbeddings를 호출하면
    // Then: 모든 임베딩을 반환한다
    test('모든 임베딩을 조회한다', async () => {
      // Given
      const embeddings = [{ id: 1, document_id: 1, vector: [0.1] }];
      mockClient.from.mockReturnValue({
        select: jest.fn().mockResolvedValue({ data: embeddings, error: null }),
      });

      // When
      const result = await repository.findAllEmbeddings();

      // Then
      expect(result).toEqual(embeddings);
    });
  });

  describe('getStatus', () => {
    // Given: 임베딩이 저장되어 있을 때
    // When: getStatus를 호출하면
    // Then: 총 임베딩 수를 반환한다
    test('상태 정보를 반환한다', async () => {
      // Given
      mockClient.from.mockReturnValue({
        select: jest.fn().mockResolvedValue({ count: 15, error: null }),
      });

      // When
      const result = await repository.getStatus();

      // Then
      expect(result).toEqual({ totalEmbeddings: 15 });
    });
  });
});
