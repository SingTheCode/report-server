import { Injectable, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../infrastructure/supabase/supabase.module';
import { Embedding } from './entities/embedding.entity';

@Injectable()
export class RagRepository {
  constructor(@Inject(SUPABASE_CLIENT) private client: SupabaseClient) {}

  async saveEmbeddings(embeddings: Partial<Embedding>[]): Promise<void> {
    const { error } = await this.client
      .from('embeddings')
      .upsert(embeddings, { onConflict: 'document_id,chunk_index' });
    if (error) throw new Error(error.message);
  }

  async deleteByDocumentId(documentId: number): Promise<void> {
    const { error } = await this.client
      .from('embeddings')
      .delete()
      .eq('document_id', documentId);
    if (error) throw new Error(error.message);
  }

  async findAllEmbeddings(): Promise<Embedding[]> {
    const { data, error } = await this.client.from('embeddings').select('*');
    if (error) throw new Error(error.message);
    return data;
  }

  async getStatus() {
    const { count, error } = await this.client
      .from('embeddings')
      .select('*', { count: 'exact', head: true });
    if (error) throw new Error(error.message);
    return { totalEmbeddings: count ?? 0 };
  }
}
