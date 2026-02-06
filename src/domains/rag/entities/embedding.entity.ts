export interface Embedding {
  id?: number;
  document_id: number;
  chunk_index: number;
  content: string;
  vector: number[];
}
