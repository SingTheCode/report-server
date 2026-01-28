# 채용 정보 추출 프롬프트

## 역할
Perplexity에서 조사한 채용 정보를 구조화된 JSON 형식으로 변환하여 면접 준비와 이력서 작성에 필요한 데이터를 생성합니다.

## 사용 방법

### 1단계: Perplexity 조사
1. `perplexity-job-research-prompt.md`의 프롬프트를 Perplexity에 입력
2. 채용 공고 URL과 함께 실행
3. 조사 결과를 복사

### 2단계: JSON 변환
사용자가 Perplexity 조사 결과를 공유하면:
1. 텍스트 형태의 조사 결과를 분석
2. 구조화된 JSON 형식으로 변환
3. `output/job-analysis.json` 파일로 저장

## 추출 정보 구조

```json
{
  "company": {
    "name": "회사명",
    "industry": "산업군",
    "size": "기업 규모",
    "location": "근무지",
    "culture": {
      "values": ["핵심 가치 1", "핵심 가치 2"],
      "workStyle": "업무 방식 설명",
      "benefits": ["복지 1", "복지 2"]
    }
  },
  "position": {
    "title": "포지션명",
    "team": "팀명",
    "level": "경력 요구사항",
    "period": "모집 기간",
    "responsibilities": [
      "담당 업무 1",
      "담당 업무 2"
    ]
  },
  "requirements": {
    "required": {
      "experience": "필수 경력",
      "skills": ["필수 기술 1", "필수 기술 2"],
      "knowledge": ["필수 지식 1", "필수 지식 2"]
    },
    "preferred": {
      "skills": ["우대 기술 1", "우대 기술 2"],
      "experience": ["우대 경험 1", "우대 경험 2"],
      "qualities": ["우대 자질 1", "우대 자질 2"]
    }
  },
  "techStack": {
    "frontend": ["React", "Next.js", "TypeScript"],
    "backend": ["Node.js", "Python"],
    "infrastructure": ["AWS", "Docker"],
    "tools": ["Git", "Jira"],
    "methodologies": ["Agile", "TDD"]
  },
  "teamCulture": {
    "developmentProcess": "개발 프로세스 설명",
    "collaboration": "협업 방식",
    "codeReview": "코드 리뷰 문화",
    "learning": "학습 지원"
  },
  "interviewInsights": {
    "interviewers": [
      {
        "name": "면접관 이름",
        "role": "직책",
        "experience": "경력",
        "focus": "중점 평가 항목"
      }
    ],
    "process": "면접 프로세스",
    "tips": ["면접 팁 1", "면접 팁 2"]
  },
  "projects": [
    {
      "name": "프로젝트명",
      "description": "프로젝트 설명",
      "techStack": ["기술 1", "기술 2"],
      "challenges": "기술적 도전 과제"
    }
  ],
  "keywords": {
    "technical": ["기술 키워드 1", "기술 키워드 2"],
    "soft": ["소프트 스킬 1", "소프트 스킬 2"],
    "domain": ["도메인 키워드 1", "도메인 키워드 2"]
  }
}
```

## 추출 프로세스

### 1. 링크 분류
```
채용 공고: 공식 채용 페이지
회사 소개: About, Culture, Values 페이지
기술 블로그: 기술 아티클, 개발 후기
팀 인터뷰: 구성원 인터뷰, 팀 소개
```

### 2. 정보 수집 우선순위

**필수 정보** (채용 공고에서):
- 포지션명, 팀명
- 담당 업무
- 필수/우대 자격요건
- 기술 스택

**추가 정보** (기술 블로그에서):
- 실제 사용 중인 기술 스택
- 기술적 도전 과제
- 개발 문화 및 프로세스

**심층 정보** (팀 인터뷰에서):
- 면접관 정보
- 팀 분위기
- 성장 기회
- 업무 방식

### 3. 키워드 추출 규칙

**기술 키워드**:
- 프로그래밍 언어, 프레임워크, 라이브러리
- 개발 도구, 인프라
- 방법론, 아키텍처 패턴

**소프트 스킬 키워드**:
- 협업, 커뮤니케이션
- 문제 해결, 분석력
- 학습 능력, 성장 마인드

**도메인 키워드**:
- 산업 특화 용어
- 비즈니스 도메인
- 서비스 특성

## 사용 예시

### 입력
```
사용자: "이 채용 공고 분석해줘"
- https://recruit.company.com/job/123
- https://tech.company.com/blog
- https://recruit.company.com/people
```

### 출력
```json
{
  "company": {
    "name": "네이버 클라우드",
    "industry": "클라우드 서비스",
    "size": "대기업",
    "location": "경기 성남시 분당구",
    "culture": {
      "values": ["끊임없는 질문과 고민", "사용자 중심", "개발자가 중심"],
      "workStyle": "재택근무 가능, 유연한 근무 시간",
      "benefits": ["육아휴직 지원", "학습 지원", "복지 포인트"]
    }
  },
  "position": {
    "title": "AI Solution FE 개발",
    "team": "AI Solution 팀",
    "level": "경력 3년 이상",
    "period": "2025.11.17 ~ 2025.12.05",
    "responsibilities": [
      "RAG 기반 엔터프라이즈 서비스 개발",
      "AI 기술을 활용한 이미지 분석 웹 서비스 개발",
      "AI 서비스 성능 평가 및 개선 도구 개발",
      "글로벌 사용자 대상 서비스 아키텍처 설계",
      "공통 패키지 및 유틸리티 라이브러리 개발"
    ]
  },
  "requirements": {
    "required": {
      "experience": "Frontend 개발 경력 3년 이상",
      "skills": [
        "React/Next.js",
        "JavaScript/TypeScript",
        "HTML5/CSS3",
        "상태 관리 라이브러리"
      ],
      "knowledge": [
        "LLM API 통합 경험",
        "AI 기반 개발 도구 활용",
        "CS 기본 지식"
      ]
    },
    "preferred": {
      "skills": [
        "Storybook Component Testing",
        "Vitest",
        "Playwright",
        "tailwind",
        "shadcn/ui",
        "Radix UI",
        "Konva.js"
      ],
      "experience": [
        "서비스 품질·성능·UX 개선",
        "오픈소스 프로젝트 기여",
        "글로벌 서비스 런칭"
      ],
      "qualities": [
        "끊임없는 질문과 고민",
        "효율적인 개발 추구",
        "팀 협업 중시"
      ]
    }
  },
  "techStack": {
    "frontend": ["React", "Next.js", "TypeScript", "HTML5", "CSS3"],
    "tools": ["Cursor IDE", "GitHub Copilot", "Storybook", "Vitest", "Playwright"],
    "libraries": ["tailwind", "shadcn/ui", "Radix UI", "Konva.js"],
    "methodologies": ["Agile", "Code Review", "Pair Programming"]
  },
  "teamCulture": {
    "developmentProcess": "스크럼 기반 애자일, 일일 스탠드업",
    "collaboration": "WORKS 메신저, 화면 공유, 페어 프로그래밍",
    "codeReview": "코드 리뷰 문화 정착, 건설적 피드백",
    "learning": "기술 블로그 작성 권장, 사내 세미나"
  },
  "interviewInsights": {
    "interviewers": [
      {
        "name": "지현정",
        "role": "Senior Frontend Engineer",
        "experience": "10년차",
        "focus": "실무 경험, 문제 해결 능력, 협업 태도"
      }
    ],
    "process": "서류 → 1차 기술 면접 → 2차 컬처핏 면접",
    "tips": [
      "실제 프로젝트 경험 구체적으로 설명",
      "문제 해결 과정 중심으로 답변",
      "팀 협업 경험 강조"
    ]
  },
  "projects": [
    {
      "name": "클라우드 플랫폼 콘솔",
      "description": "네이버 클라우드 플랫폼 포털 및 콘솔 화면 개발",
      "techStack": ["React", "TypeScript", "상태 관리"],
      "challenges": "대규모 포털 관리, 실시간 콘텐츠 반영"
    },
    {
      "name": "클라우드 인사이트",
      "description": "클라우드 모니터링 상품 개발",
      "techStack": ["React", "실시간 데이터 시각화"],
      "challenges": "여러 상품 연동, 실시간 데이터 처리"
    }
  ],
  "keywords": {
    "technical": [
      "React", "Next.js", "TypeScript", "LLM API", "RAG",
      "성능 최적화", "아키텍처 설계", "테스팅"
    ],
    "soft": [
      "문제 해결", "협업", "커뮤니케이션", "학습 능력",
      "끊임없는 질문", "효율성 추구"
    ],
    "domain": [
      "AI 서비스", "엔터프라이즈", "클라우드", "글로벌 서비스",
      "이미지 분석", "성능 평가"
    ]
  }
}
```

## 주의사항

- 추측이나 가정은 명시적으로 표시
- 정보가 없는 필드는 빈 배열 또는 null로 표시
- 중복 정보는 제거하고 통합
- 최신 정보 우선 (날짜 확인)

## 출력 파일

- `output/job-analysis.json`: 구조화된 채용 정보
