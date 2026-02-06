import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthRepository, TokenPayload } from './auth.repository';
import { LoginUrlOutput } from './dto/login-url.output';
import { UserOutput } from './dto/user.output';

@Injectable()
export class AuthService {
  constructor(private authRepository: AuthRepository) {}

  async getGoogleLoginUrl(): Promise<LoginUrlOutput> {
    const url = await this.authRepository.getGoogleLoginUrl();
    return { url };
  }

  async handleCallback(code: string): Promise<TokenPayload> {
    if (!code) throw new BadRequestException('code is required');
    return this.authRepository.exchangeCodeForSession(code);
  }

  setTokens(accessToken: string, refreshToken: string): TokenPayload {
    if (!accessToken || !refreshToken) {
      throw new BadRequestException('tokens are required');
    }
    return { accessToken, refreshToken };
  }

  async getMe(accessToken: string): Promise<UserOutput> {
    if (!accessToken) throw new UnauthorizedException();

    const user = await this.authRepository.getUserByToken(accessToken);
    if (!user) throw new UnauthorizedException();

    return { user };
  }

  async refreshTokens(refreshToken: string): Promise<TokenPayload> {
    if (!refreshToken) throw new UnauthorizedException();
    return this.authRepository.refreshSession(refreshToken);
  }
}
