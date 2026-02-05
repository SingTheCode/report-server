import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Redirect,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { LoginUrlOutput } from './dto/login-url.output';
import { UserOutput } from './dto/user.output';
import { Cookies } from '../../common/decorators/cookies.decorator';
import {
  SetCookies,
  CookiesInterceptor,
  ClearCookiesInterceptor,
  CookiePayload,
} from '../../common/decorators/set-cookies.decorator';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  @Get('login/google')
  async loginGoogle(): Promise<LoginUrlOutput> {
    return this.authService.getGoogleLoginUrl();
  }

  @Get('callback')
  @Redirect()
  @SetCookies()
  @UseInterceptors(CookiesInterceptor)
  async callback(
    @Query('code') code: string,
  ): Promise<{ url: string; cookies?: CookiePayload[] }> {
    const clientDomain = this.configService.get('CLIENT_DOMAIN');
    const isProduction = this.configService.get('NODE_ENV') === 'production';

    try {
      const { accessToken, refreshToken } =
        await this.authService.handleCallback(code);

      const cookieOptions = {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax' as const,
      };

      return {
        url: `${clientDomain}/chat`,
        cookies: [
          {
            name: 'sb_access_token',
            value: accessToken,
            options: { ...cookieOptions, maxAge: 3600 * 1000 },
          },
          {
            name: 'sb_refresh_token',
            value: refreshToken,
            options: { ...cookieOptions, maxAge: 30 * 24 * 3600 * 1000 },
          },
        ],
      };
    } catch {
      return { url: `${clientDomain}/login?error=auth_failed` };
    }
  }

  @Post('session')
  @SetCookies()
  @UseInterceptors(CookiesInterceptor)
  setSession(
    @Body('accessToken') accessToken: string,
    @Body('refreshToken') refreshToken: string,
  ): { success: boolean; cookies: CookiePayload[] } {
    const isProduction = this.configService.get('NODE_ENV') === 'production';
    this.authService.setTokens(accessToken, refreshToken);

    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax' as const,
    };

    return {
      success: true,
      cookies: [
        {
          name: 'sb_access_token',
          value: accessToken,
          options: { ...cookieOptions, maxAge: 3600 * 1000 },
        },
        {
          name: 'sb_refresh_token',
          value: refreshToken,
          options: { ...cookieOptions, maxAge: 30 * 24 * 3600 * 1000 },
        },
      ],
    };
  }

  @Get('me')
  async getMe(
    @Cookies('sb_access_token') accessToken: string,
  ): Promise<UserOutput> {
    return this.authService.getMe(accessToken || '');
  }

  @Post('logout')
  @SetCookies()
  @UseInterceptors(ClearCookiesInterceptor)
  logout(): { success: boolean; clearCookies: string[] } {
    return {
      success: true,
      clearCookies: ['sb_access_token', 'sb_refresh_token'],
    };
  }
}
