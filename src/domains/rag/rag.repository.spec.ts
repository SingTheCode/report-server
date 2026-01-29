import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RagRepository } from './rag.repository';
import { Document } from './entities/document.entity';
import { Embedding } from './entities/embedding.entity';

describe('RagRepository', () => {
  let repository: RagRepository;
  let mockDocRepo: Partial<Repository<Document>>;
  let mockEmbRepo: Partial<Repository<Embedding>>;

  beforeEach(async () => {
    mockDocRepo = {
      save: jest.fn(),
      count: jest.fn(),
    };
    mockEmbRepo = {
      save: jest.fn(),
      find: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RagRepository,
        { provide: getRepositoryToken(Document), useValue: mockDocRepo },
        { provide: getRepositoryToken(Embedding), useValue: mockEmbRepo },
      ],
    }).compile();

    repository = module.get<RagRepository>(RagRepository);
  });

  describe('saveDocument', () => {
    // Given: 문서 데이터가 주어졌을 때
    // When: saveDocument를 호출하면
    // Then: docRepo.save가 호출된다
    test('문서를 저장한다', async () => {
      // Given
      const doc = { id: 'doc1', content: 'test content', title: 'test title' };

      // When
      await repository.saveDocument(doc);

      // Then
      expect(mockDocRepo.save).toHaveBeenCalledWith(doc);
    });
  });

  describe('saveEmbeddings', () => {
    // Given: 임베딩 배열이 주어졌을 때
    // When: saveEmbeddings를 호출하면
    // Then: embRepo.save가 호출된다
    test('임베딩을 저장한다', async () => {
      // Given
      const embeddings = [
        { documentId: 'doc1', chunkIndex: 0, content: 'chunk', vector: [0.1] },
      ];

      // When
      await repository.saveEmbeddings(embeddings);

      // Then
      expect(mockEmbRepo.save).toHaveBeenCalledWith(embeddings);
    });
  });

  describe('deleteByDocumentId', () => {
    // Given: documentId가 주어졌을 때
    // When: deleteByDocumentId를 호출하면
    // Then: 해당 문서의 임베딩이 삭제된다
    test('문서 ID로 임베딩을 삭제한다', async () => {
      // Given
      const documentId = 'doc1';

      // When
      await repository.deleteByDocumentId(documentId);

      // Then
      expect(mockEmbRepo.delete).toHaveBeenCalledWith({ documentId });
    });
  });

  describe('findAllEmbeddings', () => {
    // Given: 임베딩이 저장되어 있을 때
    // When: findAllEmbeddings를 호출하면
    // Then: 모든 임베딩을 반환한다
    test('모든 임베딩을 조회한다', async () => {
      // Given
      const embeddings = [{ id: 1, documentId: 'doc1', vector: [0.1] }];
      (mockEmbRepo.find as jest.Mock).mockResolvedValue(embeddings);

      // When
      const result = await repository.findAllEmbeddings();

      // Then
      expect(result).toEqual(embeddings);
    });
  });

  describe('getStatus', () => {
    // Given: 문서와 임베딩이 저장되어 있을 때
    // When: getStatus를 호출하면
    // Then: 총 문서 수와 임베딩 수를 반환한다
    test('상태 정보를 반환한다', async () => {
      // Given
      (mockDocRepo.count as jest.Mock).mockResolvedValue(5);
      (mockEmbRepo.count as jest.Mock).mockResolvedValue(15);

      // When
      const result = await repository.getStatus();

      // Then
      expect(result).toEqual({ totalDocuments: 5, totalEmbeddings: 15 });
    });
  });
});
