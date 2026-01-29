import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver } from '@nestjs/apollo';
import { join } from 'path';
import { WorklogModule } from '../src/domains/worklog/worklog.module';
import { OpenAiService } from '../src/infrastructure/openai/openai.service';
import { NotionService } from '../src/infrastructure/notion/notion.service';
import { MockOpenAiService } from './mock-openai.service';
import { Document } from '../src/domains/rag/entities/document.entity';
import { Embedding } from '../src/domains/rag/entities/embedding.entity';
import { Worklog } from '../src/domains/worklog/entities/worklog.entity';

describe('Worklog Sync (e2e)', () => {
  let app: INestApplication;

  const mockNotionService = {
    fetchDatabaseAll: jest.fn().mockResolvedValue([
      {
        id: 'notion-page-1',
        properties: { title: { title: [{ plain_text: 'Test Page' }] } },
        url: 'https://notion.so/page1',
      },
    ]),
    fetchBlockChildrenAll: jest.fn().mockResolvedValue([
      { type: 'paragraph', paragraph: { rich_text: [{ plain_text: 'Page content' }] } },
    ]),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        TypeOrmModule.forRoot({
          type: 'better-sqlite3',
          database: ':memory:',
          entities: [Document, Embedding, Worklog],
          synchronize: true,
        }),
        GraphQLModule.forRoot({
          driver: ApolloDriver,
          autoSchemaFile: join(process.cwd(), 'test-schema-worklog.gql'),
        }),
        WorklogModule,
      ],
    })
      .overrideProvider(OpenAiService)
      .useClass(MockOpenAiService)
      .overrideProvider(NotionService)
      .useValue(mockNotionService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Notion 동기화', () => {
    // Given: Notion 데이터베이스에 페이지가 있을 때
    // When: syncNotion을 호출하면
    // Then: 페이지가 저장되고 임베딩이 생성된다
    test('Notion 페이지 동기화 및 임베딩 생성', async () => {
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            mutation {
              syncNotion(input: {
                databaseId: "test-db-id",
                apiToken: "test-token"
              }) {
                success
                syncedCount
                embeddedCount
              }
            }
          `,
        });

      expect(response.body.data.syncNotion.success).toBe(true);
      expect(response.body.data.syncNotion.syncedCount).toBe(1);
      expect(response.body.data.syncNotion.embeddedCount).toBeGreaterThan(0);
    });

    // Given: 동기화된 worklog가 있을 때
    // When: worklogs를 조회하면
    // Then: 저장된 worklog 목록을 반환한다
    test('동기화된 worklog 조회', async () => {
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `query { worklogs { id title url } }`,
        });

      expect(response.body.data.worklogs.length).toBeGreaterThan(0);
      expect(response.body.data.worklogs[0].title).toBe('Test Page');
    });

    // Given: worklog가 저장되어 있을 때
    // When: worklogStatus를 조회하면
    // Then: 총 worklog 수를 반환한다
    test('worklog 상태 조회', async () => {
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `query { worklogStatus { totalWorklogs } }`,
        });

      expect(response.body.data.worklogStatus.totalWorklogs).toBeGreaterThan(0);
    });
  });
});
