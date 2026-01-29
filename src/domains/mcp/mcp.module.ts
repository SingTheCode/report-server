import { Module } from '@nestjs/common';
import { McpServer } from './mcp.server';
import { RagModule } from '../rag/rag.module';

@Module({
  imports: [RagModule],
  providers: [McpServer],
  exports: [McpServer],
})
export class McpModule {}
