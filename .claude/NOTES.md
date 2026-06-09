# 마케팅플레이 오토 — 작업 노트

## 서비스 이름 확정
- **마케팅플레이 오토** (브랜드명)
  - SNS Maker Auto (텍스트 콘텐츠 자동 생성 + 발행)
  - Visual Maker Auto (이미지 + 영상 자동 생성 + 발행)

---

## ⚠️ 제약사항 메모

### Midjourney 자동화 불가
- Midjourney는 Discord 전용으로 공개 API가 없음
- **자동화 불가** → "수동 생성 후 업로드" 패널로만 지원
- 이미지 자동 생성은 **Flux API (fal.ai)** 로 대체

---

## 기술 스택 결정

| 기능 | 선택 | 비고 |
|------|------|------|
| 이미지 자동 생성 | Flux (fal.ai) | 완전 API 자동화, ~$0.003/장 |
| 이미지 고품질 (수동) | Midjourney | UI에서 업로드 플로우만 제공 |
| 영상 자동 생성 | Remotion | 텍스트 → 카드뉴스 영상 |
| 텍스트 생성 | Claude API | 현재 연동 유지 |
| 발행 | SNS Flow Auto | 현재 연동 유지 |

---

## 코워크 지시서

### 📄 지시서 A — Remotion 영상 생성 파이프라인

```
[프로젝트] sns-auto-flow (Next.js 15, Vercel 배포)
[목표] SNS Maker Auto에서 생성된 텍스트 콘텐츠를
       Remotion으로 카드뉴스 영상(MP4/WebM)으로 자동 변환

[할 일]
1. remotion, @remotion/renderer, @remotion/lambda 설치
2. /remotion/compositions/CardNews.tsx 작성
   - props: { title, body, hashtags, brandColor, brandName }
   - 슬라이드 5장짜리 카드뉴스 (페이드인 애니메이션)
   - 1080x1080 (인스타 정방형)
3. /app/api/render/route.ts 작성
   - POST body: { itemId, content, brandColor }
   - Remotion Lambda 또는 renderMedia()로 MP4 렌더링
   - 결과 URL 반환
4. Vercel에서 렌더링 불가 → Lambda 설정 or
   별도 render 서버 (Railway/Fly.io) 권장

[참고 파일]
- /types/index.ts — IScheduleItem, content 구조 확인
- /app/api/content/generate — 콘텐츠 생성 결과 구조

[완료 조건]
POST /api/render → { success: true, videoUrl: "..." } 반환
```

---

### 📄 지시서 B — fal.ai Flux 이미지 생성 연동

```
[프로젝트] sns-auto-flow (Next.js 15)
[목표] Visual Maker Auto에서 주제/프롬프트를
       Flux API로 이미지 자동 생성

[할 일]
1. @fal-ai/client 설치
2. .env에 FAL_KEY=발급받은_키 추가
3. /app/api/visual/generate/route.ts 작성
   - POST body: { prompt, brandName, style, size }
   - fal.subscribe("fal-ai/flux-pro", { input: { prompt, image_size: "square_hd" } })
   - 결과 image URL 배열 반환
4. 프롬프트 자동 생성 로직:
   - 한국어 주제 → 영어 프롬프트 변환 (Claude API 활용)
   - 브랜드 컬러/스타일 반영

[환경]
- FAL_KEY는 fal.ai에서 발급 (fal.ai/dashboard)
- 모델: fal-ai/flux-pro (고품질) or fal-ai/flux/schnell (빠름/무료)

[완료 조건]
POST /api/visual/generate { topic: "여름 마케팅" }
→ { success: true, images: ["https://..."] } 반환
```
