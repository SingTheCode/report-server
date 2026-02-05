import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  SupabaseService,
  TokenPayload,
} from '../../infrastructure/supabase/supabase.service';
import { LoginUrlOutput } from './dto/login-url.output';
import { UserOutput } from './dto/user.output';

@Injectable()
export class AuthService {
  constructor(private supabaseService: SupabaseService) {}

  async getGoogleLoginUrl(): Promise<LoginUrlOutput> {
    const url = await this.supabaseService.getGoogleLoginUrl();
    return { url };
  }

  async handleCallback(code: string): Promise<TokenPayload> {
    if (!code) throw new BadRequestException('code is required');
    return this.supabaseService.exchangeCodeForSession(code);
  }

  setTokens(accessToken: string, refreshToken: string): TokenPayload {
    if (!accessToken || !refreshToken) {
      throw new BadRequestException('tokens are required');
    }
    return { accessToken, refreshToken };
  }

  async getMe(accessToken: string): Promise<UserOutput> {
    if (!accessToken) throw new UnauthorizedException();

    const user = await this.supabaseService.getUserByToken(accessToken);
    if (!user) throw new UnauthorizedException();

    return { user };
  }

  async refreshTokens(refreshToken: string): Promise<TokenPayload> {
    if (!refreshToken) throw new UnauthorizedException();
    return this.supabaseService.refreshSession(refreshToken);
  }
}
