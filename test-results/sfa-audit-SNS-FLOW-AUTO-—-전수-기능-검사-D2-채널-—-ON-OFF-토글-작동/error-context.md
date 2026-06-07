# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: sfa-audit.spec.ts >> SNS FLOW AUTO — 전수 기능 검사 >> D2 채널 — ON/OFF 토글 작동
- Location: tests\sfa-audit.spec.ts:86:7

# Error details

```
Error: expect(locator).not.toHaveClass(expected) failed

Locator: locator('.d2-ch-item').first()
Expected pattern: not /on/
Received string: "d2-ch-item  disconnected"
Timeout: 5000ms

Call log:
  - Expect "not toHaveClass" with timeout 5000ms
  - waiting for locator('.d2-ch-item').first()
    14 × locator resolved to <button class="d2-ch-item  disconnected">…</button>
       - unexpected value "d2-ch-item  disconnected"

```

```yaml
- button "인스타그램 미연동"
```

# Test source

```ts
  1   | import { test, expect, Page } from "@playwright/test"
  2   | 
  3   | const BASE = "http://localhost:5245"
  4   | 
  5   | // 헬퍼: 탭 이동
  6   | async function goTo(page: Page, label: string) {
  7   |   await page.click(`button[title="${label}"]`)
  8   |   await page.waitForTimeout(300)
  9   | }
  10  | 
  11  | test.describe("SNS FLOW AUTO — 전수 기능 검사", () => {
  12  | 
  13  |   test.beforeEach(async ({ page }) => {
  14  |     await page.goto(BASE)
  15  |     await page.waitForLoadState("networkidle")
  16  |   })
  17  | 
  18  |   // ── 1. 홈 탭 ──────────────────────────────
  19  |   test("홈 탭 렌더링", async ({ page }) => {
  20  |     await expect(page.locator("text=SNS FLOW AUTO").first()).toBeVisible()
  21  |     await expect(page.locator("text=시작하는 방법")).toBeVisible()
  22  |     await expect(page.locator("text=지금 바로 콘텐츠 만들기")).toBeVisible()
  23  |     console.log("✅ 홈 탭: 정상 렌더링")
  24  |   })
  25  | 
  26  |   // ── 2. D1 사이드바 ────────────────────────
  27  |   test("D1 사이드바 hover-expand 구조", async ({ page }) => {
  28  |     const sidebar = page.locator(".d1-sidebar")
  29  |     await expect(sidebar).toBeVisible()
  30  |     const labels = page.locator(".d1-label")
  31  |     const count = await labels.count()
  32  |     expect(count).toBeGreaterThanOrEqual(6)
  33  |     console.log(`✅ D1 사이드바: 레이블 ${count}개 확인`)
  34  |   })
  35  | 
  36  |   // ── 3. 생성 탭 ────────────────────────────
  37  |   test("생성 탭 — 아코디언 3개 존재", async ({ page }) => {
  38  |     await goTo(page, "콘텐츠 생성")
  39  |     const accordions = page.locator(".accordion-card")
  40  |     await expect(accordions).toHaveCount(3)
  41  |     console.log("✅ 생성 탭: 아코디언 3개 확인")
  42  |   })
  43  | 
  44  |   test("생성 탭 — 소스 & 주제 아코디언 기본 열림", async ({ page }) => {
  45  |     await goTo(page, "콘텐츠 생성")
  46  |     const body = page.locator(".accordion-body").first()
  47  |     await expect(body).toBeVisible()
  48  |     console.log("✅ 소스 & 주제: 기본 열림 확인")
  49  |   })
  50  | 
  51  |   test("생성 탭 — 아코디언 토글 작동", async ({ page }) => {
  52  |     await goTo(page, "콘텐츠 생성")
  53  |     // Card 1 닫기
  54  |     await page.locator(".accordion-header").nth(0).click()
  55  |     await page.waitForTimeout(200)
  56  |     const body = page.locator(".accordion-body")
  57  |     const count = await body.count()
  58  |     expect(count).toBe(0)
  59  |     // Card 1 다시 열기
  60  |     await page.locator(".accordion-header").nth(0).click()
  61  |     await page.waitForTimeout(200)
  62  |     await expect(page.locator(".accordion-body").first()).toBeVisible()
  63  |     console.log("✅ 아코디언 토글: 정상 작동")
  64  |   })
  65  | 
  66  |   // ── 4. D2 채널 사이드바 ───────────────────
  67  |   test("D2 채널 사이드바 — 자동 오픈 및 전체 채널 표시", async ({ page }) => {
  68  |     await goTo(page, "콘텐츠 생성")
  69  |     const d2 = page.locator(".d2-sidebar")
  70  |     await expect(d2).toBeVisible()
  71  |     // 채널 10개 모두 표시
  72  |     const channelButtons = page.locator(".d2-ch-item")
  73  |     const count = await channelButtons.count()
  74  |     expect(count).toBe(10)
  75  |     console.log(`✅ D2 채널 사이드바: ${count}개 채널 표시`)
  76  |   })
  77  | 
  78  |   test("D2 채널 — 연동/미연동 배지 표시", async ({ page }) => {
  79  |     await goTo(page, "콘텐츠 생성")
  80  |     const connectedBadges = page.locator(".d2-conn-badge.connected")
  81  |     const count = await connectedBadges.count()
  82  |     expect(count).toBe(2) // PAYPLAY_BLOG, PAYPLAY_PRESS
  83  |     console.log(`✅ D2 연동 채널: ${count}개 (PAYPLAY_BLOG, PAYPLAY_PRESS)`)
  84  |   })
  85  | 
  86  |   test("D2 채널 — ON/OFF 토글 작동", async ({ page }) => {
  87  |     await goTo(page, "콘텐츠 생성")
  88  |     const firstChannel = page.locator(".d2-ch-item").first()
  89  |     // 인스타그램은 기본 ON
  90  |     await expect(firstChannel).toHaveClass(/on/)
  91  |     // 토글 OFF
  92  |     await firstChannel.click()
  93  |     await page.waitForTimeout(150)
> 94  |     await expect(firstChannel).not.toHaveClass(/on/)
      |                                    ^ Error: expect(locator).not.toHaveClass(expected) failed
  95  |     // 토글 ON 복구
  96  |     await firstChannel.click()
  97  |     await page.waitForTimeout(150)
  98  |     await expect(firstChannel).toHaveClass(/on/)
  99  |     console.log("✅ D2 토글: ON/OFF 정상 작동")
  100 |   })
  101 | 
  102 |   test("D2 채널 — 전체선택/전체해제", async ({ page }) => {
  103 |     await goTo(page, "콘텐츠 생성")
  104 |     // 전체 선택
  105 |     await page.click("button:has-text('전체')")
  106 |     await page.waitForTimeout(200)
  107 |     const allOn = page.locator(".d2-ch-item.on")
  108 |     expect(await allOn.count()).toBe(10)
  109 |     // 전체 해제
  110 |     await page.click("button:has-text('해제')")
  111 |     await page.waitForTimeout(200)
  112 |     expect(await allOn.count()).toBe(0)
  113 |     console.log("✅ 전체선택/해제: 정상 작동")
  114 |   })
  115 | 
  116 |   test("D2 블로그 채널 — URL 선택 드롭다운", async ({ page }) => {
  117 |     await goTo(page, "콘텐츠 생성")
  118 |     // PAYPLAY_BLOG는 기본 ON + connected → 블로그 expand 자동 표시
  119 |     const expand = page.locator(".d2-blog-expand").first()
  120 |     await expect(expand).toBeVisible()
  121 |     await expect(page.locator(".d2-blog-select").first()).toBeVisible()
  122 |     console.log("✅ 블로그 URL 선택: 드롭다운 표시")
  123 |   })
  124 | 
  125 |   test("D2 닫기/열기", async ({ page }) => {
  126 |     await goTo(page, "콘텐츠 생성")
  127 |     await page.click(".d2-close-btn")
  128 |     await page.waitForTimeout(200)
  129 |     await expect(page.locator(".d2-sidebar")).not.toBeVisible()
  130 |     // 채널 열기 버튼으로 다시 오픈
  131 |     await page.click("text=채널 선택")
  132 |     await page.waitForTimeout(200)
  133 |     await expect(page.locator(".d2-sidebar")).toBeVisible()
  134 |     console.log("✅ D2 닫기/열기: 정상 작동")
  135 |   })
  136 | 
  137 |   // ── 5. 우측 요약 패널 ──────────────────────
  138 |   test("우측 패널 — 자동화 요약 표시", async ({ page }) => {
  139 |     await goTo(page, "콘텐츠 생성")
  140 |     await expect(page.locator("text=자동화 요약")).toBeVisible()
  141 |     await expect(page.locator("text=총 생성")).toBeVisible()
  142 |     await expect(page.locator("text=✦ 자동화 시작")).toBeVisible()
  143 |     console.log("✅ 우측 패널: 요약 및 시작 버튼 확인")
  144 |   })
  145 | 
  146 |   test("우측 패널 — 접기/펴기", async ({ page }) => {
  147 |     await goTo(page, "콘텐츠 생성")
  148 |     await page.click(".right-panel-toggle")
  149 |     await page.waitForTimeout(300)
  150 |     const panel = page.locator(".right-panel-wrap")
  151 |     await expect(panel).toHaveClass(/collapsed/)
  152 |     await page.click(".right-panel-toggle")
  153 |     await page.waitForTimeout(300)
  154 |     await expect(panel).toHaveClass(/expanded/)
  155 |     console.log("✅ 우측 패널 접기/펴기: 정상")
  156 |   })
  157 | 
  158 |   // ── 6. 키워드 3단 ─────────────────────────
  159 |   test("키워드 3단 입력 — 브랜드/메인/서브", async ({ page }) => {
  160 |     await goTo(page, "콘텐츠 생성")
  161 |     const inputs = page.locator(".kw-input")
  162 |     expect(await inputs.count()).toBe(3)
  163 |     // 브랜드 키워드 추가
  164 |     await inputs.nth(0).fill("테스트브랜드")
  165 |     await inputs.nth(0).press("Enter")
  166 |     await page.waitForTimeout(150)
  167 |     await expect(page.locator(".kw-chip-brand")).toBeVisible()
  168 |     console.log("✅ 키워드 3단: 입력 및 칩 생성 확인")
  169 |   })
  170 | 
  171 |   // ── 7. API 엔드포인트 응답 ────────────────
  172 |   test("API — /api/image 응답 (SVG)", async ({ page }) => {
  173 |     const res = await page.request.post(`${BASE}/api/image`, {
  174 |       data: { title: "테스트", brand: "SFA", color: "#3182F6" },
  175 |     })
  176 |     expect(res.status()).toBe(200)
  177 |     const contentType = res.headers()["content-type"]
  178 |     expect(contentType).toContain("svg")
  179 |     console.log("✅ /api/image: 200 SVG 반환")
  180 |   })
  181 | 
  182 |   test("API — /api/diagnostic 인증 게이트", async ({ page }) => {
  183 |     // 잘못된 키
  184 |     const bad = await page.request.post(`${BASE}/api/diagnostic`, {
  185 |       data: { error: "test error", context: "SFA" },
  186 |       headers: { "x-admin-key": "wrong-key" },
  187 |     })
  188 |     expect(bad.status()).toBe(403)
  189 |     console.log("✅ /api/diagnostic: 403 인증 게이트 정상")
  190 |   })
  191 | 
  192 |   test("API — /api/history 응답", async ({ page }) => {
  193 |     const res = await page.request.get(`${BASE}/api/history?limit=10`)
  194 |     expect([200, 500]).toContain(res.status()) // DB 미연결 시 500도 허용
```