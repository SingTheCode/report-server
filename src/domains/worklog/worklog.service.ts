import { Injectable } from '@nestjs/common';
import { WorklogRepository } from './worklog.repository';
import { NotionService } from '../../infrastructure/notion/notion.service';
import { RagService } from '../rag/rag.service';
import { SyncNotionInput } from './dto/input/sync-notion.input';

@Injectable()
export class WorklogService {
  constructor(
    private worklogRepo: WorklogRepository,
    private notionService: NotionService,
    private ragService: RagService,
  ) {}

  async syncNotion(input: SyncNotionInput) {
    const pages = await this.notionService.fetchDatabaseAll(
      input.databaseId,
      input.apiToken,
    );

    if (pages.length === 0) {
      return { success: true, syncedCount: 0, embeddedCount: 0 };
    }

    const worklogs = await Promise.all(
      pages.map(async (page: any) => {
        const blocks = await this.notionService.fetchBlockChildrenAll(
          page.id,
          input.apiToken,
        );
        const content = this.extractContent(blocks);
        const title = this.extractTitle(page);

        return {
          id: page.id,
          title,
          content,
          url: page.url,
          syncedAt: new Date(),
        };
      }),
    );

    await this.worklogRepo.saveWorklogs(worklogs);

    // RAG 임베딩 생성
    const documents = worklogs.map((w) => ({
      id: w.id,
      content: `${w.title}\n\n${w.content}`,
      title: JSON.stringify({ title: w.title, url: w.url }),
    }));

    const embeddingResult = await this.ragService.buildEmbeddings({
      documents,
    });

    return {
      success: true,
      syncedCount: worklogs.length,
      embeddedCount: embeddingResult.chunkCount,
    };
  }

  private extractTitle(page: any): string {
    const titleProp = page.properties?.title || page.properties?.Name;
    if (titleProp?.title?.[0]?.plain_text) {
      return titleProp.title[0].plain_text;
    }
    return 'Untitled';
  }

  private extractContent(blocks: any[]): string {
    return blocks
      .map((block) => {
        const type = block.type;
        const data = block[type];
        if (data?.rich_text) {
          return data.rich_text.map((t: any) => t.plain_text).join('');
        }
        return '';
      })
      .filter(Boolean)
      .join('\n');
  }

  async getWorklogs() {
    return this.worklogRepo.findAll();
  }

  async getStatus() {
    return this.worklogRepo.getStatus();
  }
}
