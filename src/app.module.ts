import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
import { DatabaseModule } from './infrastructure/database/database.module';
import { OpenAiModule } from './infrastructure/openai/openai.module';
import { NotionModule } from './infrastructure/notion/notion.module';
import { RagModule } from './domains/rag/rag.module';
import { WorklogModule } from './domains/worklog/worklog.module';

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
    DatabaseModule,
    OpenAiModule,
    NotionModule,

    // Domains
    RagModule,
    WorklogModule,
  ],
})
export class AppModule {}
