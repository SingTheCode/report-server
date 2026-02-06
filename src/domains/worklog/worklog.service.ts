import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Subject, Observable } from 'rxjs';
import { WorklogRepository } from './worklog.repository';
import { RagService } from '../rag/rag.service';
import { UploadWorklogsInput } from './dto/input/upload-worklogs.input';
import {
  UploadedFileInfo,
  UploadProgressOutput,
  UploadResultOutput,
} from './dto/output/upload-worklogs.output';

@Injectable()
export class WorklogService {
  private progressStreams = new Map<string, Subject<UploadProgressOutput>>();

  constructor(
    private worklogRepo: WorklogRepository,
    private ragService: RagService,
  ) {}

  private static readonly MAX_CONTENT_SIZE = 50 * 1024; // 50KB

  private sanitizeContent(content: string): string {
    return content.replace(/!\[.*?\]\(data:image\/[^)]+\)/g, '[이미지 제거됨]');
  }

  async uploadFiles(
    input: UploadWorklogsInput,
    onProgress?: (progress: UploadProgressOutput) => void,
  ): Promise<UploadResultOutput> {
    const files = input.files;
    const totalFiles = files.length;
    const successFiles: UploadedFileInfo[] = [];
    const failedFiles: UploadedFileInfo[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      try {
        onProgress?.({
          totalFiles,
          processedFiles: i,
          progress: i / totalFiles,
          currentFile: file.filename,
          status: 'processing',
        });

        // base64 이미지 데이터 제거 (크기 검증 전에 수행)
        const content = this.sanitizeContent(file.content);

        // 파일 크기 검증
        if (content.length > WorklogService.MAX_CONTENT_SIZE) {
          failedFiles.push({
            filename: file.filename,
            error: `파일 크기가 너무 큽니다 (${Math.round(content.length / 1024)}KB > 50KB)`,
          });
          continue;
        }

        onProgress?.({
          totalFiles,
          processedFiles: i,
          progress: (i + 0.5) / totalFiles,
          currentFile: file.filename,
          status: 'embedding',
        });

        const docId = randomUUID();
        await this.ragService.buildEmbeddings({
          documents: [{ id: docId, content, title: file.filename }],
        });

        await this.worklogRepo.saveWorklogs([
          {
            id: docId,
            title: file.filename,
            content,
            synced_at: new Date().toISOString(),
          },
        ]);

        successFiles.push({ filename: file.filename });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        failedFiles.push({
          filename: file.filename,
          error: message,
        });
      }
    }

    return {
      successCount: successFiles.length,
      failedCount: failedFiles.length,
      successFiles,
      failedFiles,
    };
  }

  createProgressStream(): string {
    const uploadId = randomUUID();
    this.progressStreams.set(uploadId, new Subject<UploadProgressOutput>());
    return uploadId;
  }

  getProgressStream(uploadId: string): Observable<UploadProgressOutput> {
    const subject = this.progressStreams.get(uploadId);
    if (!subject) {
      throw new Error('Upload not found');
    }
    return subject.asObservable();
  }

  emitProgress(uploadId: string, progress: UploadProgressOutput): void {
    const subject = this.progressStreams.get(uploadId);
    if (subject) {
      subject.next(progress);
      if (progress.status === 'completed') {
        subject.complete();
        this.progressStreams.delete(uploadId);
      }
    }
  }
}
