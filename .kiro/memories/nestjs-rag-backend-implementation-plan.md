# NestJS RAG 백엔드 서버 구현 계획

## 개요

현재 프로젝트의 RAG 로직(IndexedDB 기반) 및 작업 기록 수집(Notion, 파일 업로드)을 별도 NestJS 백엔드로 이전하고, MCP Server 기능도 백엔드에서 제공.

## 기술 스택

- NestJS + TypeScript
- GraphQL (Apollo)
- SQLite (TypeORM) - 향후 PostgreSQL + pgvector 확장 고려
- OpenAI API (text-embedding-3-small)
- Notion API

---

## 디렉토리 구조

```
src/
├── main.ts
├── app.module.ts
│
├── domains/
│   ├── rag/
│   │   ├── rag.module.ts
│   │   ├── rag.resolver.ts
│   │   ├── rag.service.ts
│   │   ├── rag.repository.ts
│   │   ├── entities/
│   │   │   ├── document.entity.ts
│   │   │   └── embedding.entity.ts
│   │   └── dto/
│   │       ├── input/
│   │       │   ├── build-embeddings.input.ts
│   │       │   └── search-embeddings.input.ts
│   │       └── output/
│   │           ├── build-embeddings.output.ts
│   │           ├── search-result.output.ts
│   │           └── embedding-status.output.ts
│   │
│   ├── worklog/
│   │   ├── worklog.module.ts
│   │   ├── worklog.resolver.ts
│   │   ├── worklog.service.ts
│   │   ├── worklog.repository.ts
│   │   ├── entities/
│   │   │   └── worklog.entity.ts
│   │   └── dto/
│   │       ├── input/
│   │       │   ├── sync-notion.input.ts
│   │       │   └── upload-files.input.ts
│   │       └── output/
│   │           ├── sync-notion.output.ts
│   │           └── notion-page.output.ts
│   │
│   └── mcp/
│       ├── mcp.module.ts
│       └── mcp.server.ts
│
├── infrastructure/
│   ├── database/
│   │   ├── database.module.ts
│   │   └── migrations/
│   ├── openai/
│   │   ├── openai.module.ts
│   │   └── openai.service.ts
│   └── notion/
│       ├── notion.module.ts
│       ├── notion.service.ts
│       └── notion.transformer.ts
│
└── common/
    ├── filters/
    │   └── graphql-exception.filter.ts
    └── pipes/
        └── validation.pipe.ts
```

---

## GraphQL 스키마

### RAG

```graphql
type Mutation {
  buildEmbeddings(input: BuildEmbeddingsInput!): BuildEmbeddingsOutput!
}

type Query {
  searchEmbeddings(input: SearchEmbeddingsInput!): SearchResultOutput!
  embeddingStatus: EmbeddingStatusOutput!
}
```

### Worklog

```graphql
type Mutation {
  syncNotion(input: SyncNotionInput!): SyncNotionOutput!
  uploadFiles(input: UploadFilesInput!): UploadFilesOutput!
}

type Query {
  notionPages: [NotionPageOutput!]!
  worklogStatus: WorklogStatusOutput!
}
```

---

## Phase별 구현 계획

### Phase 1: 프로젝트 초기화 + 프로덕션 기본기 (1일)

#### 1.1 패키지 설치

```bash
nest new . --package-manager yarn --skip-git

yarn add @nestjs/graphql @nestjs/apollo @apollo/server graphql \
         @nestjs/config @nestjs/typeorm typeorm better-sqlite3 \
         class-validator class-transformer \
         openai @notionhq/client \
         @dqbd/tiktoken lru-cache

yarn add -D @types/node
```

#### 1.2 main.ts (전역 검증 + 예외 필터)

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { GraphqlExceptionFilter } from './common/filters/graphql-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new GraphqlExceptionFilter());

  await app.listen(4000);
}
bootstrap();
```

#### 1.3 GraphQL 예외 필터

```typescript
// src/common/filters/graphql-exception.filter.ts
import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import { GqlArgumentsHost } from '@nestjs/graphql';

@Catch()
export class GraphqlExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const gqlHost = GqlArgumentsHost.create(host);
    const ctx = gqlHost.getContext();

    if (exception instanceof HttpException) {
      ctx?.res?.status?.(200);
      return exception;
    }

    ctx?.res?.status?.(200);
    return exception;
  }
}
```

#### 1.4 체크포인트

- [ ] `yarn start:dev` 실행 성공
- [ ] ValidationPipe 동작 확인
- [ ] GraphQL Playground 접속 확인

---

### Phase 2: Infrastructure Layer (1-2일)

#### 2.1 Database 모듈 (개발/운영 분리)

```typescript
// src/infrastructure/database/database.module.ts
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isDev = config.get('NODE_ENV') === 'development';

        return {
          type: 'better-sqlite3',
          database: config.get('DATABASE_URL') || 'local.sqlite',
          entities: [__dirname + '/../../domains/**/*.entity{.ts,.js}'],
          synchronize: isDev,
          migrationsRun: !isDev,
          migrations: [__dirname + '/migrations/*{.ts,.js}'],
        };
      },
    }),
  ],
})
export class DatabaseModule {}
```

#### 2.2 OpenAI 서비스 (토큰 검증 + 재시도 + 배치 분할)

```typescript
// src/infrastructure/openai/openai.service.ts
@Injectable()
export class OpenAiService {
  private client: OpenAI;
  private enc = get_encoding('cl100k_base');

  constructor(private config: ConfigService) {
    this.client = new OpenAI({ apiKey: config.get('OPENAI_API_KEY') });
  }

  countTokens(text: string) {
    return this.enc.encode(text).length;
  }

  private sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }

  // 지수 백오프 + jitter 재시도
  private async withRetry<T>(fn: () => Promise<T>, maxRetry = 5): Promise<T> {
    let attempt = 0;
    while (true) {
      try {
        return await fn();
      } catch (e: any) {
        attempt++;
        const status = e?.status || e?.response?.status;
        const retryable = status === 429 || (status >= 500 && status < 600);

        if (!retryable || attempt > maxRetry) throw e;

        const base = Math.min(2000 * 2 ** (attempt - 1), 15000);
        const jitter = Math.floor(Math.random() * 300);
        await this.sleep(base + jitter);
      }
    }
  }

  async embedText(text: string): Promise<number[]> {
    if (this.countTokens(text) > 8192) {
      throw new Error('Embedding input too large (> 8192 tokens).');
    }

    const res = await this.withRetry(() =>
      this.client.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
      }),
    );
    return res.data[0].embedding;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length > 2048) throw new Error('Too many inputs (max 2048).');

    for (const t of texts) {
      if (this.countTokens(t) > 8192) {
        throw new Error('One of inputs too large (> 8192 tokens).');
      }
    }

    const res = await this.withRetry(() =>
      this.client.embeddings.create({
        model: 'text-embedding-3-small',
        input: texts,
      }),
    );
    return res.data.map((d) => d.embedding);
  }

  // 대량 처리용 자동 분할
  async embedBatchSafe(texts: string[], chunkSize = 256): Promise<number[][]> {
    const out: number[][] = [];
    for (let i = 0; i < texts.length; i += chunkSize) {
      const part = texts.slice(i, i + chunkSize);
      const vecs = await this.embedBatch(part);
      out.push(...vecs);
    }
    return out;
  }
}
```

#### 2.3 Notion 서비스 (페이지네이션)

```typescript
// src/infrastructure/notion/notion.service.ts
@Injectable()
export class NotionService {
  private makeClient(apiToken: string) {
    return new Client({ auth: apiToken });
  }

  async fetchDatabaseAll(databaseId: string, apiToken: string) {
    const client = this.makeClient(apiToken);
    const results: any[] = [];
    let cursor: string | undefined;

    while (true) {
      const res = await client.databases.query({
        database_id: databaseId,
        start_cursor: cursor,
        page_size: 100,
      });

      results.push(...res.results);
      if (!res.has_more) break;
      cursor = res.next_cursor ?? undefined;
    }

    return results;
  }

  async fetchBlockChildrenAll(blockId: string, apiToken: string) {
    const client = this.makeClient(apiToken);
    const results: any[] = [];
    let cursor: string | undefined;

    while (true) {
      const res = await client.blocks.children.list({
        block_id: blockId,
        start_cursor: cursor,
        page_size: 100,
      });

      results.push(...res.results);
      if (!res.has_more) break;
      cursor = res.next_cursor ?? undefined;
    }

    return results;
  }
}
```

#### 2.4 체크포인트

- [ ] DB 연결 확인 (개발: synchronize, 운영: migrations)
- [ ] OpenAI 임베딩 테스트 (토큰 초과 시 에러 확인)
- [ ] Notion API 페이지네이션 테스트 (100개 이상 블록)

---

### Phase 3: RAG 도메인 (2-3일)

#### 3.1 Entity

```typescript
// src/domains/rag/entities/document.entity.ts
@Entity('documents')
@ObjectType()
export class Document {
  @PrimaryColumn()
  @Field()
  id: string;

  @Column()
  @Field()
  title: string;

  @Column({ nullable: true })
  @Field({ nullable: true })
  category?: string;

  @Column('text')
  content: string;

  @CreateDateColumn()
  @Field()
  createdAt: Date;
}

// src/domains/rag/entities/embedding.entity.ts
@Entity('embeddings')
@Index('idx_document_id', ['documentId'])
@Unique('uq_doc_chunk', ['documentId', 'chunkIndex'])
export class Embedding {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  documentId: string;

  @Column()
  chunkIndex: number;

  @Column('text')
  content: string;

  @Column('simple-json')
  vector: number[];
}
```

#### 3.2 Repository

```typescript
// src/domains/rag/rag.repository.ts
@Injectable()
export class RagRepository {
  constructor(
    @InjectRepository(Document) private docRepo: Repository<Document>,
    @InjectRepository(Embedding) private embRepo: Repository<Embedding>,
  ) {}

  saveDocument(doc: Partial<Document>) {
    return this.docRepo.save(doc);
  }

  saveEmbeddings(embeddings: Partial<Embedding>[]) {
    return this.embRepo.save(embeddings);
  }

  findAllEmbeddings() {
    return this.embRepo.find();
  }

  async getStatus() {
    const documentCount = await this.docRepo.count();
    const embeddingCount = await this.embRepo.count();
    return { documentCount, embeddingCount };
  }

  deleteByDocumentId(documentId: string) {
    return this.embRepo.delete({ documentId });
  }
}
```

#### 3.3 Service (토큰 청킹 + 정규화 + LRU 캐시)

```typescript
// src/domains/rag/rag.service.ts
@Injectable()
export class RagService {
  private enc = get_encoding('cl100k_base');
  private queryVectorCache = new LRUCache<string, number[]>({ max: 500, ttl: 1000 * 60 * 10 });
  private searchCache = new LRUCache<string, any>({ max: 500, ttl: 1000 * 30 });

  constructor(
    private ragRepo: RagRepository,
    private openai: OpenAiService,
  ) {}

  // 토큰 기반 청킹
  private chunkByTokens(text: string, size = 500, overlap = 80): string[] {
    const tokens = this.enc.encode(text);
    const chunks: string[] = [];
    let start = 0;

    while (start < tokens.length) {
      const end = Math.min(start + size, tokens.length);
      chunks.push(new TextDecoder().decode(this.enc.decode(tokens.slice(start, end))));
      start = Math.max(end - overlap, start + 1);
    }

    return chunks;
  }

  // 벡터 정규화 (cosine = dot product)
  private normalize(vec: number[]): number[] {
    let norm = 0;
    for (const v of vec) norm += v * v;
    norm = Math.sqrt(norm) || 1;
    return vec.map((v) => v / norm);
  }

  private dot(a: number[], b: number[]): number {
    let s = 0;
    for (let i = 0; i < a.length; i++) s += a[i] * b[i];
    return s;
  }

  async buildEmbeddings(input: BuildEmbeddingsInput) {
    let totalChunks = 0;

    for (const doc of input.documents) {
      await this.ragRepo.saveDocument(doc);
      await this.ragRepo.deleteByDocumentId(doc.id); // 멱등

      const chunks = this.chunkByTokens(doc.content);
      const vectors = await this.openai.embedBatchSafe(chunks);

      const embeddings = chunks.map((content, i) => ({
        documentId: doc.id,
        chunkIndex: i,
        content,
        vector: this.normalize(vectors[i]),
      }));

      await this.ragRepo.saveEmbeddings(embeddings);
      totalChunks += chunks.length;
      this.searchCache.clear();
    }

    return { success: true, documentCount: input.documents.length, chunkCount: totalChunks };
  }

  async search(input: SearchEmbeddingsInput) {
    const limit = input.limit ?? 5;
    const cacheKey = `${input.query}::${limit}`;

    const cached = this.searchCache.get(cacheKey);
    if (cached) return cached;

    let queryVector = this.queryVectorCache.get(input.query);
    if (!queryVector) {
      if (this.openai.countTokens(input.query) > 8192) {
        throw new Error('Query too large (> 8192 tokens).');
      }
      queryVector = this.normalize(await this.openai.embedText(input.query));
      this.queryVectorCache.set(input.query, queryVector);
    }

    const embeddings = await this.ragRepo.findAllEmbeddings();

    const results = embeddings
      .map((e) => ({
        documentId: e.documentId,
        content: e.content,
        similarity: this.dot(queryVector!, e.vector),
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    const out = { results };
    this.searchCache.set(cacheKey, out);
    return out;
  }

  getStatus() {
    return this.ragRepo.getStatus();
  }
}
```

#### 3.4 Resolver

```typescript
// src/domains/rag/rag.resolver.ts
@Resolver()
export class RagResolver {
  constructor(private ragService: RagService) {}

  @Mutation(() => BuildEmbeddingsOutput)
  buildEmbeddings(@Args('input') input: BuildEmbeddingsInput) {
    return this.ragService.buildEmbeddings(input);
  }

  @Query(() => SearchResultOutput)
  searchEmbeddings(@Args('input') input: SearchEmbeddingsInput) {
    return this.ragService.search(input);
  }

  @Query(() => EmbeddingStatusOutput)
  embeddingStatus() {
    return this.ragService.getStatus();
  }
}
```

#### 3.5 체크포인트

- [ ] 임베딩 빌드 테스트 (50개 문서 → 배치 분할 확인)
- [ ] 검색 캐시 테스트 (동일 쿼리 5회 → 2회차부터 빠른 응답)
- [ ] 멱등 처리 테스트 (동일 문서 재빌드 → 중복 없음)

---

### Phase 4: Worklog 도메인 (2일)

- [ ] Notion 동기화 (페이지네이션 적용)
- [ ] 파일 업로드 처리
- [ ] RAG 서비스 연동 (임베딩 빌드)

---

### Phase 5: MCP Server (선택, 1일)

- [ ] MCP SDK 연동
- [ ] search_worklog Tool 구현

---

### Phase 6: 통합 테스트 (1일)

- [ ] 대량 업로드 테스트 (OpenAI 재시도 동작 확인)
- [ ] 검색 성능 테스트 (캐시 히트율 확인)
- [ ] Notion 동기화 테스트 (100개 이상 블록)

---

## 환경변수

```env
NODE_ENV=development
PORT=4000
DATABASE_URL=./data/database.sqlite
OPENAI_API_KEY=
```

---

## 백로그 (향후 확장)

| 항목 | 현재 | 향후 |
|------|------|------|
| 벡터 검색 | SQLite + 전체 로드 | PostgreSQL + pgvector 또는 Qdrant |
| 캐시 | 인메모리 LRU | Redis |
| 큐 | 없음 | Bull (대량 임베딩 비동기 처리) |
| 모니터링 | 없음 | Prometheus + Grafana |

---

## 예상 타임라인

| Phase | 예상 기간 | 주요 산출물 |
|-------|----------|------------|
| 1. 프로젝트 초기화 | 1일 | 전역 검증, 예외 필터 |
| 2. Infrastructure | 1-2일 | DB 마이그레이션, OpenAI 재시도, Notion 페이지네이션 |
| 3. RAG 도메인 | 2-3일 | 토큰 청킹, 정규화, 캐시 |
| 4. Worklog 도메인 | 2일 | Notion 동기화 |
| 5. MCP Server | 1일 | MCP Tool |
| 6. 통합 테스트 | 1일 | 테스트 완료 |
| **총합** | **8-11일** | 약 2주 |

---

**마지막 업데이트**: 2026-01-29
