import { Test, TestingModule } from '@nestjs/testing';
import { WorklogService } from './worklog.service';
import { WorklogRepository } from './worklog.repository';
import { NotionService } from '../../infrastructure/notion/notion.service';
import { RagService } from '../rag/rag.service';

describe('WorklogService', () => {
  let service: WorklogService;
  let mockWorklogRepo: Partial<WorklogRepository>;
  let mockNotionService: Partial<NotionService>;
  let mockRagService: Partial<RagService>;

  beforeEach(async () => {
    mockWorklogRepo = {
      saveWorklogs: jest.fn(),
      findAll: jest.fn(),
      getStatus: jest.fn(),
    };

    mockNotionService = {
      fetchDatabaseAll: jest.fn(),
      fetchBlockChildrenAll: jest.fn(),
    };

    mockRagService = {
      buildEmbeddings: jest.fn().mockResolvedValue({
        success: true,
        documentCount: 1,
        chunkCount: 1,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorklogService,
        { provide: WorklogRepository, useValue: mockWorklogRepo },
        { provide: NotionService, useValue: mockNotionService },
        { provide: RagService, useValue: mockRagService },
      ],
    }).compile();

    service = module.get<WorklogService>(WorklogService);
  });

  describe('syncNotion', () => {
    // Given: Notion 데이터베이스에 페이지가 있을 때
    // When: syncNotion을 호출하면
    // Then: 페이지를 가져와 저장하고 임베딩을 생성한다
    test('Notion 페이지를 동기화하고 임베딩을 생성한다', async () => {
      // Given
      const mockPages = [
        {
          id: 'page1',
          properties: {
            title: { title: [{ plain_text: 'Test Page' }] },
          },
          url: 'https://notion.so/page1',
        },
      ];
      const mockBlocks = [
        {
          type: 'paragraph',
          paragraph: { rich_text: [{ plain_text: 'Content' }] },
        },
      ];

      (mockNotionService.fetchDatabaseAll as jest.Mock).mockResolvedValue(
        mockPages,
      );
      (mockNotionService.fetchBlockChildrenAll as jest.Mock).mockResolvedValue(
        mockBlocks,
      );

      // When
      const result = await service.syncNotion({
        databaseId: 'db-id',
        apiToken: 'token',
      });

      // Then
      expect(mockNotionService.fetchDatabaseAll).toHaveBeenCalledWith(
        'db-id',
        'token',
      );
      expect(mockWorklogRepo.saveWorklogs).toHaveBeenCalled();
      expect(mockRagService.buildEmbeddings).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.syncedCount).toBe(1);
    });

    // Given: Notion 데이터베이스가 비어있을 때
    // When: syncNotion을 호출하면
    // Then: 0개 동기화 결과를 반환한다
    test('빈 데이터베이스는 0개 동기화', async () => {
      // Given
      (mockNotionService.fetchDatabaseAll as jest.Mock).mockResolvedValue([]);

      // When
      const result = await service.syncNotion({
        databaseId: 'db-id',
        apiToken: 'token',
      });

      // Then
      expect(result.syncedCount).toBe(0);
      expect(result.embeddedCount).toBe(0);
    });
  });

  describe('getWorklogs', () => {
    // Given: worklog가 저장되어 있을 때
    // When: getWorklogs를 호출하면
    // Then: 모든 worklog를 반환한다
    test('모든 worklog를 조회한다', async () => {
      // Given
      const worklogs = [{ id: 'page1', title: 'Test' }];
      (mockWorklogRepo.findAll as jest.Mock).mockResolvedValue(worklogs);

      // When
      const result = await service.getWorklogs();

      // Then
      expect(result).toEqual(worklogs);
    });
  });

  describe('getStatus', () => {
    // Given: worklog가 저장되어 있을 때
    // When: getStatus를 호출하면
    // Then: 상태 정보를 반환한다
    test('상태 정보를 반환한다', async () => {
      // Given
      (mockWorklogRepo.getStatus as jest.Mock).mockResolvedValue({
        totalWorklogs: 5,
      });

      // When
      const result = await service.getStatus();

      // Then
      expect(result).toEqual({ totalWorklogs: 5 });
    });
  });

  describe('uploadFiles', () => {
    // Given: 파일이 업로드될 때
    // When: uploadFiles를 호출하면
    // Then: 파일을 파싱하고 임베딩을 생성하여 저장한다
    test('파일을 업로드하고 임베딩을 생성한다', async () => {
      // Given
      const mockFile = {
        filename: 'test.md',
        content: '# Test Content\nThis is test content.',
      };

      // When
      const result = await service.uploadFiles({
        files: [mockFile],
      });

      // Then
      expect(result.successCount).toBe(1);
      expect(result.failedCount).toBe(0);
      expect(result.successFiles).toHaveLength(1);
      expect(result.successFiles[0].filename).toBe('test.md');
      expect(mockRagService.buildEmbeddings).toHaveBeenCalled();
      expect(mockWorklogRepo.saveWorklogs).toHaveBeenCalled();
    });

    // Given: 여러 파일이 업로드될 때
    // When: uploadFiles를 호출하면
    // Then: 모든 파일을 처리하고 결과를 반환한다
    test('여러 파일을 업로드한다', async () => {
      // Given
      const files = [
        { filename: 'file1.md', content: 'Content 1' },
        { filename: 'file2.md', content: 'Content 2' },
      ];

      // When
      const result = await service.uploadFiles({ files });

      // Then
      expect(result.successCount).toBe(2);
      expect(result.failedCount).toBe(0);
      expect(result.successFiles).toHaveLength(2);
    });

    // Given: 파일 처리 중 에러가 발생할 때
    // When: uploadFiles를 호출하면
    // Then: 실패한 파일 정보를 반환한다
    test('실패한 파일 정보를 반환한다', async () => {
      // Given
      const mockFile = {
        filename: 'error.md',
        content: 'Content',
      };

      (mockRagService.buildEmbeddings as jest.Mock).mockRejectedValueOnce(
        new Error('Embedding failed'),
      );

      // When
      const result = await service.uploadFiles({
        files: [mockFile],
      });

      // Then
      expect(result.successCount).toBe(0);
      expect(result.failedCount).toBe(1);
      expect(result.failedFiles).toHaveLength(1);
      expect(result.failedFiles[0].filename).toBe('error.md');
      expect(result.failedFiles[0].error).toBe('Embedding failed');
    });

    // Given: 진행현황 콜백이 제공될 때
    // When: uploadFiles를 호출하면
    // Then: 각 파일 처리 시 진행현황을 전송한다
    test('진행현황을 콜백으로 전송한다', async () => {
      // Given
      const mockFile = {
        filename: 'test.md',
        content: 'Content',
      };

      const progressCallback = jest.fn();

      // When
      await service.uploadFiles({ files: [mockFile] }, progressCallback);

      // Then
      expect(progressCallback).toHaveBeenCalled();
      // processing, embedding 상태가 호출됨
      const calls = (
        progressCallback.mock.calls as Array<[{ status: string }]>
      ).map((c) => c[0].status);
      expect(calls).toContain('processing');
      expect(calls).toContain('embedding');
    });
  });

  describe('getProgressStream', () => {
    // Given: 업로드 ID로 스트림이 등록되어 있을 때
    // When: getProgressStream을 호출하면
    // Then: Observable 스트림을 반환한다
    test('등록된 스트림을 반환한다', () => {
      // Given
      const uploadId = service.createProgressStream();

      // When
      const stream = service.getProgressStream(uploadId);

      // Then
      expect(stream).toBeDefined();
      expect(typeof stream.subscribe).toBe('function');
    });

    // Given: 존재하지 않는 업로드 ID일 때
    // When: getProgressStream을 호출하면
    // Then: 에러를 던진다
    test('존재하지 않는 ID는 에러를 던진다', () => {
      // Given
      const uploadId = 'non-existent-id';

      // When & Then
      expect(() => service.getProgressStream(uploadId)).toThrow(
        'Upload not found',
      );
    });
  });
});
