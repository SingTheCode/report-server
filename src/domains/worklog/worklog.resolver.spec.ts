import { Test, TestingModule } from '@nestjs/testing';
import { WorklogResolver } from './worklog.resolver';
import { WorklogService } from './worklog.service';

describe('WorklogResolver', () => {
  let resolver: WorklogResolver;
  let mockWorklogService: Partial<WorklogService>;

  beforeEach(async () => {
    mockWorklogService = {
      syncNotion: jest.fn(),
      getWorklogs: jest.fn(),
      getStatus: jest.fn(),
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
    // Then: 업로드 결과와 uploadId를 반환한다
    test('파일을 업로드하고 결과를 반환한다', async () => {
      // Given
      const mockInput = { files: [] };
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
      const result = await resolver.uploadWorklogs(mockInput);

      // Then
      expect(result.uploadId).toBe('upload-123');
      expect(result.successCount).toBe(2);
      expect(result.failedCount).toBe(0);
      expect(mockWorklogService.createProgressStream).toHaveBeenCalled();
      expect(mockWorklogService.uploadFiles).toHaveBeenCalled();
    });

    // Given: 업로드 중 에러가 발생할 때
    // When: uploadWorklogs mutation을 호출하면
    // Then: 실패한 파일 정보를 포함한 결과를 반환한다
    test('실패한 파일 정보를 포함한 결과를 반환한다', async () => {
      // Given
      const mockInput = { files: [] };
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
      const result = await resolver.uploadWorklogs(mockInput);

      // Then
      expect(result.successCount).toBe(1);
      expect(result.failedCount).toBe(1);
      expect(result.failedFiles[0].error).toBe('Parse error');
    });
  });
});
