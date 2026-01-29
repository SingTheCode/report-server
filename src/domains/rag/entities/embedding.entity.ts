import { Column, Entity, Index, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('embeddings')
@Index('idx_document_id', ['documentId'])
@Unique('uq_doc_chunk', ['documentId', 'chunkIndex'])
export class Embedding {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  documentId: string;

  @Column()
  chunkIndex: number;

  @Column('text')
  content: string;

  @Column('simple-json')
  vector: number[];
}
