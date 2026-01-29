import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { WorklogService } from './worklog.service';
import { SyncNotionInput } from './dto/input/sync-notion.input';
import { SyncNotionOutput } from './dto/output/sync-notion.output';
import { NotionPageOutput } from './dto/output/notion-page.output';
import { WorklogStatusOutput } from './dto/output/worklog-status.output';
import { UploadWorklogsInput } from './dto/input/upload-worklogs.input';
import { UploadWorklogsOutput } from './dto/output/upload-worklogs.output';

@Resolver()
export class WorklogResolver {
  constructor(private worklogService: WorklogService) {}

  @Mutation(() => SyncNotionOutput)
  async syncNotion(@Args('input') input: SyncNotionInput) {
    return this.worklogService.syncNotion(input);
  }

  @Mutation(() => UploadWorklogsOutput)
  async uploadWorklogs(
    @Args('input') input: UploadWorklogsInput,
  ): Promise<UploadWorklogsOutput> {
    const uploadId = this.worklogService.createProgressStream();

    const onProgress = (progress: any) => {
      this.worklogService.emitProgress(uploadId, progress);
    };

    const result = await this.worklogService.uploadFiles(input, onProgress);

    return { uploadId, ...result };
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
