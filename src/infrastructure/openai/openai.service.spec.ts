import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { OpenAiService } from './openai.service';

// OpenAI 클라이언트 모킹
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    embeddings: {
      create: jest.fn(),
    },
  }));
});

describe('OpenAiService', () => {
  let service: OpenAiService;
  let mockEmbeddingsCreate: jest.Mock;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpenAiService,
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('test-api-key') },
        },
      ],
    }).compile();

    service = module.get<OpenAiService>(OpenAiService);
    mockEmbeddingsCreate = (service as any).client.embeddings.create;
  });

  describe('countTokens', () => {
    // Given: 텍스트가 주어졌을 때
    // When: 토큰 수를 계산하면
    // Then: 0보다 큰 숫자를 반환한다
    test('텍스트의 토큰 수를 반환한다', () => {
      // Given
      const text = 'Hello, world!';

      // When
      const count = service.countTokens(text);

      // Then
      expect(count).toBeGreaterThan(0);
    });

    // Given: 빈 텍스트가 주어졌을 때
    // When: 토큰 수를 계산하면
    // Then: 0을 반환한다
    test('빈 텍스트는 0을 반환한다', () => {
      // Given & When
      const count = service.countTokens('');

      // Then
      expect(count).toBe(0);
    });
  });

  describe('embedText', () => {
    // Given: 정상적인 텍스트가 주어졌을 때
    // When: 임베딩을 요청하면
    // Then: 벡터 배열을 반환한다
    test('텍스트를 임베딩 벡터로 변환한다', async () => {
      // Given
      const text = 'Test text';
      const mockVector = [0.1, 0.2, 0.3];
      mockEmbeddingsCreate.mockResolvedValue({
        data: [{ embedding: mockVector }],
      });

      // When
      const result = await service.embedText(text);

      // Then
      expect(result).toEqual(mockVector);
    });

    // Given: 8192 토큰을 초과하는 텍스트가 주어졌을 때
    // When: 임베딩을 요청하면
    // Then: 에러를 던진다
    test('토큰 제한 초과 시 에러를 던진다', async () => {
      // Given
      const longText = 'a '.repeat(10000);

      // When & Then
      await expect(service.embedText(longText)).rejects.toThrow(/too large/i);
    });
  });

  describe('embedBatch', () => {
    // Given: 여러 텍스트가 주어졌을 때
    // When: 배치 임베딩을 요청하면
    // Then: 각 텍스트에 대한 벡터 배열을 반환한다
    test('여러 텍스트를 배치로 임베딩한다', async () => {
      // Given
      const texts = ['text1', 'text2'];
      const mockVectors = [
        [0.1, 0.2],
        [0.3, 0.4],
      ];
      mockEmbeddingsCreate.mockResolvedValue({
        data: mockVectors.map((v) => ({ embedding: v })),
      });

      // When
      const result = await service.embedBatch(texts);

      // Then
      expect(result).toEqual(mockVectors);
    });

    // Given: 2048개를 초과하는 텍스트가 주어졌을 때
    // When: 배치 임베딩을 요청하면
    // Then: 에러를 던진다
    test('배치 크기 제한 초과 시 에러를 던진다', async () => {
      // Given
      const texts = Array(2049).fill('text');

      // When & Then
      await expect(service.embedBatch(texts)).rejects.toThrow(/too many/i);
    });
  });

  describe('embedBatchSafe', () => {
    // Given: 대량의 텍스트가 주어졌을 때
    // When: 안전한 배치 임베딩을 요청하면
    // Then: 청크로 나누어 처리하고 전체 결과를 반환한다
    test('대량 텍스트를 청크로 나누어 처리한다', async () => {
      // Given
      const texts = Array(300).fill('text');
      mockEmbeddingsCreate.mockImplementation(({ input }) => ({
        data: input.map(() => ({ embedding: [0.1] })),
      }));

      // When
      const result = await service.embedBatchSafe(texts, 100);

      // Then
      expect(mockEmbeddingsCreate).toHaveBeenCalledTimes(3);
      expect(result).toHaveLength(300);
    });
  });

  describe('재시도 로직', () => {
    // Given: 429 에러가 발생했을 때
    // When: 재시도 후 성공하면
    // Then: 결과를 반환한다
    test('429 에러 시 재시도 후 성공', async () => {
      // Given
      const mockVector = [0.1, 0.2];
      mockEmbeddingsCreate
        .mockRejectedValueOnce({ status: 429 })
        .mockResolvedValueOnce({ data: [{ embedding: mockVector }] });

      // When
      const result = await service.embedText('test');

      // Then
      expect(result).toEqual(mockVector);
      expect(mockEmbeddingsCreate).toHaveBeenCalledTimes(2);
    });

    // Given: 400 에러가 발생했을 때
    // When: 재시도 없이
    // Then: 즉시 에러를 던진다
    test('400 에러는 재시도하지 않는다', async () => {
      // Given
      mockEmbeddingsCreate.mockRejectedValue({ status: 400 });

      // When & Then
      await expect(service.embedText('test')).rejects.toMatchObject({
        status: 400,
      });
      expect(mockEmbeddingsCreate).toHaveBeenCalledTimes(1);
    });
  });
});
