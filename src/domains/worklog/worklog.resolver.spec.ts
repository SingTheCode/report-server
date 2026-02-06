import { Test, TestingModule } from '@nestjs/testing';
import { WorklogResolver } from './worklog.resolver';
import { WorklogService } from './worklog.service';
import { AuthGuard } from '../../common/guards/auth.guard';

describe('WorklogResolver', () => {
  let resolver: WorklogResolver;
  let mockWorklogService: Partial<WorklogService>;

  beforeEach(async () => {
    mockWorklogService = {
      uploadFiles: jest.fn(),
      createProgressStream: jest.fn(),
      emitProgress: jest.fn(),
      getWorklogsByUserId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorklogResolver,
        { provide: WorklogService, useValue: mockWorklogService },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    resolver = module.get<WorklogResolver>(WorklogResolver);
  });

  describe('worklogs', () => {
    // Given: 인증된 사용자가 요청할 때
    // When: worklogs query를 호출하면
    // Then: 해당 사용자의 worklog 목록을 반환한다
    test('사용자의 worklog 목록을 반환한다', async () => {
      // Given
      const mockReq = { user: { id: 'user-123' } };
      const mockWorklogs = [
        { id: 1, title: 'Test1', created_at: '2024-01-01' },
        { id: 2, title: 'Test2', created_at: '2024-01-02' },
      ];
      (mockWorklogService.getWorklogsByUserId as jest.Mock).mockResolvedValue(
        mockWorklogs,
      );

      // When
      const result = await resolver.worklogs(mockReq);

      // Then
      expect(result.total).toBe(2);
      expect(result.worklogs).toHaveLength(2);
      expect(result.worklogs[0]).toEqual({
        id: 1,
        title: 'Test1',
        createdAt: '2024-01-01',
      });
      expect(mockWorklogService.getWorklogsByUserId).toHaveBeenCalledWith(
        'user-123',
      );
    });
  });

  describe('uploadWorklogs', () => {
    // Given: 파일이 업로드될 때
    // When: uploadWorklogs mutation을 호출하면
    // Then: uploadId만 반환하고 user.id를 서비스에 전달한다
    test('context에서 user.id를 추출하여 서비스에 전달한다', () => {
      // Given
      const mockInput = { files: [] };
      const mockReq = { user: { id: 'user-123', email: 'test@test.com' } };
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
      const result = resolver.uploadWorklogs(mockInput, mockReq);

      // Then
      expect(result.uploadId).toBe('upload-123');
      expect(mockWorklogService.uploadFiles).toHaveBeenCalledWith(
        mockInput,
        'user-123',
        expect.any(Function),
      );
    });

    // Given: 업로드 완료 시
    // When: 비동기 처리가 완료되면
    // Then: emitProgress로 결과를 전송한다
    test('비동기 처리 완료 시 emitProgress로 결과를 전송한다', async () => {
      // Given
      const mockInput = { files: [] };
      const mockReq = { user: { id: 'user-456', email: 'test@test.com' } };
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
      resolver.uploadWorklogs(mockInput, mockReq);

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
      };
      const mockReq = { user: { id: 'user-789', email: 'test@test.com' } };

      (mockWorklogService.createProgressStream as jest.Mock).mockReturnValue(
        'upload-789',
      );
      (mockWorklogService.uploadFiles as jest.Mock).mockRejectedValue(
        new Error('Embedding failed'),
      );

      // When
      resolver.uploadWorklogs(mockInput, mockReq);

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
