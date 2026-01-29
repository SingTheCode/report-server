import { Injectable } from '@nestjs/common';
import { RagService } from '../rag/rag.service';
import { SearchResultOutput } from '../rag/dto/output/search-result.output';

export interface Tool {
  name: string;
  description: string;
  inputSchema: object;
}

interface SearchWorklogArgs {
  query: string;
  limit?: number;
}

@Injectable()
export class McpServer {
  constructor(private ragService: RagService) {}

  getTools(): Tool[] {
    return [
      {
        name: 'search_worklog',
        description: '작업 기록에서 관련 내용을 검색합니다.',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: '검색 쿼리' },
            limit: { type: 'number', description: '결과 개수 (기본값: 5)' },
          },
          required: ['query'],
        },
      },
    ];
  }

  async handleToolCall(
    toolName: string,
    args: SearchWorklogArgs,
  ): Promise<SearchResultOutput> {
    switch (toolName) {
      case 'search_worklog':
        return this.ragService.search({
          query: args.query,
          limit: args.limit ?? 5,
        });
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }
}
