import { NotionService } from './notion.service';
import { Client } from '@notionhq/client';

interface MockClient {
  databases: { query: jest.Mock };
  blocks: { children: { list: jest.Mock } };
}

describe('NotionService', () => {
  let service: NotionService;
  let mockDatabaseQuery: jest.Mock;
  let mockBlocksList: jest.Mock;

  beforeEach(() => {
    mockDatabaseQuery = jest.fn();
    mockBlocksList = jest.fn();

    service = new NotionService();
    // 내부 클라이언트 메서드 직접 모킹
    const mockClient: MockClient = {
      databases: { query: mockDatabaseQuery },
      blocks: { children: { list: mockBlocksList } },
    };
    jest
      .spyOn(service as unknown as { makeClient: () => Client }, 'makeClient')
      .mockReturnValue(mockClient as unknown as Client);
  });

  describe('fetchDatabaseAll', () => {
    // Given: 100개 이하의 결과가 있을 때
    // When: 데이터베이스를 조회하면
    // Then: 모든 결과를 반환한다
    test('단일 페이지 결과를 반환한다', async () => {
      // Given - properties 필드가 있어야 PageObjectResponse로 인식됨
      const mockResults = [
        { id: '1', properties: {} },
        { id: '2', properties: {} },
      ];
      mockDatabaseQuery.mockResolvedValue({
        results: mockResults,
        has_more: false,
      });

      // When
      const result = await service.fetchDatabaseAll('db-id', 'token');

      // Then
      expect(result).toHaveLength(2);
      expect(mockDatabaseQuery).toHaveBeenCalledTimes(1);
    });

    // Given: 100개 초과의 결과가 있을 때
    // When: 데이터베이스를 조회하면
    // Then: 페이지네이션으로 모든 결과를 반환한다
    test('페이지네이션으로 전체 결과를 반환한다', async () => {
      // Given - properties 필드 포함
      const page1 = Array(100).fill({ id: 'p1', properties: {} });
      const page2 = Array(50).fill({ id: 'p2', properties: {} });

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
      // Given - type 필드가 있어야 BlockObjectResponse로 인식됨
      const mockBlocks = [
        { id: 'b1', type: 'paragraph' },
        { id: 'b2', type: 'paragraph' },
      ];
      mockBlocksList.mockResolvedValue({
        results: mockBlocks,
        has_more: false,
      });

      // When
      const result = await service.fetchBlockChildrenAll('block-id', 'token');

      // Then
      expect(result).toHaveLength(2);
    });

    // Given: 100개 초과의 블록이 있을 때
    // When: 블록 자식을 조회하면
    // Then: 페이지네이션으로 모든 블록을 반환한다
    test('페이지네이션으로 전체 블록을 반환한다', async () => {
      // Given - type 필드 포함
      const page1 = Array(100).fill({ id: 'b1', type: 'paragraph' });
      const page2 = Array(30).fill({ id: 'b2', type: 'paragraph' });

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
