import { Test, TestingModule } from '@nestjs/testing';
import { WorklogService } from './worklog.service';
import { WorklogRepository } from './worklog.repository';
import { RagService } from '../rag/rag.service';

describe('WorklogService', () => {
  let service: WorklogService;
  let mockWorklogRepo: Partial<WorklogRepository>;
  let mockRagService: Partial<RagService>;

  beforeEach(async () => {
    mockWorklogRepo = {
      saveWorklogs: jest.fn(),
    };

    mockRagService = {
      buildEmbeddings: jest.fn().mockResolvedValue({
        success: true,
        documentCount: 1,
        chunkCount: 1,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorklogService,
        { provide: WorklogRepository, useValue: mockWorklogRepo },
        { provide: RagService, useValue: mockRagService },
      ],
    }).compile();

    service = module.get<WorklogService>(WorklogService);
  });

  describe('uploadFiles', () => {
    // Given: 파일이 업로드될 때
    // When: uploadFiles를 호출하면
    // Then: 파일을 파싱하고 임베딩을 생성하여 저장한다
    test('파일을 업로드하고 임베딩을 생성한다', async () => {
      // Given
      const mockFile = {
        filename: 'test.md',
        content: '# Test Content\nThis is test content.',
      };

      // When
      const result = await service.uploadFiles({
        files: [mockFile],
      });

      // Then
      expect(result.successCount).toBe(1);
      expect(result.failedCount).toBe(0);
      expect(result.successFiles).toHaveLength(1);
      expect(result.successFiles[0].filename).toBe('test.md');
      expect(mockRagService.buildEmbeddings).toHaveBeenCalled();
      expect(mockWorklogRepo.saveWorklogs).toHaveBeenCalled();
    });

    // Given: 여러 파일이 업로드될 때
    // When: uploadFiles를 호출하면
    // Then: 모든 파일을 처리하고 결과를 반환한다
    test('여러 파일을 업로드한다', async () => {
      // Given
      const files = [
        { filename: 'file1.md', content: 'Content 1' },
        { filename: 'file2.md', content: 'Content 2' },
      ];

      // When
      const result = await service.uploadFiles({ files });

      // Then
      expect(result.successCount).toBe(2);
      expect(result.failedCount).toBe(0);
      expect(result.successFiles).toHaveLength(2);
    });

    // Given: 파일 처리 중 에러가 발생할 때
    // When: uploadFiles를 호출하면
    // Then: 실패한 파일 정보를 반환한다
    test('실패한 파일 정보를 반환한다', async () => {
      // Given
      const mockFile = {
        filename: 'error.md',
        content: 'Content',
      };

      (mockRagService.buildEmbeddings as jest.Mock).mockRejectedValueOnce(
        new Error('Embedding failed'),
      );

      // When
      const result = await service.uploadFiles({
        files: [mockFile],
      });

      // Then
      expect(result.successCount).toBe(0);
      expect(result.failedCount).toBe(1);
      expect(result.failedFiles).toHaveLength(1);
      expect(result.failedFiles[0].filename).toBe('error.md');
      expect(result.failedFiles[0].error).toBe('Embedding failed');
    });

    // Given: 진행현황 콜백이 제공될 때
    // When: uploadFiles를 호출하면
    // Then: 각 파일 처리 시 진행현황을 전송한다
    test('진행현황을 콜백으로 전송한다', async () => {
      // Given
      const mockFile = {
        filename: 'test.md',
        content: 'Content',
      };

      const progressCallback = jest.fn();

      // When
      await service.uploadFiles({ files: [mockFile] }, progressCallback);

      // Then
      expect(progressCallback).toHaveBeenCalled();
      // processing, embedding 상태가 호출됨
      const calls = (
        progressCallback.mock.calls as Array<[{ status: string }]>
      ).map((c) => c[0].status);
      expect(calls).toContain('processing');
      expect(calls).toContain('embedding');
    });

    // Given: 파일 크기가 50KB를 초과할 때
    // When: uploadFiles를 호출하면
    // Then: 해당 파일은 실패 처리하고 다음 파일을 계속 진행한다
    test('50KB 초과 파일은 실패 처리하고 다음 파일 계속 진행', async () => {
      // Given
      const largeContent = 'x'.repeat(51 * 1024); // 51KB
      const files = [
        { filename: 'large.md', content: largeContent },
        { filename: 'normal.md', content: 'Normal content' },
      ];

      // When
      const result = await service.uploadFiles({ files });

      // Then
      expect(result.successCount).toBe(1);
      expect(result.failedCount).toBe(1);
      expect(result.failedFiles[0].filename).toBe('large.md');
      expect(result.failedFiles[0].error).toContain('50KB');
      expect(result.successFiles[0].filename).toBe('normal.md');
    });

    // Given: base64 이미지 제거 후 50KB 이하가 되는 파일일 때
    // When: uploadFiles를 호출하면
    // Then: 성공적으로 처리한다
    test('base64 이미지 제거 후 50KB 이하면 성공 처리', async () => {
      // Given: 이미지 데이터로 50KB 초과하지만, 제거 후 50KB 이하
      const base64Image = 'data:image/png;base64,' + 'x'.repeat(40 * 1024);
      const contentWithLargeImage = `# Title\n![image](${base64Image})\nSmall text`;
      const mockFile = {
        filename: 'with-large-image.md',
        content: contentWithLargeImage,
      };

      // When
      const result = await service.uploadFiles({ files: [mockFile] });

      // Then
      expect(result.successCount).toBe(1);
      expect(result.failedCount).toBe(0);
    });

    // Given: 파일에 base64 이미지 데이터가 포함되어 있을 때
    // When: uploadFiles를 호출하면
    // Then: base64 이미지 데이터를 제거하고 처리한다
    test('base64 이미지 데이터를 제거하고 처리한다', async () => {
      // Given
      const contentWithBase64 =
        '# Title\n![image](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA)\nSome text';
      const mockFile = {
        filename: 'with-image.md',
        content: contentWithBase64,
      };

      // When
      await service.uploadFiles({ files: [mockFile] });

      // Then
      const savedContent = (mockRagService.buildEmbeddings as jest.Mock).mock
        .calls[0][0].documents[0].content;
      expect(savedContent).not.toContain('data:image');
      expect(savedContent).toContain('# Title');
      expect(savedContent).toContain('Some text');
    });

    // Given: 첫 번째 파일에서 에러가 발생할 때
    // When: uploadFiles를 호출하면
    // Then: 다음 파일을 계속 처리한다
    test('에러 발생해도 다음 파일 계속 진행', async () => {
      // Given
      const files = [
        { filename: 'error.md', content: 'Content 1' },
        { filename: 'success.md', content: 'Content 2' },
      ];

      (mockRagService.buildEmbeddings as jest.Mock)
        .mockRejectedValueOnce(new Error('First file error'))
        .mockResolvedValueOnce({ success: true });

      // When
      const result = await service.uploadFiles({ files });

      // Then
      expect(result.successCount).toBe(1);
      expect(result.failedCount).toBe(1);
      expect(result.failedFiles[0].filename).toBe('error.md');
      expect(result.successFiles[0].filename).toBe('success.md');
    });
  });

  describe('getProgressStream', () => {
    // Given: 업로드 ID로 스트림이 등록되어 있을 때
    // When: getProgressStream을 호출하면
    // Then: Observable 스트림을 반환한다
    test('등록된 스트림을 반환한다', () => {
      // Given
      const uploadId = service.createProgressStream();

      // When
      const stream = service.getProgressStream(uploadId);

      // Then
      expect(stream).toBeDefined();
      expect(typeof stream.subscribe).toBe('function');
    });

    // Given: 존재하지 않는 업로드 ID일 때
    // When: getProgressStream을 호출하면
    // Then: 에러를 던진다
    test('존재하지 않는 ID는 에러를 던진다', () => {
      // Given
      const uploadId = 'non-existent-id';

      // When & Then
      expect(() => service.getProgressStream(uploadId)).toThrow(
        'Upload not found',
      );
    });
  });
});
