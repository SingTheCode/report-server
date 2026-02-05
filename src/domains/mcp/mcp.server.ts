import { Injectable } from '@nestjs/common';
import { RagService } from '../rag/rag.service';
import { WorklogRepository } from '../worklog/worklog.repository';

export interface Tool {
  name: string;
  description: string;
  inputSchema: object;
}

interface SearchWorklogArgs {
  query: string;
  limit?: number;
}

interface McpSearchResultItem {
  documentId: string;
  content: string;
  similarity: number;
  worklog: {
    title: string;
    content: string;
    url?: string;
  };
}

export interface McpSearchResult {
  results: McpSearchResultItem[];
}

@Injectable()
export class McpServer {
  constructor(
    private ragService: RagService,
    private worklogRepo: WorklogRepository,
  ) {}

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
  ): Promise<McpSearchResult> {
    switch (toolName) {
      case 'search_worklog':
        return this.searchWorklog(args);
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }

  private async searchWorklog(args: SearchWorklogArgs): Promise<McpSearchResult> {
    const ragResult = await this.ragService.search({
      query: args.query,
      limit: args.limit ?? 5,
    });

    // 동일 documentId 중 유사도가 가장 높은 결과만 유지
    const bestByDocId = new Map<string, (typeof ragResult.results)[0]>();
    for (const r of ragResult.results) {
      const existing = bestByDocId.get(r.documentId);
      if (!existing || r.similarity > existing.similarity) {
        bestByDocId.set(r.documentId, r);
      }
    }
    const dedupedResults = [...bestByDocId.values()];

    const documentIds = dedupedResults.map((r) => r.documentId);
    const worklogs = await this.worklogRepo.findByIds(documentIds);
    const worklogMap = new Map(worklogs.map((w) => [w.id, w]));

    const results = dedupedResults.map((r) => {
      const worklog = worklogMap.get(r.documentId);
      return {
        documentId: r.documentId,
        content: r.content,
        similarity: r.similarity,
        worklog: {
          title: worklog?.title ?? '',
          content: worklog?.content ?? '',
        },
      };
    });

    return { results };
  }
}
