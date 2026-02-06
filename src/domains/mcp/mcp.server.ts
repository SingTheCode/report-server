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
  documentId: number;
  content: string;
  similarity: number;
  worklog: {
    title: string;
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
        description: `업무 일지(worklog)에서 의미적으로 유사한 내용을 검색합니다.
벡터 임베딩 기반 시맨틱 검색을 수행하여 키워드 일치가 아닌 의미적 유사도로 결과를 반환합니다.
사용 예시: 과거 작업 내역 조회, 유사 이슈 해결 사례 검색, 특정 기능 구현 히스토리 확인 등.
결과는 유사도(similarity) 점수와 함께 반환되며, 동일 문서의 중복 결과는 자동으로 제거됩니다.`,
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description:
                '검색할 내용을 자연어로 입력합니다. 키워드보다는 문장 형태로 작성하면 더 정확한 결과를 얻을 수 있습니다. 예: "로그인 기능 구현 방법", "결제 오류 해결 사례"',
            },
            limit: {
              type: 'number',
              description:
                '반환할 최대 결과 개수 (기본값: 5, 권장 범위: 3~10). 너무 많은 결과는 컨텍스트를 과도하게 소비할 수 있습니다.',
            },
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

  private async searchWorklog(
    args: SearchWorklogArgs,
  ): Promise<McpSearchResult> {
    const ragResult = await this.ragService.search({
      query: args.query,
      limit: args.limit ?? 5,
    });

    // 동일 documentId 중 유사도가 가장 높은 결과만 유지
    const bestByDocId = new Map<number, (typeof ragResult.results)[0]>();
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
        },
      };
    });

    return { results };
  }
}
