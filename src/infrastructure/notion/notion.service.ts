import { Injectable } from '@nestjs/common';
import { Client } from '@notionhq/client';

@Injectable()
export class NotionService {
  private makeClient(apiToken: string): Client {
    return new Client({ auth: apiToken });
  }

  async fetchDatabaseAll(databaseId: string, apiToken: string): Promise<any[]> {
    const client = this.makeClient(apiToken);
    const results: any[] = [];
    let cursor: string | undefined = undefined;

    while (true) {
      const res: any = await (client.databases as any).query({
        database_id: databaseId,
        start_cursor: cursor,
        page_size: 100,
      });

      results.push(...res.results);
      if (!res.has_more) break;
      cursor = res.next_cursor ?? undefined;
    }

    return results;
  }

  async fetchBlockChildrenAll(
    blockId: string,
    apiToken: string,
  ): Promise<any[]> {
    const client = this.makeClient(apiToken);
    const results: any[] = [];
    let cursor: string | undefined = undefined;

    while (true) {
      const res: any = await client.blocks.children.list({
        block_id: blockId,
        start_cursor: cursor,
        page_size: 100,
      });

      results.push(...res.results);
      if (!res.has_more) break;
      cursor = res.next_cursor ?? undefined;
    }

    return results;
  }
}
