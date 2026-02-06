import { Injectable, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';
import { SUPABASE_CLIENT } from '../../infrastructure/supabase/supabase.module';
import { User } from './entities/auth.entity';

export interface TokenPayload {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthRepository {
  constructor(
    @Inject(SUPABASE_CLIENT) private client: SupabaseClient,
    private configService: ConfigService,
  ) {}

  async getGoogleLoginUrl(): Promise<string> {
    const { data, error } = await this.client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${this.configService.get('CLIENT_DOMAIN')}/auth/callback`,
        skipBrowserRedirect: true,
      },
    });

    if (error) throw new Error(error.message);
    return data.url;
  }

  async exchangeCodeForSession(code: string): Promise<TokenPayload> {
    const { data, error } = await this.client.auth.exchangeCodeForSession(code);

    if (error) throw new Error(error.message);

    return {
      accessToken: data.session!.access_token,
      refreshToken: data.session!.refresh_token,
    };
  }

  async getUserByToken(accessToken: string): Promise<User | null> {
    const {
      data: { user },
      error,
    } = await this.client.auth.getUser(accessToken);

    if (error || !user) return null;

    return {
      id: user.id,
      email: user.email!,
      name: user.user_metadata?.full_name,
      avatarUrl: user.user_metadata?.picture,
    };
  }

  async refreshSession(refreshToken: string): Promise<TokenPayload> {
    const { data, error } = await this.client.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !data.session)
      throw new Error(error?.message || 'Refresh failed');

    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
    };
  }
}
