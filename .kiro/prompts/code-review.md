# EmartApp 코드 리뷰 프롬프트

## 사용법
`{{ 브랜치이름 }}` 요청 시 현재 브랜치에서 `{{ 브랜치 이름 }}` 로의 코드 리뷰 진행

---

## 1. 변경사항 확인
```bash
git diff {{ 브랜치이름 }}...HEAD
git log {{ 브랜치이름 }}..HEAD --oneline
```

---

## 2. 코드 리뷰 체크리스트

### 아키텍처 준수
- [ ] 레이어 분리 (Controller → Service → State → Repository → Transform)
- [ ] 의존성 방향 준수 (단방향 흐름)
- [ ] Controller에서 Api 직접 호출 금지
- [ ] 도메인 간 직접 참조 금지

### Composable 규칙
- [ ] UI 반환 금지 (상태와 로직만 반환)
- [ ] 비즈니스 로직이 Composable에 집중
- [ ] 도메인별 파일 위치 (`hooks/[domain].ts`)

### Compound Component 규칙
- [ ] 비즈니스 로직 포함 금지
- [ ] provide/inject로 상태 공유
- [ ] Root Component에서만 Composable 호출

### 비동기 처리
- [ ] Pinia 비동기 액션 사용
- [ ] Suspense + onErrorCaptured 사용
- [ ] 컴포넌트 내부 isLoading/isError 분기 금지

### 타입 안정성
- [ ] 타입 정의 (`types/[domain].d.ts`)
- [ ] Transform 함수의 완전한 타입 반환
- [ ] any 타입 사용 최소화
- [ ] 옵셔널 체이닝 + Nullish Coalescing 사용

### 보안
- [ ] 민감 정보 하드코딩 없음
- [ ] 사용자 입력 검증
- [ ] XSS 방지 (v-html 사용 시 sanitize)
- [ ] 개인정보 마스킹 처리
- [ ] 콘솔 로그에 민감 정보 출력 금지
- [ ] localStorage에 토큰 저장 금지

### 코드 품질
- [ ] 명명 규칙 준수
- [ ] 중복 코드 제거
- [ ] 에러 처리
- [ ] ESLint/Prettier 통과
- [ ] 모든 제어문에 중괄호 사용

### 커밋 메시지
- [ ] 일감번호 포함 `[SCRUM-XXXXX]`
- [ ] 커밋 타입 적절 (feat/fix/refactor/docs/test/chore)
- [ ] 변경사항 명확히 기술

---

## 3. 안티 패턴 확인

### 금지 패턴
1. Composable에서 UI 반환
2. Compound Component에서 비즈니스 로직
3. 단계 컴포넌트에서 라우터 직접 사용
4. Controller에서 Api 직접 호출
5. UI 컴포넌트에서 직접 fetch
6. 컴포넌트 내부 로딩/에러 분기
7. provide/inject로 도메인 간 데이터 공유
8. Props Drilling 5단계 이상

---

## 4. 리뷰 결과 형식

### 피드백 우선순위
- **Critical**: 반드시 수정 필요
- **Warning**: 수정 권장
- **Suggestion**: 개선 고려사항

### 파일별 리뷰
```
📁 [파일경로]
- 🔴 Critical: [문제점]
- 🟡 Warning: [문제점]
- 🟢 Suggestion: [개선안]
- ✅ 칭찬: [좋은 점]
```

### 전체 요약
- 주요 이슈
- 머지 가능 여부
- 추가 작업 필요 사항
