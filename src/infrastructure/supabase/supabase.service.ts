import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface TokenPayload {
  accessToken: string;
  refreshToken: string;
}

export interface SupabaseUser {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
}

@Injectable()
export class SupabaseService {
  private client: SupabaseClient;

  constructor(private configService: ConfigService) {
    this.client = createClient(
      this.configService.get('SUPABASE_URL')!,
      this.configService.get('SUPABASE_ANON_KEY')!,
    );
  }

  async getGoogleLoginUrl(): Promise<string> {
    const { data, error } = await this.client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${this.configService.get('CLIENT_DOMAIN')}/auth/callback`,
        skipBrowserRedirect: true,
      },
    });

    if (error) throw new Error(error.message);
    return data.url!;
  }

  async exchangeCodeForSession(code: string): Promise<TokenPayload> {
    const { data, error } = await this.client.auth.exchangeCodeForSession(code);

    if (error) throw new Error(error.message);

    return {
      accessToken: data.session!.access_token,
      refreshToken: data.session!.refresh_token,
    };
  }

  async getUserByToken(accessToken: string): Promise<SupabaseUser | null> {
    const {
      data: { user },
      error,
    } = await this.client.auth.getUser(accessToken);

    if (error || !user) return null;

    return {
      id: user.id,
      email: user.email!,
      name: user.user_metadata?.full_name,
      avatarUrl: user.user_metadata?.avatar_url,
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
