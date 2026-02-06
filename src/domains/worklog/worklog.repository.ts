import { Injectable, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../infrastructure/supabase/supabase.module';
import { Worklog } from './entities/worklog.entity';

@Injectable()
export class WorklogRepository {
  constructor(@Inject(SUPABASE_CLIENT) private client: SupabaseClient) {}

  async saveWorklog(worklog: Partial<Worklog>): Promise<void> {
    const { error } = await this.client
      .from('worklogs')
      .upsert(worklog, { onConflict: 'id' });
    if (error) throw new Error(error.message);
  }

  async saveWorklogs(worklogs: Partial<Worklog>[]): Promise<void> {
    const { error } = await this.client
      .from('worklogs')
      .upsert(worklogs, { onConflict: 'id' });
    if (error) throw new Error(error.message);
  }

  async findAll(): Promise<Worklog[]> {
    const { data, error } = await this.client.from('worklogs').select('*');
    if (error) throw new Error(error.message);
    return data;
  }

  async findByIds(ids: string[]): Promise<Worklog[]> {
    if (ids.length === 0) return [];
    const { data, error } = await this.client
      .from('worklogs')
      .select('*')
      .in('id', ids);
    if (error) throw new Error(error.message);
    return data;
  }

  async getStatus() {
    const { count, error } = await this.client
      .from('worklogs')
      .select('*', { count: 'exact', head: true });
    if (error) throw new Error(error.message);
    return { totalWorklogs: count ?? 0 };
  }
}
