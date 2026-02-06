import { Test, TestingModule } from '@nestjs/testing';
import { WorklogController } from './worklog.controller';
import { WorklogService } from './worklog.service';
import { Subject } from 'rxjs';
import { UploadProgressOutput } from './dto/output/upload-worklogs.output';

describe('WorklogController', () => {
  let controller: WorklogController;
  let mockWorklogService: Partial<WorklogService>;

  beforeEach(async () => {
    mockWorklogService = {
      getProgressStream: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WorklogController],
      providers: [{ provide: WorklogService, useValue: mockWorklogService }],
    }).compile();

    controller = module.get<WorklogController>(WorklogController);
  });

  describe('uploadProgress', () => {
    // Given: 업로드가 진행 중일 때
    // When: SSE 엔드포인트에 연결하면
    // Then: 진행현황 스트림을 반환한다
    test('진행현황 스트림을 반환한다', (done) => {
      // Given
      const uploadId = 'test-upload-id';
      const progressSubject = new Subject<UploadProgressOutput>();

      (mockWorklogService.getProgressStream as jest.Mock).mockReturnValue(
        progressSubject.asObservable(),
      );

      // When
      const stream = controller.uploadProgress(uploadId);

      // Then
      const receivedData: Array<{ data: UploadProgressOutput }> = [];
      stream.subscribe({
        next: (event) =>
          receivedData.push(event as { data: UploadProgressOutput }),
        complete: () => {
          expect(receivedData).toHaveLength(2);
          expect(receivedData[0].data.progress).toBe(0.5);
          expect(receivedData[1].data.status).toBe('completed');
          done();
        },
      });

      // 진행현황 전송
      progressSubject.next({
        totalFiles: 1,
        processedFiles: 0,
        progress: 0.5,
        currentFile: 'test.md',
        status: 'processing',
      });
      progressSubject.next({
        totalFiles: 1,
        processedFiles: 1,
        progress: 1,
        currentFile: '',
        status: 'completed',
      });
      progressSubject.complete();
    });

    // Given: 존재하지 않는 uploadId일 때
    // When: SSE 엔드포인트에 연결하면
    // Then: 에러를 반환한다
    test('존재하지 않는 uploadId는 에러를 반환한다', () => {
      // Given
      const uploadId = 'non-existent-id';
      (mockWorklogService.getProgressStream as jest.Mock).mockImplementation(
        () => {
          throw new Error('Upload not found');
        },
      );

      // When & Then
      expect(() => controller.uploadProgress(uploadId)).toThrow(
        'Upload not found',
      );
    });
  });
});
