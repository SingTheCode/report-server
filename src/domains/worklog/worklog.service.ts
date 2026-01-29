import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Subject, Observable } from 'rxjs';
import { WorklogRepository } from './worklog.repository';
import { NotionService } from '../../infrastructure/notion/notion.service';
import { RagService } from '../rag/rag.service';
import { SyncNotionInput } from './dto/input/sync-notion.input';
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

        const content = file.content;

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
            syncedAt: new Date(),
          },
        ]);

        successFiles.push({ filename: file.filename });
      } catch (error) {
        failedFiles.push({
          filename: file.filename,
          error: error.message,
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
