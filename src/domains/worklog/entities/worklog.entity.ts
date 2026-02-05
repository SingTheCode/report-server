import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('worklogs')
export class Worklog {
  @PrimaryColumn()
  id: string;

  @Column()
  title: string;

  @Column('text')
  content: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  syncedAt: Date;
}
