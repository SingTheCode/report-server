import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Worklog } from './entities/worklog.entity';

@Injectable()
export class WorklogRepository {
  constructor(
    @InjectRepository(Worklog)
    private repo: Repository<Worklog>,
  ) {}

  async saveWorklog(worklog: Partial<Worklog>): Promise<void> {
    await this.repo.save(worklog);
  }

  async saveWorklogs(worklogs: Partial<Worklog>[]): Promise<void> {
    await this.repo.save(worklogs);
  }

  async findAll(): Promise<Worklog[]> {
    return this.repo.find();
  }

  async getStatus() {
    const totalWorklogs = await this.repo.count();
    return { totalWorklogs };
  }
}
