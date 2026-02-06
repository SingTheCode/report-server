import { Test, TestingModule } from '@nestjs/testing';
import { McpServer } from './mcp.server';
import { RagService } from '../rag/rag.service';
import { WorklogRepository } from '../worklog/worklog.repository';

describe('McpServer', () => {
  let mcpServer: McpServer;
  let mockRagService: Partial<RagService>;
  let mockWorklogRepo: Partial<WorklogRepository>;

  beforeEach(async () => {
    mockRagService = {
      search: jest.fn().mockResolvedValue({
        results: [
          { documentId: 'doc1', content: 'chunk content', similarity: 0.9 },
        ],
      }),
    };

    mockWorklogRepo = {
      findByIds: jest.fn().mockResolvedValue([
        {
          id: 'doc1',
          title: 'Test Title',
          content: 'Full content',
        },
      ]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        McpServer,
        { provide: RagService, useValue: mockRagService },
        { provide: WorklogRepository, useValue: mockWorklogRepo },
      ],
    }).compile();

    mcpServer = module.get<McpServer>(McpServer);
  });

  describe('getTools', () => {
    // Given: MCP 서버가 초기화되었을 때
    // When: getTools를 호출하면
    // Then: 사용 가능한 도구 목록을 반환한다
    test('사용 가능한 도구 목록을 반환한다', () => {
      // When
      const tools = mcpServer.getTools();

      // Then
      expect(tools).toContainEqual(
        expect.objectContaining({ name: 'search_worklog' }),
      );
    });
  });

  describe('handleToolCall', () => {
    // Given: search_worklog 도구가 호출될 때
    // When: 쿼리를 전달하면
    // Then: RAG 검색 결과와 worklog 정보를 함께 반환한다
    test('search_worklog 호출 시 worklog 정보를 포함한 결과를 반환한다', async () => {
      // Given
      const toolName = 'search_worklog';
      const args = { query: 'test query', limit: 5 };

      // When
      const result = await mcpServer.handleToolCall(toolName, args);

      // Then
      expect(mockRagService.search).toHaveBeenCalledWith({
        query: 'test query',
        limit: 5,
      });
      expect(mockWorklogRepo.findByIds).toHaveBeenCalledWith(['doc1']);
      expect(result.results[0]).toEqual({
        documentId: 'doc1',
        content: 'chunk content',
        similarity: 0.9,
        worklog: {
          title: 'Test Title',
          content: 'Full content',
        },
      });
    });

    // Given: 검색 결과가 없을 때
    // When: handleToolCall을 호출하면
    // Then: 빈 결과를 반환한다
    test('검색 결과가 없으면 빈 배열을 반환한다', async () => {
      // Given
      (mockRagService.search as jest.Mock).mockResolvedValue({ results: [] });

      // When
      const result = await mcpServer.handleToolCall('search_worklog', {
        query: 'no match',
      });

      // Then
      expect(result.results).toEqual([]);
      expect(mockWorklogRepo.findByIds).toHaveBeenCalledWith([]);
    });

    // Given: 존재하지 않는 도구가 호출될 때
    // When: handleToolCall을 호출하면
    // Then: 에러를 던진다
    test('존재하지 않는 도구 호출 시 에러를 던진다', async () => {
      // Given
      const toolName = 'unknown_tool';
      const args = { query: '' };

      // When & Then
      await expect(mcpServer.handleToolCall(toolName, args)).rejects.toThrow(
        /unknown tool/i,
      );
    });

    // Given: 동일 documentId의 청크가 여러 개 검색될 때
    // When: handleToolCall을 호출하면
    // Then: 유사도가 가장 높은 결과만 반환한다
    test('동일 documentId는 유사도가 가장 높은 결과만 반환한다', async () => {
      // Given
      (mockRagService.search as jest.Mock).mockResolvedValue({
        results: [
          { documentId: 'doc1', content: 'chunk 1', similarity: 0.9 },
          { documentId: 'doc1', content: 'chunk 2', similarity: 0.95 },
          { documentId: 'doc2', content: 'chunk 3', similarity: 0.8 },
          { documentId: 'doc1', content: 'chunk 3', similarity: 0.85 },
        ],
      });
      (mockWorklogRepo.findByIds as jest.Mock).mockResolvedValue([
        { id: 'doc1', title: 'Title 1', content: 'Full 1' },
        { id: 'doc2', title: 'Title 2', content: 'Full 2' },
      ]);

      // When
      const result = await mcpServer.handleToolCall('search_worklog', {
        query: 'test',
      });

      // Then
      expect(result.results).toHaveLength(2);
      expect(result.results[0]).toMatchObject({
        documentId: 'doc1',
        content: 'chunk 2',
        similarity: 0.95,
      });
      expect(result.results[1]).toMatchObject({
        documentId: 'doc2',
        similarity: 0.8,
      });
    });
  });
});
