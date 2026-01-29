import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver } from '@nestjs/apollo';
import { join } from 'path';
import { RagModule } from '../src/domains/rag/rag.module';
import { OpenAiService } from '../src/infrastructure/openai/openai.service';
import { MockOpenAiService } from './mock-openai.service';
import { Document } from '../src/domains/rag/entities/document.entity';
import { Embedding } from '../src/domains/rag/entities/embedding.entity';

describe('Error Handling (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        TypeOrmModule.forRoot({
          type: 'better-sqlite3',
          database: ':memory:',
          entities: [Document, Embedding],
          synchronize: true,
        }),
        GraphQLModule.forRoot({
          driver: ApolloDriver,
          autoSchemaFile: join(process.cwd(), 'test-schema-error.gql'),
        }),
        RagModule,
      ],
    })
      .overrideProvider(OpenAiService)
      .useClass(MockOpenAiService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('입력 검증', () => {
    // Given: 빈 문서 배열이 주어졌을 때
    // When: buildEmbeddings를 호출하면
    // Then: 0개 처리 결과를 반환한다
    test('빈 문서 배열 처리', async () => {
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            mutation {
              buildEmbeddings(input: { documents: [] }) {
                success
                documentCount
                chunkCount
              }
            }
          `,
        });

      expect(response.body.data.buildEmbeddings.success).toBe(true);
      expect(response.body.data.buildEmbeddings.documentCount).toBe(0);
    });

    // Given: limit이 범위를 벗어났을 때
    // When: searchEmbeddings를 호출하면
    // Then: 검증 에러를 반환한다
    test('limit 범위 초과 시 검증 에러', async () => {
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            query {
              searchEmbeddings(input: { query: "test", limit: 100 }) {
                results { documentId }
              }
            }
          `,
        });

      expect(response.body.errors).toBeDefined();
    });
  });

  describe('토큰 제한', () => {
    // Given: 8192 토큰을 초과하는 쿼리가 주어졌을 때
    // When: 검색을 수행하면
    // Then: 적절한 에러 메시지를 반환한다
    test('토큰 초과 쿼리 에러 처리', async () => {
      const longQuery = 'word '.repeat(10000);

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            query {
              searchEmbeddings(input: { query: "${longQuery}", limit: 5 }) {
                results { documentId }
              }
            }
          `,
        });

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toMatch(/too large/i);
    });
  });
});
