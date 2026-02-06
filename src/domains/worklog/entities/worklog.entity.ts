import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('worklogs')
export class Worklog {
  @PrimaryColumn()
  id: string;

  @Column()
  title: string;

  @Column('text')
  content: string;

  @Column({ nullable: true })
  url: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'datetime', nullable: true })
  syncedAt: Date;
}
