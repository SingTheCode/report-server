import { Module } from '@nestjs/common';
import { McpServer } from './mcp.server';
import { McpController } from './mcp.controller';
import { RagModule } from '../rag/rag.module';
import { WorklogModule } from '../worklog/worklog.module';

@Module({
  imports: [RagModule, WorklogModule],
  controllers: [McpController],
  providers: [McpServer],
  exports: [McpServer],
})
export class McpModule {}
