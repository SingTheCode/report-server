import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import { WorklogService } from './worklog.service';
import { UploadWorklogsInput } from './dto/input/upload-worklogs.input';
import {
  UploadWorklogsOutput,
  UploadProgressOutput,
} from './dto/output/upload-worklogs.output';
import { WorklogListOutput } from './dto/output/worklog-list.output';
import { ObjectType, Field } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';

@ObjectType()
class HealthOutput {
  @Field()
  ok: boolean;
}

@Resolver()
export class WorklogResolver {
  constructor(private worklogService: WorklogService) {}

  @Query(() => HealthOutput)
  health(): HealthOutput {
    return { ok: true };
  }

  @Query(() => WorklogListOutput)
  @UseGuards(AuthGuard)
  async worklogs(
    @Context('req') req: { user: { id: string } },
  ): Promise<WorklogListOutput> {
    const worklogs = await this.worklogService.getWorklogsByUserId(req.user.id);
    return {
      worklogs: worklogs.map((w) => ({
        id: w.id!,
        title: w.title,
        createdAt: w.created_at!,
      })),
      total: worklogs.length,
    };
  }

  @Mutation(() => UploadWorklogsOutput)
  @UseGuards(AuthGuard)
  uploadWorklogs(
    @Args('input') input: UploadWorklogsInput,
    @Context('req') req: { user: { id: string } },
  ): UploadWorklogsOutput {
    const uploadId = this.worklogService.createProgressStream();

    const onProgress = (progress: UploadProgressOutput) => {
      this.worklogService.emitProgress(uploadId, progress);
    };

    // 비동기로 처리 (await 하지 않음)
    void this.worklogService
      .uploadFiles(input, req.user.id, onProgress)
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
}
