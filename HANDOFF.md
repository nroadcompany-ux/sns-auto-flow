# SNS FLOW AUTO — 작업 인계 지시서 (HANDOFF)

> 최종 업데이트: 2026-06-06 · 작성: Claude (이전 세션)
> 이 문서만 읽으면 다른 세션에서 바로 이어받을 수 있습니다.

---

## 0. 한 줄 요약

주제/URL/자료를 입력하면 **AI가 블로그·뉴스·인스타·스레드·카카오 콘텐츠를 한 번에 생성**하고
**멀티채널로 발행**하는 소상공인용 SNS 자동화 도구. **성재님 원본 스크립트 그대로 구현 완료.**

- 위치: `C:\Users\Administrator\projects\sns-auto-flow`
- dev 서버: `npm run dev` → **http://localhost:5245**
- 상태: **빌드 통과 + 브라우저 검수 완료**. 로컬 git 커밋만(미배포).

---

## 1. 현재 어디까지 됐나 (DONE)

- [x] Next.js 16 (App Router, Turbopack) + TypeScript 프로젝트 생성
- [x] 패키지 설치: `@anthropic-ai/sdk axios date-fns zustand react-hook-form next-auth @prisma/client mammoth cheerio sharp` + dev `prisma @types/node`
- [x] **성재님 원본 코드 전체 반영** (아래 파일 전부)
- [x] `npm run build` 통과
- [x] 브라우저 검수: UI 렌더 / 탭 전환 / 이미지 API(SVG) / 진단 403 게이트 / 콘솔 에러 0
- [x] 로컬 git 커밋 (시크릿 미포함 검증)

### 아직 안 된 것 (TODO)
- [ ] **`ANTHROPIC_API_KEY` 실제 키 입력** → 안 넣으면 콘텐츠 생성·진단 동작 안 함 (가장 중요)
- [ ] (실발행 원할 때) `META_ACCESS_TOKEN`, `KAKAO_CLIENT_ID` 등 채널 토큰 입력
- [ ] (DB 쓸 때) PostgreSQL 띄우고 `DATABASE_URL` 입력 + `npx prisma migrate dev`
- [ ] 하드코딩 시크릿 교체 (보안 — §4 참고)
- [ ] GitHub 원격 연결 + Vercel 배포 (※ 성재님 승인 후에만)

---

## 2. 기술 스택 & 핵심 결정 (중요 — 함부로 바꾸지 말 것)

| 항목 | 값 | 비고 |
|---|---|---|
| Next.js | **16.2.7** (Turbopack 기본) | `next lint` 제거됨, 빌드가 lint로 안 깨짐 |
| React | 19.2 | |
| Node | v24 | 최소 20.9+ |
| Prisma | **6.19.3** (의도적으로 v6) | ⚠️ v7은 schema에서 `url` 금지 + driver adapter 강제라 복잡 → **v6 유지** |
| DB(스키마) | **PostgreSQL** | 단, **현재 런타임 코드는 Prisma를 import하지 않음**(스키마는 정의만 됨) |
| 스타일 | 인라인 스타일 + Pretendard CDN | **Tailwind 미사용** (globals.css에 @tailwind 없음) |
| UI 구조 | **단일 페이지** `app/page.tsx` | 클라이언트 nav 상태로 5개 화면 전환 (별도 라우트 페이지 없음) |

### next.config.ts 주의
```ts
eslint: { ignoreDuringBuilds: true },     // Next16에서 이 키는 "지원 안 함" 경고 뜸 → 무해, 무시
typescript: { ignoreBuildErrors: true },  // 타입 에러 나도 빌드 통과시킴
```
→ 빌드 시 `Unrecognized key 'eslint'` 경고 2줄은 **정상**. 빌드는 통과함. (원본 그대로 둠)

---

## 3. 파일 구조 (전부 성재님 원본)

```
app/
  page.tsx                       ← ★ 핵심 600줄. SFA 단일페이지(생성/일정/보관함/설정/진단 탭)
  layout.tsx                     ← Pretendard 폰트 로드
  globals.css                    ← 인라인 CSS 변수 + 애니메이션
  api/
    content/generate/route.ts    ← AI 콘텐츠 생성 (POST)
    publish/route.ts             ← 멀티채널 발행 (POST)
    image/route.ts               ← SVG 이미지 생성 (POST, image/svg+xml 반환)
    diagnostic/route.ts          ← 관리자 진단 (POST, x-admin-key 헤더 인증)
lib/
  ai/generate.ts                 ← generateContent / diversifyTopics / extractFromSource / diagnosError
  publish/index.ts               ← 인스타·스레드·카카오·페이플레이 발행 + fallback
  image/generate.ts              ← SVG 카드 생성 / Canva 연동
types/index.ts                   ← TChannel, IGeneratedContent, IScheduleItem, CHANNEL_META 등
prisma/schema.prisma             ← Postgres. User/Brand/Content/Post/DiagnosticLog
.env.local                       ← 환경변수 (git 제외됨)
```

AI 모델: `claude-sonnet-4-20250514` (lib/ai/generate.ts 안에 하드코딩)

---

## 4. ⚠️ 주의사항 (반드시 지킬 것)

### 4-1. 지금 콘텐츠 생성이 안 되는 게 정상
- `.env.local`에 `ANTHROPIC_API_KEY=여기에_입력` (한글 placeholder) 상태.
- 이러면 Anthropic SDK가 키를 헤더로 못 넣어 **500 에러** → 화면엔 "오류 발생" ❌ 표시(크래시 X).
- **진짜 키(`sk-ant-...`)로 바꾸면 즉시 작동.** 원본엔 데모 모드가 없음.

### 4-2. 하드코딩 시크릿 — 배포 전 반드시 교체
`.env.local`의 아래 값은 개발용 placeholder. 실서비스 전 **강력한 무작위 값**으로:
```
NEXTAUTH_SECRET=sfa-nroad-2024-secret      ← 교체
PAYPLAY_API_SECRET=sfa-payplay-secret-2024 ← 교체
SFA_ADMIN_KEY=sfa-admin-nroad-2024         ← 교체 (관리자 진단 접근 키)
```
생성: `openssl rand -base64 32`
※ 관리자 진단 호출 시 헤더 `x-admin-key`가 `SFA_ADMIN_KEY`와 일치해야 함.

### 4-3. 배포 규칙 (엄수)
- **git push / Vercel 배포는 성재님 승인 후에만.** 자동 실행 금지.
- 모든 commit·push는 **nroadcompany 계정** (`nroadcompany@gmail.com`)으로만.
- Vercel은 Pro 배포 한도 있음 → 여러 작업 모아서 1회 push.

### 4-4. Prisma 관련
- 현재 런타임 코드는 Prisma client를 **import하지 않음** → DB 없이도 빌드·실행 OK.
- DB 기능을 실제로 붙이려면: Postgres 준비 → `.env.local`의 `DATABASE_URL` 채우기 → `npx prisma migrate dev` → 코드에서 `@prisma/client` import.
- **Prisma v7로 올리지 말 것** (schema 호환 깨짐). v6 유지.

### 4-5. 기타
- `.env*`는 `.gitignore`에 있어 커밋 안 됨 → 새 세션에선 `.env.local` 직접 확인.
- 모바일 반응형 미적용 (원본이 데스크톱 grid 기준). 필요 시 추가 작업.

---

## 5. 빠른 시작 (새 세션에서)

```powershell
cd C:\Users\Administrator\projects\sns-auto-flow
npm install              # 혹시 node_modules 없으면
npm run dev              # http://localhost:5245
```
빌드 확인: `npm run build`

---

## 6. git 상태

- 브랜치: `master` · 원격(remote): **없음** (로컬 전용)
- 커밋 이력:
  - `c136b30` feat: 원본 전체 구현 (현재 = 성재님 원본 코드)
  - `8b95fea` feat: (구버전) Claude가 축약본으로 만든 SQLite·데모 버전 — 참고용 히스토리
  - `f1af6d5` Initial commit from Create Next App
- 되돌리려면: `git checkout 8b95fea -- .` (구버전 복구) 등으로 가능.

---

## 7. 검수 기록 (이전 세션에서 직접 확인함)

- ✅ `npm run build` 통과 (라우트 5개: `/` + API 4개)
- ✅ UI 렌더: 사이드바, 콘텐츠 소스 4종, 발행채널 10개(4개 ON), 발행일정, 자동화 요약(16개)
- ✅ 탭 전환(클라이언트 nav): 생성/일정/보관함/설정/진단 정상
- ✅ `/api/image` → 200, SVG 정상 반환
- ✅ `/api/diagnostic` → 잘못된 키 403, 올바른 키 통과
- ⚠️ `/api/content/generate`, `/api/diagnostic`(분석) → ANTHROPIC 키 없어 500(안전 실패). **키 넣으면 해결**.
- ✅ 콘솔 에러 0

---

## 8. 다음 세션 추천 작업 순서

1. `.env.local`에 진짜 `ANTHROPIC_API_KEY` 입력 → "자동화 시작" 눌러 실제 생성 확인
2. 생성 결과(블로그/뉴스/인스타/스레드/카카오) 품질 검토 → 프롬프트(lib/ai/generate.ts) 튜닝
3. 멀티채널 실발행 원하면 META/카카오 토큰 입력 후 발행 테스트
4. (선택) Postgres 연결 + 콘텐츠 영구 저장 기능 추가
5. 하드코딩 시크릿 교체 → 성재님 승인받고 GitHub/Vercel 배포
