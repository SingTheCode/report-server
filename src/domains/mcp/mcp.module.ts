import { Module } from '@nestjs/common';
import { McpServer } from './mcp.server';
import { McpController } from './mcp.controller';
import { RagModule } from '../rag/rag.module';

@Module({
  imports: [RagModule],
  controllers: [McpController],
  providers: [McpServer],
  exports: [McpServer],
})
export class McpModule {}
