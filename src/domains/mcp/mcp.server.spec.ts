import { Test, TestingModule } from '@nestjs/testing';
import { McpServer } from './mcp.server';
import { RagService } from '../rag/rag.service';

describe('McpServer', () => {
  let mcpServer: McpServer;
  let mockRagService: Partial<RagService>;

  beforeEach(async () => {
    mockRagService = {
      search: jest.fn().mockResolvedValue({
        results: [
          { documentId: 'doc1', content: 'Test content', similarity: 0.9 },
        ],
      }),
      getStatus: jest.fn().mockResolvedValue({
        totalDocuments: 5,
        totalEmbeddings: 15,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        McpServer,
        { provide: RagService, useValue: mockRagService },
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
    // Then: RAG 검색 결과를 반환한다
    test('search_worklog 도구 호출 시 검색 결과를 반환한다', async () => {
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
      expect(result).toHaveProperty('results');
    });

    // Given: 존재하지 않는 도구가 호출될 때
    // When: handleToolCall을 호출하면
    // Then: 에러를 던진다
    test('존재하지 않는 도구 호출 시 에러를 던진다', async () => {
      // Given
      const toolName = 'unknown_tool';
      const args = {};

      // When & Then
      await expect(mcpServer.handleToolCall(toolName, args)).rejects.toThrow(
        /unknown tool/i,
      );
    });
  });
});
