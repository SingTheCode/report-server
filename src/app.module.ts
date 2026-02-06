import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
import { OpenAiModule } from './infrastructure/openai/openai.module';
import { RagModule } from './domains/rag/rag.module';
import { WorklogModule } from './domains/worklog/worklog.module';
import { McpModule } from './domains/mcp/mcp.module';
import { AuthModule } from './domains/auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'schema.gql'),
      playground: process.env.NODE_ENV !== 'production',
      introspection: process.env.NODE_ENV !== 'production',
    }),

    // Infrastructure
    OpenAiModule,

    // Domains
    RagModule,
    WorklogModule,
    McpModule,
    AuthModule,
  ],
})
export class AppModule {}
