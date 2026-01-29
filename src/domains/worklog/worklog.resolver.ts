import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { WorklogService } from './worklog.service';
import { SyncNotionInput } from './dto/input/sync-notion.input';
import { SyncNotionOutput } from './dto/output/sync-notion.output';
import { NotionPageOutput } from './dto/output/notion-page.output';
import { WorklogStatusOutput } from './dto/output/worklog-status.output';

@Resolver()
export class WorklogResolver {
  constructor(private worklogService: WorklogService) {}

  @Mutation(() => SyncNotionOutput)
  async syncNotion(@Args('input') input: SyncNotionInput) {
    return this.worklogService.syncNotion(input);
  }

  @Query(() => [NotionPageOutput])
  async worklogs() {
    return this.worklogService.getWorklogs();
  }

  @Query(() => WorklogStatusOutput)
  async worklogStatus() {
    return this.worklogService.getStatus();
  }
}
