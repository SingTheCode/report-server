import { Injectable, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ADMIN_CLIENT } from '../../infrastructure/supabase/supabase.module';
import { Worklog } from './entities/worklog.entity';

@Injectable()
export class WorklogRepository {
  constructor(@Inject(SUPABASE_ADMIN_CLIENT) private client: SupabaseClient) {}

  async saveWorklog(worklog: Partial<Worklog>): Promise<number> {
    const { data, error } = await this.client
      .from('worklogs')
      .insert(worklog)
      .select('id');
    if (error) throw new Error(error.message);
    return data[0].id;
  }

  async saveWorklogs(worklogs: Partial<Worklog>[]): Promise<number[]> {
    const { data, error } = await this.client
      .from('worklogs')
      .insert(worklogs)
      .select('id');
    if (error) throw new Error(error.message);
    return data.map((d) => d.id);
  }

  async findAll(): Promise<Worklog[]> {
    const { data, error } = await this.client.from('worklogs').select('*');
    if (error) throw new Error(error.message);
    return data;
  }

  async findByIds(ids: number[]): Promise<Worklog[]> {
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
