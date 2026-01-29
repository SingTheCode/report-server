import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { WorklogService } from './worklog.service';
import { SyncNotionInput } from './dto/input/sync-notion.input';
import { SyncNotionOutput } from './dto/output/sync-notion.output';
import { NotionPageOutput } from './dto/output/notion-page.output';
import { WorklogStatusOutput } from './dto/output/worklog-status.output';
import { UploadWorklogsInput } from './dto/input/upload-worklogs.input';
import {
  UploadWorklogsOutput,
  UploadProgressOutput,
} from './dto/output/upload-worklogs.output';

@Resolver()
export class WorklogResolver {
  constructor(private worklogService: WorklogService) {}

  @Mutation(() => SyncNotionOutput)
  async syncNotion(@Args('input') input: SyncNotionInput) {
    return this.worklogService.syncNotion(input);
  }

  @Mutation(() => UploadWorklogsOutput)
  uploadWorklogs(
    @Args('input') input: UploadWorklogsInput,
  ): UploadWorklogsOutput {
    const uploadId = this.worklogService.createProgressStream();

    const onProgress = (progress: UploadProgressOutput) => {
      this.worklogService.emitProgress(uploadId, progress);
    };

    // 비동기로 처리 (await 하지 않음)
    void this.worklogService
      .uploadFiles(input, onProgress)
      .then((result) => {
        this.worklogService.emitProgress(uploadId, {
          totalFiles: result.successCount + result.failedCount,
          processedFiles: result.successCount + result.failedCount,
          progress: 1,
          currentFile: '',
          status: 'completed',
          result,
        });
      })
      .catch((error) => {
        this.worklogService.emitProgress(uploadId, {
          totalFiles: input.files.length,
          processedFiles: 0,
          progress: 0,
          currentFile: '',
          status: 'error',
          result: {
            successCount: 0,
            failedCount: input.files.length,
            successFiles: [],
            failedFiles: input.files.map((f) => ({
              filename: f.filename,
              error: error.message || 'Unknown error',
            })),
          },
        });
      });

    return { uploadId };
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
