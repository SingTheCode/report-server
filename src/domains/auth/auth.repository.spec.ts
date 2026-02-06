import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AuthRepository } from './auth.repository';
import { SUPABASE_CLIENT } from '../../infrastructure/supabase/supabase.module';

describe('AuthRepository', () => {
  let repository: AuthRepository;
  let mockAuth: {
    signInWithOAuth: jest.Mock;
    exchangeCodeForSession: jest.Mock;
    getUser: jest.Mock;
    refreshSession: jest.Mock;
  };

  beforeEach(async () => {
    mockAuth = {
      signInWithOAuth: jest.fn(),
      exchangeCodeForSession: jest.fn(),
      getUser: jest.fn(),
      refreshSession: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthRepository,
        {
          provide: SUPABASE_CLIENT,
          useValue: { auth: mockAuth },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, string> = {
                CLIENT_DOMAIN: 'http://localhost:8080',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    repository = module.get<AuthRepository>(AuthRepository);
  });

  describe('getGoogleLoginUrl', () => {
    // Given: Supabase 클라이언트가 설정되어 있을 때
    // When: getGoogleLoginUrl을 호출하면
    // Then: Google OAuth URL을 반환한다
    test('Google OAuth URL을 반환한다', async () => {
      // Given
      const mockUrl =
        'https://test.supabase.co/auth/v1/authorize?provider=google';
      mockAuth.signInWithOAuth.mockResolvedValue({
        data: { url: mockUrl },
        error: null,
      });

      // When
      const url = await repository.getGoogleLoginUrl();

      // Then
      expect(url).toBe(mockUrl);
      expect(mockAuth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: expect.objectContaining({
          redirectTo: 'http://localhost:8080/auth/callback',
        }),
      });
    });

    // Given: Supabase에서 에러가 발생할 때
    // When: getGoogleLoginUrl을 호출하면
    // Then: 에러를 던진다
    test('Supabase 에러 시 예외를 던진다', async () => {
      // Given
      mockAuth.signInWithOAuth.mockResolvedValue({
        data: { url: null },
        error: { message: 'OAuth error' },
      });

      // When & Then
      await expect(repository.getGoogleLoginUrl()).rejects.toThrow(
        'OAuth error',
      );
    });
  });

  describe('exchangeCodeForSession', () => {
    // Given: 유효한 code가 주어졌을 때
    // When: exchangeCodeForSession을 호출하면
    // Then: access_token과 refresh_token을 반환한다
    test('code를 세션으로 교환한다', async () => {
      // Given
      mockAuth.exchangeCodeForSession.mockResolvedValue({
        data: {
          session: {
            access_token: 'access-token',
            refresh_token: 'refresh-token',
          },
        },
        error: null,
      });

      // When
      const result = await repository.exchangeCodeForSession('valid-code');

      // Then
      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
    });

    // Given: 유효하지 않은 code가 주어졌을 때
    // When: exchangeCodeForSession을 호출하면
    // Then: 에러를 던진다
    test('유효하지 않은 code는 에러를 던진다', async () => {
      // Given
      mockAuth.exchangeCodeForSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Invalid code' },
      });

      // When & Then
      await expect(
        repository.exchangeCodeForSession('invalid'),
      ).rejects.toThrow('Invalid code');
    });
  });

  describe('getUserByToken', () => {
    // Given: 유효한 access_token이 주어졌을 때
    // When: getUserByToken을 호출하면
    // Then: 사용자 정보를 반환한다
    test('토큰으로 사용자 정보를 조회한다', async () => {
      // Given
      mockAuth.getUser.mockResolvedValue({
        data: {
          user: {
            id: 'user-1',
            email: 'test@test.com',
            user_metadata: {
              full_name: 'Test User',
              picture: 'https://avatar.url',
            },
          },
        },
        error: null,
      });

      // When
      const user = await repository.getUserByToken('valid-token');

      // Then
      expect(user).toEqual({
        id: 'user-1',
        email: 'test@test.com',
        name: 'Test User',
        avatarUrl: 'https://avatar.url',
      });
    });

    // Given: 유효하지 않은 토큰이 주어졌을 때
    // When: getUserByToken을 호출하면
    // Then: null을 반환한다
    test('유효하지 않은 토큰은 null을 반환한다', async () => {
      // Given
      mockAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' },
      });

      // When
      const user = await repository.getUserByToken('invalid-token');

      // Then
      expect(user).toBeNull();
    });
  });

  describe('refreshSession', () => {
    // Given: 유효한 refresh_token이 주어졌을 때
    // When: refreshSession을 호출하면
    // Then: 새로운 토큰 쌍을 반환한다
    test('세션을 갱신한다', async () => {
      // Given
      mockAuth.refreshSession.mockResolvedValue({
        data: {
          session: {
            access_token: 'new-access-token',
            refresh_token: 'new-refresh-token',
          },
        },
        error: null,
      });

      // When
      const result = await repository.refreshSession('valid-refresh-token');

      // Then
      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toBe('new-refresh-token');
    });

    // Given: 유효하지 않은 refresh_token이 주어졌을 때
    // When: refreshSession을 호출하면
    // Then: 에러를 던진다
    test('유효하지 않은 refresh_token은 에러를 던진다', async () => {
      // Given
      mockAuth.refreshSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Invalid refresh token' },
      });

      // When & Then
      await expect(repository.refreshSession('invalid')).rejects.toThrow(
        'Invalid refresh token',
      );
    });
  });
});
