import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('documents')
export class Document {
  @PrimaryColumn()
  id: string;

  @Column('text')
  content: string;

  @Column({ type: 'text', nullable: true })
  metadata: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
