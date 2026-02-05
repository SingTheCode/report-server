import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from '../../domains/auth/auth.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    const accessToken = request.cookies['sb_access_token'];
    const refreshToken = request.cookies['sb_refresh_token'];

    // access token으로 사용자 조회 시도
    try {
      const { user } = await this.authService.getMe(accessToken);
      request.user = user;
      return true;
    } catch {
      // refresh token으로 갱신 시도
      if (!refreshToken) throw new UnauthorizedException();

      const tokens = await this.authService.refreshTokens(refreshToken);

      // 새 토큰을 쿠키에 설정
      response.cookie('sb_access_token', tokens.accessToken, {
        httpOnly: true,
        maxAge: 3600 * 1000,
      });
      response.cookie('sb_refresh_token', tokens.refreshToken, {
        httpOnly: true,
        maxAge: 30 * 24 * 3600 * 1000,
      });

      // 새 토큰으로 사용자 조회
      const { user } = await this.authService.getMe(tokens.accessToken);
      request.user = user;
      return true;
    }
  }
}
