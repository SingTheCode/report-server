import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { AuthService } from '../../domains/auth/auth.service';

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
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
    } as ExecutionContext;

    guard = new AuthGuard(authService);
  });

  describe('canActivate', () => {
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
});
