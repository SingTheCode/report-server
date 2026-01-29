import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { McpServer } from './mcp.server';

@Controller('mcp')
export class McpController {
  constructor(private readonly mcpServer: McpServer) {}

  @Get('tools')
  getTools() {
    return this.mcpServer.getTools();
  }

  @Post('tools/:name')
  callTool(@Param('name') name: string, @Body() args: Record<string, unknown>) {
    return this.mcpServer.handleToolCall(name, args as { query: string; limit?: number });
  }
}
