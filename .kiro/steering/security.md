---
inclusion: always
---

# 보안 개발 규칙

## 필수 규칙

### 민감 정보 보호
- API 키, 토큰, 비밀번호 등을 하드코딩 금지
- 환경변수(`.env`) 사용하여 민감 정보 관리
- `.env` 파일은 `.gitignore`에 포함

```typescript
// ✅ 올바른 예 (Next.js)
const apiUrl = process.env.NEXT_PUBLIC_API_URL;
const apiKey = process.env.API_KEY; // 서버 전용

// ❌ 잘못된 예
const apiKey = 'sk-1234567890abcdef'; // 하드코딩 금지
```

### XSS (Cross-Site Scripting) 방지
- 사용자 입력값을 그대로 DOM에 삽입 금지
- React의 기본 렌더링 사용 (자동 이스케이프)
- `dangerouslySetInnerHTML` 사용 시 반드시 sanitize 처리

```tsx
// ✅ 안전한 텍스트 렌더링 (React)
<div>{userInput}</div>

// ✅ sanitize 후 HTML 사용
import DOMPurify from 'dompurify';

const SafeHtml = ({ html }: { html: string }) => (
  <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} />
);

// ❌ 금지
<div dangerouslySetInnerHTML={{ __html: userInput }} />
```

### CSRF (Cross-Site Request Forgery) 방지
- 모든 API 요청에 CSRF 토큰 포함
- SameSite 쿠키 설정 사용
- 중요한 액션에 대해 재인증 요구

```typescript
// API 요청 시 CSRF 토큰 포함
const apiClient = axios.create({
  headers: {
    'X-CSRF-TOKEN': getCsrfToken(),
    'Content-Type': 'application/json'
  }
});
```

### 인증 및 권한 관리
- JWT 토큰은 httpOnly 쿠키 또는 secure storage 사용
- 토큰 만료 시간 적절히 설정
- 로그아웃 시 토큰 완전 삭제

```typescript
// 토큰 저장 (안전한 방식)
const storeToken = (token: string) => {
  document.cookie = `token=${token}; Secure; HttpOnly; SameSite=Strict`;
};

// 로그아웃 시 토큰 삭제
const logout = () => {
  document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
};
```

## 권장사항

### 입력 검증
- 클라이언트와 서버 양쪽에서 입력 검증
- 화이트리스트 방식의 입력 검증 우선
- 정규식을 사용한 입력 형식 검증

```typescript
// 이메일 검증
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// 전화번호 검증
const validatePhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^01[0-9]{1}-[0-9]{3,4}-[0-9]{4}$/;
  return phoneRegex.test(phone);
};
```

### HTTPS 사용
- 모든 API 통신은 HTTPS 사용
- Mixed Content 경고 방지
- Secure 쿠키 설정 사용

```typescript
// API 베이스 URL은 항상 HTTPS
const API_BASE_URL = 'https://api.emart.com';

// 쿠키 설정 시 Secure 플래그 사용
document.cookie = 'sessionId=abc123; Secure; SameSite=Strict';
```

## 절대 금지

### 금지된 정보 노출
- 콘솔 로그에 민감한 정보 출력 금지
- 에러 메시지에 시스템 정보 포함 금지
- 소스 코드에 주석으로 비밀번호나 API 키 남기지 않기

```typescript
// ❌ 금지된 예시
console.log('사용자 토큰:', token); // 토큰 노출 금지

// ✅ 일반적인 에러 메시지
throw new Error('요청 처리 중 오류가 발생했습니다.');
```

### 불안전한 저장 방식
- localStorage에 민감한 정보 저장 금지
- URL에 토큰이나 비밀번호 포함 금지
- 쿼리 파라미터에 민감한 데이터 전송 금지

```typescript
// ❌ 금지된 저장 방식
localStorage.setItem('token', userToken); // 토큰을 localStorage에 저장 금지

// ❌ 금지된 URL 방식
window.location.href = `/profile?token=${token}`; // URL에 토큰 포함 금지
```

## 프로젝트 특화 보안

### 결제 관련 보안
- 결제 정보는 클라이언트에서 저장하지 않음
- PCI DSS 준수
- 결제 프로세스는 HTTPS 강제

```typescript
const processPayment = async (paymentInfo: PaymentInfo) => {
  try {
    const result = await securePaymentAPI.process(paymentInfo);
    paymentInfo = null; // 결제 정보 메모리에서 완전 제거
    return result;
  } catch (error) {
    paymentInfo = null; // 결제 실패 시에도 정보 제거
    throw error;
  }
};
```

### 개인정보 보호
- 개인정보는 최소한으로만 수집
- 화면에 표시될 때 마스킹 처리
- 로그에 개인정보 포함하지 않음

```typescript
// 개인정보 마스킹 유틸리티
export const maskPersonalInfo = {
  phone: (phone: string) => 
    phone.replace(/(\d{3})-(\d{3,4})-(\d{4})/, '$1-****-$3'),
  
  email: (email: string) => 
    email.replace(/(.{2}).+@(.+)/, '$1***@$2'),
  
  name: (name: string) => 
    name.length > 2 ? name[0] + '*'.repeat(name.length - 2) + name.slice(-1) : name
};
```

### 세션 관리
- 세션 타임아웃 적절히 설정 (30분)
- 동시 로그인 제한
- 의심스러운 활동 감지 시 세션 종료

```typescript
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30분

let sessionTimer: NodeJS.Timeout;

const resetSessionTimer = () => {
  clearTimeout(sessionTimer);
  sessionTimer = setTimeout(() => {
    logout();
    router.push('/login');
  }, SESSION_TIMEOUT);
};

document.addEventListener('click', resetSessionTimer);
document.addEventListener('keydown', resetSessionTimer);
```

## 보안 체크리스트

- [ ] 환경변수를 사용하여 민감 정보를 관리하는가?
- [ ] 사용자 입력에 대한 적절한 검증이 있는가?
- [ ] XSS 공격을 방지하는 코드인가?
- [ ] CSRF 토큰을 사용하고 있는가?
- [ ] 인증 토큰을 안전하게 저장하고 있는가?
- [ ] HTTPS를 사용하고 있는가?
- [ ] 에러 메시지에서 민감한 정보를 숨기고 있는가?
- [ ] 개인정보를 적절히 마스킹하고 있는가?
- [ ] 세션 관리가 적절히 구현되어 있는가?
- [ ] 로그에 민감한 정보가 포함되지 않았는가?
