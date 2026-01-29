import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('worklogs')
export class Worklog {
  @PrimaryColumn()
  id: string; // Notion 페이지 ID

  @Column()
  title: string;

  @Column('text')
  content: string;

  @Column({ nullable: true })
  url: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  syncedAt: Date;
}
