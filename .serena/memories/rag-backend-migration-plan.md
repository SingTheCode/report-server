# RAG 백엔드 마이그레이션 계획

## 개요

현재 프로젝트의 RAG 로직(IndexedDB 기반) 및 작업 기록 수집(Notion, 파일 업로드)을 별도 NestJS 백엔드로 이전하고, MCP Server 기능도 백엔드에서 제공.

## 아키텍처

```
Frontend (Next.js)              Backend (NestJS - 새 프로젝트)
├── UI만 담당                   ├── GraphQL API
├── GraphQL 호출          →     ├── RAG Service (임베딩/검색)
└── 결과 표시                   ├── Worklog Service (Notion/파일)
                               ├── MCP Server
                               └── SQLite DB
```

## 백엔드 기술 스택

- NestJS
- TypeScript
- GraphQL (Apollo)
- SQLite (TypeORM 또는 Prisma)
- OpenAI API (임베딩)

---

## 백엔드 도메인 구조

```
src/
├── rag/                        # RAG 도메인
│   ├── rag.module.ts
│   ├── rag.resolver.ts         # GraphQL Resolver
│   ├── rag.service.ts          # 임베딩 빌드/검색
│   ├── rag.repository.ts       # SQLite CRUD
│   └── dto/
│       ├── build-embeddings.input.ts
│       └── search-embeddings.input.ts
│
├── worklog/                    # 작업 기록 도메인
│   ├── worklog.module.ts
│   ├── worklog.resolver.ts     # GraphQL Resolver
│   ├── worklog.service.ts      # Notion/파일 처리
│   ├── notion/
│   │   ├── notion.service.ts   # Notion API 호출
│   │   └── notion.transformer.ts # 블록 → 마크다운 변환
│   └── dto/
│       ├── sync-notion.input.ts
│       └── upload-files.input.ts
│
├── mcp/                        # MCP Server 도메인
│   ├── mcp.module.ts
│   └── mcp.server.ts           # MCP Tool 제공
│
└── common/
    ├── database/
    │   └── database.module.ts  # SQLite 설정
    └── openai/
        └── openai.service.ts   # 임베딩 생성
```

---

## GraphQL 스키마

### RAG

```graphql
type Mutation {
  buildEmbeddings(input: BuildEmbeddingsInput!): BuildEmbeddingsResponse!
}

type Query {
  searchEmbeddings(input: SearchEmbeddingsInput!): SearchEmbeddingsResponse!
  embeddingStatus: EmbeddingStatusResponse!
}

input BuildEmbeddingsInput {
  documents: [DocumentInput!]!
}

input DocumentInput {
  id: String!
  content: String!
  title: String!
}

input SearchEmbeddingsInput {
  query: String!
  limit: Int
  category: String
}
```

### Worklog (작업 기록)

```graphql
type Mutation {
  syncNotion(input: SyncNotionInput!): SyncNotionResponse!
  uploadFiles(input: UploadFilesInput!): UploadFilesResponse!
}

type Query {
  notionPages: [NotionPage!]!
  worklogStatus: WorklogStatusResponse!
}

input SyncNotionInput {
  databaseId: String!
  apiToken: String!
}

input UploadFilesInput {
  files: [Upload!]!
}

type NotionPage {
  id: String!
  title: String!
  content: String!
  lastEditedAt: DateTime!
}

type SyncNotionResponse {
  success: Int!
  failed: Int!
  pages: [NotionPage!]!
}

type UploadFilesResponse {
  success: Int!
  failed: Int!
  documents: [Document!]!
}
```

---

## 프론트엔드 추가 변경사항

### 삭제 대상 (추가)

| 파일 | 이유 |
|------|------|
| `src/domains/worklog/hooks/useNotionSync.ts` | 백엔드로 이동 |
| `src/domains/worklog/utils/notionToMarkdown.ts` | 백엔드로 이동 |
| `src/domains/worklog/api/worklogApi.ts` | GraphQL로 변경 |
| `src/app/api/notion/*` | 백엔드로 이동 |

### 수정 대상 (추가)

| 파일 | 변경 |
|------|------|
| `src/domains/worklog/components/SyncStatus.tsx` | 백엔드 API 호출 |
| `src/domains/worklog/components/ImportSection.tsx` | 백엔드 API 호출 |

### 신규 생성 (추가)

| 파일 | 역할 |
|------|------|
| `src/domains/worklog/api/worklogApi.ts` | GraphQL 호출 |
| `src/domains/worklog/hooks/useWorklogApi.ts` | 백엔드 API 훅 |
| `src/domains/worklog/types/request.ts` | 요청 타입 |
| `src/domains/worklog/types/response.ts` | 응답 타입 |

---

## 환경변수

### 프론트엔드
```
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000/graphql
```

### 백엔드
```
DATABASE_URL=./data/database.sqlite
OPENAI_API_KEY=sk-xxx
NOTION_API_TOKEN=secret_xxx (선택적, 사용자별 입력 가능)
```

---

## 작업 순서

### Phase 1: 백엔드 프로젝트 생성
- [ ] NestJS 프로젝트 초기화
- [ ] GraphQL 설정 (Apollo)
- [ ] SQLite 설정 (TypeORM/Prisma)
- [ ] OpenAI 서비스 구현

### Phase 2: RAG 도메인 구현
- [ ] 청킹 로직 이식
- [ ] 카테고리 분류 로직 이식
- [ ] 임베딩 빌드 Resolver
- [ ] 검색 Resolver
- [ ] 상태 조회 Resolver

### Phase 3: Worklog 도메인 구현
- [ ] Notion API 연동
- [ ] 블록 → 마크다운 변환
- [ ] 파일 업로드 처리
- [ ] Sync Resolver
- [ ] Upload Resolver

### Phase 4: MCP Server 구현
- [ ] MCP SDK 연동
- [ ] search_work_logs Tool
- [ ] 백엔드 API 호출

### Phase 5: 프론트엔드 Worklog 마이그레이션
- [ ] Notion 관련 로직 삭제
- [ ] worklogApi GraphQL 변경
- [ ] 컴포넌트 수정

### Phase 6: 통합 테스트
- [ ] 임베딩 빌드 테스트
- [ ] 검색 테스트
- [ ] Notion 동기화 테스트
- [ ] MCP Tool 테스트

---

## 상태

### 프론트엔드 RAG 마이그레이션
- [x] Phase 1: IndexedDB 기반 RAG 로직 삭제
- [x] Phase 2: GraphQL 클라이언트 설정
- [x] Phase 3: RAG API GraphQL 변경
- [x] Phase 4: 단순화된 훅 생성
- [x] Phase 5: 컴포넌트 수정

### 백엔드 구현
- [ ] Phase 1: 백엔드 프로젝트 생성
- [ ] Phase 2: RAG 도메인 구현
- [ ] Phase 3: Worklog 도메인 구현
- [ ] Phase 4: MCP Server 구현

### 프론트엔드 Worklog 마이그레이션
- [ ] Phase 5: Worklog 마이그레이션

---

## 🚀 NestJS 프로젝트 생성 세부 계획

### Phase 1: 프로젝트 초기화 (1-2일)

#### 1.1 프로젝트 생성

```bash
nest new rag-backend --package-manager yarn
cd rag-backend
```

#### 1.2 필수 패키지 설치

```bash
yarn add \
  @nestjs/graphql @apollo/server graphql \
  @nestjs/typeorm typeorm sqlite3 \
  @nestjs/config dotenv \
  class-validator class-transformer \
  openai
```

#### 1.3 환경변수 설정

`.env` 파일 생성:
```env
DATABASE_URL=./data/database.sqlite
OPENAI_API_KEY=sk-your-key
NODE_ENV=development
```

#### 1.4 체크포인트

- [ ] `yarn start:dev` 실행 성공
- [ ] GraphQL Playground 접속 확인 (`http://localhost:3000/graphql`)

---

### Phase 2: DB & 공통 모듈 (1-2일)

#### 2.1 TypeORM 설정

`app.module.ts`에 TypeORM 연결:
```typescript
TypeOrmModule.forRoot({
  type: 'sqlite',
  database: process.env.DATABASE_URL,
  entities: [__dirname + '/**/*.entity{.ts,.js}'],
  synchronize: process.env.NODE_ENV === 'development',
})
```

#### 2.2 Entity 정의

**Embedding Entity**:
- id, documentId, chunkIndex, content, vector, metadata
- 인덱스: `@Index('idx_document_id', ['documentId'])`

**Document Entity**:
- id, title, category, createdAt, updatedAt

#### 2.3 OpenAI 공통 모듈

`OpenAiModule` 생성:
- `embedText(text: string): Promise<number[]>`
- `embedBatch(texts: string[]): Promise<number[][]>`

#### 2.4 체크포인트

- [ ] Entity 생성 완료
- [ ] OpenAI 임베딩 테스트 성공
- [ ] DB 마이그레이션 파일 생성

---

### Phase 3: RAG 핵심 기능 (2-3일)

#### 3.1 서비스 구현

**RagService**:
- `buildEmbeddings()`: 문서 청킹 → 임베딩 생성 → DB 저장
- `search()`: 쿼리 임베딩 → 코사인 유사도 계산 → 상위 N개 반환

#### 3.2 테스트 쿼리

```graphql
mutation {
  buildEmbeddings(input: {
    documents: [
      { id: "1", title: "Test", content: "Hello world", category: "개발" }
    ]
  }) {
    success
    documentCount
    chunkCount
  }
}

query {
  searchEmbeddings(input: { query: "hello", limit: 5 }) {
    results { title, similarity }
  }
}
```

#### 3.3 성능 기준

- 임베딩 빌드: ~1초/문서
- 검색: ~100ms (1000개 벡터)

#### 3.4 체크포인트

- [ ] 임베딩 빌드 성공
- [ ] 검색 결과 반환 확인
- [ ] 성능 기준 충족

---

### Phase 4: Worklog + Notion 연동 (2-3일)

#### 4.1 패키지 추가

```bash
yarn add @notionhq/client
```

#### 4.2 Notion 서비스

**NotionService**:
- `fetchDatabase()`: 데이터베이스 페이지 목록 조회
- `fetchPageContent()`: 페이지 블록 재귀 조회
- `convertToMarkdown()`: 블록 → 마크다운 변환

#### 4.3 주의사항

- Notion API 토큰은 환경변수로만 관리
- 블록 재귀 처리 시 깊이 제한 (무한 루프 방지)
- 마크다운 변환 테스트 필수

#### 4.4 체크포인트

- [ ] Notion 데이터베이스 조회 성공
- [ ] 마크다운 변환 정상 동작
- [ ] 임베딩 빌드 연동 완료

---

### Phase 5: MCP Server (선택, 1-2일)

#### 5.1 패키지 추가

```bash
yarn add @modelcontextprotocol/sdk
```

#### 5.2 MCP 도구 정의

- `search_worklog`: 작업 기록 검색
- `get_worklog_detail`: 상세 내용 조회

#### 5.3 클라이언트 설정

```json
{
  "claude": {
    "mcpServers": {
      "rag-backend": {
        "command": "node",
        "args": ["dist/mcp.server.js"]
      }
    }
  }
}
```

---

### Phase 6: 프론트엔드 마이그레이션 (1-2일)

#### 6.1 변경 범위

**Before** (IndexedDB + 로컬 API):
```typescript
import { searchLocal } from '@/domains/rag/api/localSearch';
```

**After** (GraphQL):
```typescript
import { gql, useQuery } from '@apollo/client';

const SEARCH_EMBEDDINGS = gql`
  query SearchEmbeddings($input: SearchEmbeddingsInput!) {
    searchEmbeddings(input: $input) {
      results { id, title, similarity }
    }
  }
`;
```

#### 6.2 체크포인트

- [ ] Apollo Client 설정 완료
- [ ] 기존 API 호출 GraphQL로 교체
- [ ] E2E 테스트 통과

---

## ⚠️ 실무 주의사항

### 동시성 문제

임베딩 빌드 중 검색 요청 처리:
- Phase 3 이후 Bull 큐 도입 고려
- WebSocket으로 진행률 전송

```bash
yarn add @nestjs/bull bull redis
```

### 벡터 검색 성능

SQLite 한계 (모든 벡터 메모리 로드):
- 데이터 증가 시 PostgreSQL + pgvector 마이그레이션 고려

### OpenAI 비용 최적화

중복 임베딩 방지:
- 텍스트 해시 기반 캐싱 구현
- 동일 텍스트 재임베딩 방지

---

## 📊 타임라인

| Phase | 예상 기간 | 상태 |
|-------|----------|------|
| 1. 프로젝트 초기화 | 1-2일 | ▢ 대기 |
| 2. DB & 공통 모듈 | 1-2일 | ▢ 대기 |
| 3. RAG 핵심 기능 | 2-3일 | ▢ 대기 |
| 4. Worklog + Notion | 2-3일 | ▢ 대기 |
| 5. MCP Server (선택) | 1-2일 | ▢ 대기 |
| 6. 프론트엔드 마이그레이션 | 1-2일 | ▢ 대기 |
| **총합** | **9-14일** | 약 2-3주 |

---

**마지막 업데이트**: 2026-01-28