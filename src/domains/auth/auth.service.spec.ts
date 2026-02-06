import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';

describe('AuthService', () => {
  let service: AuthService;
  let mockAuthRepository: Partial<AuthRepository>;

  beforeEach(async () => {
    mockAuthRepository = {
      getGoogleLoginUrl: jest
        .fn()
        .mockResolvedValue('https://google.com/oauth'),
      exchangeCodeForSession: jest.fn().mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      }),
      getUserByToken: jest.fn().mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
      }),
      refreshSession: jest.fn().mockResolvedValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: AuthRepository, useValue: mockAuthRepository },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('getGoogleLoginUrl', () => {
    // Given: 정상적인 환경일 때
    // When: getGoogleLoginUrl을 호출하면
    // Then: Google OAuth URL을 반환한다
    test('Google OAuth URL을 반환한다', async () => {
      // When
      const result = await service.getGoogleLoginUrl();

      // Then
      expect(result.url).toBe('https://google.com/oauth');
      expect(mockAuthRepository.getGoogleLoginUrl).toHaveBeenCalled();
    });
  });

  describe('handleCallback', () => {
    // Given: 유효한 code가 주어졌을 때
    // When: handleCallback을 호출하면
    // Then: 토큰 쌍을 반환한다
    test('code를 토큰으로 교환한다', async () => {
      // When
      const result = await service.handleCallback('valid-code');

      // Then
      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
    });

    // Given: code가 없을 때
    // When: handleCallback을 호출하면
    // Then: BadRequestException을 던진다
    test('code가 없으면 예외를 던진다', async () => {
      // When & Then
      await expect(service.handleCallback('')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getMe', () => {
    // Given: 유효한 토큰이 주어졌을 때
    // When: getMe를 호출하면
    // Then: 사용자 정보를 반환한다
    test('현재 사용자 정보를 반환한다', async () => {
      // When
      const result = await service.getMe('valid-token');

      // Then
      expect(result.user?.id).toBe('user-1');
      expect(result.user?.email).toBe('test@test.com');
    });

    // Given: 토큰이 없을 때
    // When: getMe를 호출하면
    // Then: UnauthorizedException을 던진다
    test('토큰이 없으면 예외를 던진다', async () => {
      // When & Then
      await expect(service.getMe('')).rejects.toThrow(UnauthorizedException);
    });

    // Given: 유효하지 않은 토큰일 때
    // When: getMe를 호출하면
    // Then: UnauthorizedException을 던진다
    test('유효하지 않은 토큰은 예외를 던진다', async () => {
      // Given
      (mockAuthRepository.getUserByToken as jest.Mock).mockResolvedValue(null);

      // When & Then
      await expect(service.getMe('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('refreshTokens', () => {
    // Given: 유효한 refresh_token이 주어졌을 때
    // When: refreshTokens를 호출하면
    // Then: 새로운 토큰 쌍을 반환한다
    test('토큰을 갱신한다', async () => {
      // When
      const result = await service.refreshTokens('valid-refresh-token');

      // Then
      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toBe('new-refresh-token');
    });

    // Given: refresh_token이 없을 때
    // When: refreshTokens를 호출하면
    // Then: UnauthorizedException을 던진다
    test('refresh_token이 없으면 예외를 던진다', async () => {
      // When & Then
      await expect(service.refreshTokens('')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
