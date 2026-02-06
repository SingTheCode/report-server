import { Test, TestingModule } from '@nestjs/testing';
import { WorklogResolver } from './worklog.resolver';
import { WorklogService } from './worklog.service';

describe('WorklogResolver', () => {
  let resolver: WorklogResolver;
  let mockWorklogService: Partial<WorklogService>;

  beforeEach(async () => {
    mockWorklogService = {
      uploadFiles: jest.fn(),
      createProgressStream: jest.fn(),
      emitProgress: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorklogResolver,
        { provide: WorklogService, useValue: mockWorklogService },
      ],
    }).compile();

    resolver = module.get<WorklogResolver>(WorklogResolver);
  });

  describe('uploadWorklogs', () => {
    // Given: 파일이 업로드될 때
    // When: uploadWorklogs mutation을 호출하면
    // Then: uploadId만 반환하고 처리는 비동기로 진행된다
    test('uploadId만 반환하고 처리는 비동기로 진행된다', () => {
      // Given
      const mockInput = { files: [], user_id: 'user-1' };
      const mockResult = {
        successCount: 2,
        failedCount: 0,
        successFiles: [{ filename: 'file1.md' }, { filename: 'file2.md' }],
        failedFiles: [],
      };

      (mockWorklogService.createProgressStream as jest.Mock).mockReturnValue(
        'upload-123',
      );
      (mockWorklogService.uploadFiles as jest.Mock).mockResolvedValue(
        mockResult,
      );

      // When
      const result = resolver.uploadWorklogs(mockInput);

      // Then
      expect(result.uploadId).toBe('upload-123');
      expect(result).toEqual({ uploadId: 'upload-123' });
      expect(mockWorklogService.createProgressStream).toHaveBeenCalled();
    });

    // Given: 업로드 완료 시
    // When: 비동기 처리가 완료되면
    // Then: emitProgress로 결과를 전송한다
    test('비동기 처리 완료 시 emitProgress로 결과를 전송한다', async () => {
      // Given
      const mockInput = { files: [], user_id: 'user-1' };
      const mockResult = {
        successCount: 1,
        failedCount: 1,
        successFiles: [{ filename: 'file1.md' }],
        failedFiles: [{ filename: 'file2.md', error: 'Parse error' }],
      };

      (mockWorklogService.createProgressStream as jest.Mock).mockReturnValue(
        'upload-456',
      );
      (mockWorklogService.uploadFiles as jest.Mock).mockResolvedValue(
        mockResult,
      );

      // When
      resolver.uploadWorklogs(mockInput);

      // 비동기 처리 완료 대기
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Then
      expect(mockWorklogService.emitProgress).toHaveBeenCalledWith(
        'upload-456',
        expect.objectContaining({
          status: 'completed',
          result: mockResult,
        }),
      );
    });

    // Given: 업로드 처리 중 에러가 발생할 때
    // When: uploadFiles가 reject되면
    // Then: emitProgress로 에러 상태를 전송한다
    test('업로드 처리 중 에러 발생 시 emitProgress로 에러 상태를 전송한다', async () => {
      // Given
      const mockInput = {
        files: [
          { filename: 'file1.md', content: 'content1' },
          { filename: 'file2.md', content: 'content2' },
        ],
        user_id: 'user-1',
      };

      (mockWorklogService.createProgressStream as jest.Mock).mockReturnValue(
        'upload-789',
      );
      (mockWorklogService.uploadFiles as jest.Mock).mockRejectedValue(
        new Error('Embedding failed'),
      );

      // When
      resolver.uploadWorklogs(mockInput);

      // 비동기 처리 완료 대기
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Then
      expect(mockWorklogService.emitProgress).toHaveBeenCalledWith(
        'upload-789',
        expect.objectContaining({
          status: 'error',
          result: expect.objectContaining({
            successCount: 0,
            failedCount: 2,
          }),
        }),
      );
    });
  });
});
