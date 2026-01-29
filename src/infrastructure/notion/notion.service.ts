import { Injectable } from '@nestjs/common';
import { Client } from '@notionhq/client';
import type {
  PageObjectResponse,
  BlockObjectResponse,
} from '@notionhq/client/build/src/api-endpoints';

interface QueryDatabaseResult {
  results: Array<{ id: string; properties?: unknown }>;
  has_more: boolean;
  next_cursor: string | null;
}

interface ListBlockChildrenResult {
  results: Array<{ id: string; type?: string }>;
  has_more: boolean;
  next_cursor: string | null;
}

@Injectable()
export class NotionService {
  private makeClient(apiToken: string): Client {
    return new Client({ auth: apiToken });
  }

  async fetchDatabaseAll(
    databaseId: string,
    apiToken: string,
  ): Promise<PageObjectResponse[]> {
    const client = this.makeClient(apiToken);
    const results: PageObjectResponse[] = [];
    let cursor: string | undefined = undefined;

    while (true) {
      const res = (await (
        client.databases as unknown as {
          query: (params: {
            database_id: string;
            start_cursor?: string;
            page_size?: number;
          }) => Promise<QueryDatabaseResult>;
        }
      ).query({
        database_id: databaseId,
        start_cursor: cursor,
        page_size: 100,
      })) as QueryDatabaseResult;

      for (const item of res.results) {
        if ('properties' in item) {
          results.push(item as unknown as PageObjectResponse);
        }
      }
      if (!res.has_more) break;
      cursor = res.next_cursor ?? undefined;
    }

    return results;
  }

  async fetchBlockChildrenAll(
    blockId: string,
    apiToken: string,
  ): Promise<BlockObjectResponse[]> {
    const client = this.makeClient(apiToken);
    const results: BlockObjectResponse[] = [];
    let cursor: string | undefined = undefined;

    while (true) {
      const res = (await client.blocks.children.list({
        block_id: blockId,
        start_cursor: cursor,
        page_size: 100,
      })) as unknown as ListBlockChildrenResult;

      for (const item of res.results) {
        if ('type' in item) {
          results.push(item as unknown as BlockObjectResponse);
        }
      }
      if (!res.has_more) break;
      cursor = res.next_cursor ?? undefined;
    }

    return results;
  }
}
