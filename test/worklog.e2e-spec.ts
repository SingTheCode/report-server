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
import { MockOpenAiService } from './mock-openai.service';
import { Document } from '../src/domains/rag/entities/document.entity';
import { Embedding } from '../src/domains/rag/entities/embedding.entity';
import { Worklog } from '../src/domains/worklog/entities/worklog.entity';

interface GraphQLResponse {
  data?: {
    uploadWorklogs?: {
      uploadId: string;
    };
  };
}

describe('Worklog Upload (e2e)', () => {
  let app: INestApplication;

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
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('파일 업로드', () => {
    // Given: 파일이 업로드될 때
    // When: uploadWorklogs mutation을 호출하면
    // Then: uploadId를 반환한다
    test('파일 업로드 시 uploadId 반환', async () => {
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            mutation {
              uploadWorklogs(input: {
                files: [
                  { filename: "test.md", content: "# Test Content" }
                ]
              }) {
                uploadId
              }
            }
          `,
        });

      const body = response.body as GraphQLResponse;
      expect(body.data?.uploadWorklogs?.uploadId).toBeDefined();
    });
  });
});
