import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { GraphqlExceptionFilter } from './graphql-exception.filter';

describe('GraphqlExceptionFilter', () => {
  let filter: GraphqlExceptionFilter;
  let mockContext: { res: { status: jest.Mock } };
  let mockHost: ArgumentsHost;

  beforeEach(() => {
    filter = new GraphqlExceptionFilter();
    mockContext = { res: { status: jest.fn() } };
    mockHost = {
      getType: () => 'graphql',
      getArgs: () => [{}, {}, mockContext, {}],
    } as unknown as ArgumentsHost;
  });

  describe('catch', () => {
    // Given: HttpException이 발생했을 때
    // When: 필터가 예외를 처리하면
    // Then: HTTP 상태는 200이고 원본 예외를 반환한다
    test('HttpException 발생 시 상태 200 유지하고 예외 반환', () => {
      // Given
      const exception = new HttpException(
        'Bad Request',
        HttpStatus.BAD_REQUEST,
      );

      // When
      const result = filter.catch(exception, mockHost);

      // Then
      expect(mockContext.res.status).toHaveBeenCalledWith(200);
      expect(result).toBe(exception);
    });

    // Given: 예상치 못한 에러가 발생했을 때
    // When: 필터가 예외를 처리하면
    // Then: HTTP 상태는 200이고 예외를 반환한다
    test('일반 Error 발생 시 상태 200 유지하고 예외 반환', () => {
      // Given
      const exception = new Error('Unexpected error');

      // When
      const result = filter.catch(exception, mockHost);

      // Then
      expect(mockContext.res.status).toHaveBeenCalledWith(200);
      expect(result).toBe(exception);
    });

    // Given: context가 없는 환경에서
    // When: 필터가 예외를 처리하면
    // Then: 에러 없이 예외를 반환한다
    test('context가 없어도 에러 없이 동작', () => {
      // Given
      const exception = new Error('Test');
      const hostWithoutContext = {
        getType: () => 'graphql',
        getArgs: () => [{}, {}, null, {}],
      } as unknown as ArgumentsHost;

      // When & Then
      expect(() => filter.catch(exception, hostWithoutContext)).not.toThrow();
    });
  });
});
