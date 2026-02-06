import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let mockAuthService: Partial<AuthService>;
  let mockConfigService: Partial<ConfigService>;

  beforeEach(async () => {
    mockAuthService = {
      getGoogleLoginUrl: jest
        .fn()
        .mockResolvedValue({ url: 'https://google.com/oauth' }),
      handleCallback: jest.fn().mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      }),
      getMe: jest
        .fn()
        .mockResolvedValue({ user: { id: 'user-1', email: 'test@test.com' } }),
    };

    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'CLIENT_DOMAIN') return 'http://localhost:3000';
        if (key === 'NODE_ENV') return 'development';
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  describe('GET /auth/login/google', () => {
    // Given: 정상적인 요청일 때
    // When: loginGoogle을 호출하면
    // Then: { url: string }을 반환한다
    test('Google OAuth URL을 반환한다', async () => {
      // When
      const result = await controller.loginGoogle();

      // Then
      expect(result.url).toBe('https://google.com/oauth');
    });
  });

  describe('GET /auth/callback', () => {
    // Given: 유효한 code가 쿼리에 있을 때
    // When: callback을 호출하면
    // Then: 쿠키 정보와 리다이렉트 URL을 반환한다
    test('콜백 처리 후 쿠키와 리다이렉트 URL 반환', async () => {
      // When
      const result = await controller.callback('valid-code');

      // Then
      expect(result.url).toBe('http://localhost:3000/chat');
      expect(result.cookies).toHaveLength(2);
      expect(result.cookies?.[0]).toEqual({
        name: 'sb_access_token',
        value: 'access-token',
        options: expect.objectContaining({ httpOnly: true }),
      });
      expect(result.cookies?.[1]).toEqual({
        name: 'sb_refresh_token',
        value: 'refresh-token',
        options: expect.objectContaining({ httpOnly: true }),
      });
    });

    // Given: code가 없을 때
    // When: callback을 호출하면
    // Then: 에러 페이지 URL을 반환한다
    test('code 없으면 에러 리다이렉트', async () => {
      // Given
      (mockAuthService.handleCallback as jest.Mock).mockRejectedValue(
        new Error('no code'),
      );

      // When
      const result = await controller.callback('');

      // Then
      expect(result.url).toBe('http://localhost:3000/login?error=auth_failed');
      expect(result.cookies).toBeUndefined();
    });
  });

  describe('GET /auth/me', () => {
    // Given: 유효한 쿠키가 있을 때
    // When: getMe를 호출하면
    // Then: 사용자 정보를 반환한다
    test('현재 사용자 정보를 반환한다', async () => {
      // When
      const result = await controller.getMe('valid-token');

      // Then
      expect(result.user?.id).toBe('user-1');
      expect(mockAuthService.getMe).toHaveBeenCalledWith('valid-token');
    });

    // Given: 쿠키가 없을 때
    // When: getMe를 호출하면
    // Then: 빈 문자열로 서비스 호출
    test('토큰이 없으면 빈 문자열로 호출', async () => {
      // When
      await controller.getMe(undefined as any);

      // Then
      expect(mockAuthService.getMe).toHaveBeenCalledWith('');
    });
  });

  describe('POST /auth/logout', () => {
    // Given: 로그인된 상태일 때
    // When: logout을 호출하면
    // Then: 삭제할 쿠키 목록과 성공 응답을 반환한다
    test('로그아웃 시 삭제할 쿠키 목록 반환', () => {
      // When
      const result = controller.logout();

      // Then
      expect(result.success).toBe(true);
      expect(result.clearCookies).toEqual([
        'sb_access_token',
        'sb_refresh_token',
      ]);
    });
  });
});
