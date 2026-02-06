export interface Embedding {
  id?: number;
  document_id: string;
  chunk_index: number;
  content: string;
  vector: number[];
}
