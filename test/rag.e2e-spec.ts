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

interface SearchResult {
  documentId: string;
  similarity: number;
}

interface GraphQLResponse {
  data?: {
    buildEmbeddings?: {
      success: boolean;
      documentCount: number;
      chunkCount: number;
    };
    searchEmbeddings?: { results: SearchResult[] };
    embeddingStatus?: { totalEmbeddings: number };
  };
}

describe('RAG Pipeline (e2e)', () => {
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
          autoSchemaFile: join(process.cwd(), 'test-schema.gql'),
        }),
        RagModule,
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

  describe('전체 파이프라인', () => {
    // Given: 문서가 주어졌을 때
    // When: 임베딩 생성 후 검색하면
    // Then: 유사한 문서가 반환된다
    test('문서 저장 → 임베딩 생성 → 검색 파이프라인', async () => {
      // 1. 임베딩 생성
      const buildResponse = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            mutation {
              buildEmbeddings(input: {
                documents: [
                  { id: "doc1", content: "NestJS는 TypeScript 기반 프레임워크입니다." },
                  { id: "doc2", content: "GraphQL은 API 쿼리 언어입니다." }
                ]
              }) {
                success
                documentCount
                chunkCount
              }
            }
          `,
        });

      const buildBody = buildResponse.body as GraphQLResponse;
      expect(buildBody.data?.buildEmbeddings?.success).toBe(true);
      expect(buildBody.data?.buildEmbeddings?.documentCount).toBe(2);

      // 2. 검색
      const searchResponse = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            query {
              searchEmbeddings(input: { query: "TypeScript", limit: 2 }) {
                results {
                  documentId
                  similarity
                }
              }
            }
          `,
        });

      const searchBody = searchResponse.body as GraphQLResponse;
      const results = searchBody.data?.searchEmbeddings?.results ?? [];
      expect(results.length).toBe(2);
      expect(results[0]).toHaveProperty('documentId');
      expect(results[0]).toHaveProperty('similarity');
    });

    // Given: 동일한 문서를 다시 빌드할 때
    // When: buildEmbeddings를 호출하면
    // Then: 기존 임베딩이 교체된다 (멱등성)
    test('동일 문서 재빌드 시 멱등성 보장', async () => {
      // 첫 번째 빌드
      await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            mutation {
              buildEmbeddings(input: {
                documents: [{ id: "idempotent-doc", content: "Original" }]
              }) { success chunkCount }
            }
          `,
        });

      // 상태 확인
      const status1 = await request(app.getHttpServer())
        .post('/graphql')
        .send({ query: `query { embeddingStatus { totalEmbeddings } }` });

      const status1Body = status1.body as GraphQLResponse;
      const count1 = status1Body.data?.embeddingStatus?.totalEmbeddings ?? 0;

      // 두 번째 빌드 (동일 ID)
      await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            mutation {
              buildEmbeddings(input: {
                documents: [{ id: "idempotent-doc", content: "Updated" }]
              }) { success }
            }
          `,
        });

      // 상태 재확인 - 임베딩 수가 증가하지 않아야 함
      const status2 = await request(app.getHttpServer())
        .post('/graphql')
        .send({ query: `query { embeddingStatus { totalEmbeddings } }` });

      const status2Body = status2.body as GraphQLResponse;
      const count2 = status2Body.data?.embeddingStatus?.totalEmbeddings ?? 0;
      expect(count2).toBe(count1); // 멱등성: 동일 문서는 교체됨
    });
  });
});
