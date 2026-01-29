import { NotionService } from './notion.service';

describe('NotionService', () => {
  let service: NotionService;
  let mockDatabaseQuery: jest.Mock;
  let mockBlocksList: jest.Mock;

  beforeEach(() => {
    mockDatabaseQuery = jest.fn();
    mockBlocksList = jest.fn();

    // Notion Client 모킹
    jest.mock('@notionhq/client', () => ({
      Client: jest.fn().mockImplementation(() => ({
        databases: { query: mockDatabaseQuery },
        blocks: { children: { list: mockBlocksList } },
      })),
    }));

    service = new NotionService();
    // 내부 클라이언트 메서드 직접 모킹
    (service as any).makeClient = jest.fn().mockReturnValue({
      databases: { query: mockDatabaseQuery },
      blocks: { children: { list: mockBlocksList } },
    });
  });

  describe('fetchDatabaseAll', () => {
    // Given: 100개 이하의 결과가 있을 때
    // When: 데이터베이스를 조회하면
    // Then: 모든 결과를 반환한다
    test('단일 페이지 결과를 반환한다', async () => {
      // Given
      const mockResults = [{ id: '1' }, { id: '2' }];
      mockDatabaseQuery.mockResolvedValue({
        results: mockResults,
        has_more: false,
      });

      // When
      const result = await service.fetchDatabaseAll('db-id', 'token');

      // Then
      expect(result).toEqual(mockResults);
      expect(mockDatabaseQuery).toHaveBeenCalledTimes(1);
    });

    // Given: 100개 초과의 결과가 있을 때
    // When: 데이터베이스를 조회하면
    // Then: 페이지네이션으로 모든 결과를 반환한다
    test('페이지네이션으로 전체 결과를 반환한다', async () => {
      // Given
      const page1 = Array(100).fill({ id: 'p1' });
      const page2 = Array(50).fill({ id: 'p2' });

      mockDatabaseQuery
        .mockResolvedValueOnce({
          results: page1,
          has_more: true,
          next_cursor: 'cursor-1',
        })
        .mockResolvedValueOnce({
          results: page2,
          has_more: false,
        });

      // When
      const result = await service.fetchDatabaseAll('db-id', 'token');

      // Then
      expect(result).toHaveLength(150);
      expect(mockDatabaseQuery).toHaveBeenCalledTimes(2);
    });
  });

  describe('fetchBlockChildrenAll', () => {
    // Given: 100개 이하의 블록이 있을 때
    // When: 블록 자식을 조회하면
    // Then: 모든 블록을 반환한다
    test('단일 페이지 블록을 반환한다', async () => {
      // Given
      const mockBlocks = [{ id: 'b1' }, { id: 'b2' }];
      mockBlocksList.mockResolvedValue({
        results: mockBlocks,
        has_more: false,
      });

      // When
      const result = await service.fetchBlockChildrenAll('block-id', 'token');

      // Then
      expect(result).toEqual(mockBlocks);
    });

    // Given: 100개 초과의 블록이 있을 때
    // When: 블록 자식을 조회하면
    // Then: 페이지네이션으로 모든 블록을 반환한다
    test('페이지네이션으로 전체 블록을 반환한다', async () => {
      // Given
      const page1 = Array(100).fill({ id: 'b1' });
      const page2 = Array(30).fill({ id: 'b2' });

      mockBlocksList
        .mockResolvedValueOnce({
          results: page1,
          has_more: true,
          next_cursor: 'cursor-1',
        })
        .mockResolvedValueOnce({
          results: page2,
          has_more: false,
        });

      // When
      const result = await service.fetchBlockChildrenAll('block-id', 'token');

      // Then
      expect(result).toHaveLength(130);
      expect(mockBlocksList).toHaveBeenCalledTimes(2);
    });
  });
});
