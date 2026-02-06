import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const SUPABASE_CLIENT = 'SUPABASE_CLIENT';
export const SUPABASE_ADMIN_CLIENT = 'SUPABASE_ADMIN_CLIENT';

@Module({
  providers: [
    {
      provide: SUPABASE_CLIENT,
      useFactory: (configService: ConfigService): SupabaseClient => {
        return createClient(
          configService.get('SUPABASE_URL')!,
          configService.get('SUPABASE_ANON_KEY')!,
        );
      },
      inject: [ConfigService],
    },
    {
      provide: SUPABASE_ADMIN_CLIENT,
      useFactory: (configService: ConfigService): SupabaseClient => {
        return createClient(
          configService.get('SUPABASE_URL')!,
          configService.get('SUPABASE_SERVICE_ROLE_KEY')!,
        );
      },
      inject: [ConfigService],
    },
  ],
  exports: [SUPABASE_CLIENT, SUPABASE_ADMIN_CLIENT],
})
export class SupabaseModule {}
