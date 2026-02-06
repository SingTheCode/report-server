import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { AuthService } from '../../domains/auth/auth.service';

jest.mock('@nestjs/graphql', () => ({
  GqlExecutionContext: {
    create: jest.fn(),
  },
}));

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let authService: jest.Mocked<AuthService>;
  let mockRequest: any;
  let mockResponse: any;
  let mockContext: ExecutionContext;

  beforeEach(() => {
    authService = {
      getMe: jest.fn(),
      refreshTokens: jest.fn(),
    } as any;

    mockRequest = { cookies: {} };
    mockResponse = { cookie: jest.fn() };

    mockContext = {
      getType: () => 'http',
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
    } as ExecutionContext;

    guard = new AuthGuard(authService);
  });

  describe('canActivate - HTTP', () => {
    test('access token이 유효하면 통과한다', async () => {
      // Given
      mockRequest.cookies = { sb_access_token: 'valid-token' };
      authService.getMe.mockResolvedValue({ user: { id: '1', email: 'test@test.com' } });

      // When
      const result = await guard.canActivate(mockContext);

      // Then
      expect(result).toBe(true);
      expect(mockRequest.user).toEqual({ id: '1', email: 'test@test.com' });
    });

    test('access token 만료 시 refresh token으로 갱신 후 통과한다', async () => {
      // Given
      mockRequest.cookies = {
        sb_access_token: 'expired-token',
        sb_refresh_token: 'valid-refresh-token',
      };
      authService.getMe
        .mockRejectedValueOnce(new UnauthorizedException())
        .mockResolvedValueOnce({ user: { id: '1', email: 'test@test.com' } });
      authService.refreshTokens.mockResolvedValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });

      // When
      const result = await guard.canActivate(mockContext);

      // Then
      expect(result).toBe(true);
      expect(authService.refreshTokens).toHaveBeenCalledWith('valid-refresh-token');
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'sb_access_token',
        'new-access-token',
        expect.any(Object),
      );
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'sb_refresh_token',
        'new-refresh-token',
        expect.any(Object),
      );
    });

    test('토큰이 모두 없으면 UnauthorizedException을 던진다', async () => {
      // Given
      mockRequest.cookies = {};

      // When & Then
      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    test('refresh token도 만료되면 UnauthorizedException을 던진다', async () => {
      // Given
      mockRequest.cookies = {
        sb_access_token: 'expired-token',
        sb_refresh_token: 'expired-refresh-token',
      };
      authService.getMe.mockRejectedValue(new UnauthorizedException());
      authService.refreshTokens.mockRejectedValue(new UnauthorizedException());

      // When & Then
      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('canActivate - GraphQL', () => {
    test('GraphQL context에서 req가 undefined이면 UnauthorizedException을 던진다', async () => {
      // Given: GraphQL context에서 req가 undefined인 경우
      const gqlContext = {
        getType: () => 'graphql',
        switchToHttp: () => ({
          getRequest: () => undefined,
          getResponse: () => undefined,
        }),
      } as unknown as ExecutionContext;

      const { GqlExecutionContext } = jest.requireMock('@nestjs/graphql');
      GqlExecutionContext.create = jest.fn().mockReturnValue({
        getContext: () => ({ req: undefined }),
      });

      // When & Then: UnauthorizedException이 발생해야 한다
      await expect(guard.canActivate(gqlContext)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    // Given: GraphQL context에서 요청이 올 때
    // When: canActivate를 호출하면
    // Then: GqlExecutionContext에서 request를 가져와 인증한다
    test('GraphQL context에서 access token이 유효하면 통과한다', async () => {
      // Given
      mockRequest.cookies = { sb_access_token: 'valid-token' };
      const gqlContext = {
        getType: () => 'graphql',
        getArgs: () => [],
        getClass: () => ({}),
        getHandler: () => ({}),
        getArgByIndex: () => ({}),
        switchToHttp: () => ({
          getRequest: () => undefined,
          getResponse: () => undefined,
        }),
        switchToRpc: () => ({}),
        switchToWs: () => ({}),
      } as unknown as ExecutionContext;

      // GqlExecutionContext.create를 mock
      const { GqlExecutionContext } = jest.requireMock('@nestjs/graphql');
      GqlExecutionContext.create = jest.fn().mockReturnValue({
        getContext: () => ({ req: mockRequest }),
      });

      authService.getMe.mockResolvedValue({ user: { id: '1', email: 'test@test.com' } });

      // When
      const result = await guard.canActivate(gqlContext);

      // Then
      expect(result).toBe(true);
      expect(mockRequest.user).toEqual({ id: '1', email: 'test@test.com' });
    });
  });
});
