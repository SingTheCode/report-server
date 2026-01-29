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
        { type: 'paragraph', paragraph: { rich_text: [{ plain_text: 'Content' }] } },
      ];

      (mockNotionService.fetchDatabaseAll as jest.Mock).mockResolvedValue(mockPages);
      (mockNotionService.fetchBlockChildrenAll as jest.Mock).mockResolvedValue(mockBlocks);

      // When
      const result = await service.syncNotion({
        databaseId: 'db-id',
        apiToken: 'token',
      });

      // Then
      expect(mockNotionService.fetchDatabaseAll).toHaveBeenCalledWith('db-id', 'token');
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
      (mockWorklogRepo.getStatus as jest.Mock).mockResolvedValue({ totalWorklogs: 5 });

      // When
      const result = await service.getStatus();

      // Then
      expect(result).toEqual({ totalWorklogs: 5 });
    });
  });
});
