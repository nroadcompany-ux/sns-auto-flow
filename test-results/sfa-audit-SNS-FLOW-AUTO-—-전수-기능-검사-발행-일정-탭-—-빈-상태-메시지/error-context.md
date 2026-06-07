# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: sfa-audit.spec.ts >> SNS FLOW AUTO — 전수 기능 검사 >> 발행 일정 탭 — 빈 상태 메시지
- Location: tests\sfa-audit.spec.ts:209:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=생성된 일정이 없어요')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('text=생성된 일정이 없어요')

```

```yaml
- complementary:
  - button "SF SNS FLOW AUTO"
  - navigation:
    - button "홈":
      - img
      - text: 홈
    - button "콘텐츠 생성":
      - img
      - text: 콘텐츠 생성
    - button "발행 일정":
      - img
      - text: 발행 일정
    - button "보관함":
      - img
      - text: 보관함
    - button "채널 분석":
      - img
      - text: 채널 분석
    - button "설정":
      - img
      - text: 설정
    - button "진단":
      - img
      - text: 진단
- main:
  - text: 발행 일정 채널별 콘텐츠 검토 · 편집 · 복사 · 자동 발행
  - button "+ 새 콘텐츠"
  - button "새로고침"
  - button "1편 임시저장 테스트 6/7(일) · 일반"
  - button "2편 임시저장 �����÷��� ���� �̺�Ʈ 6/6(토) · 일반"
  - button "3편 임시저장 테스트 6/6(토) · 일반"
  - button "4편 임시저장 �һ���� ���� ������ 6/6(토) · 일반"
  - text: 왼쪽 목록에서 콘텐츠를 선택하세요 선택 후 채널별 탭에서 내용을 확인하고 복사할 수 있어요
- alert
```

# Test source

```ts
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
  195 |     console.log(`✅ /api/history: ${res.status()} 응답`)
  196 |   })
  197 | 
  198 |   test("API — /api/content/generate API 키 없을 때 에러 처리", async ({ page }) => {
  199 |     const res = await page.request.post(`${BASE}/api/content/generate`, {
  200 |       data: { topic: "테스트", tone: "friendly", count: 1, channels: ["INSTAGRAM"], sourceType: "MANUAL" },
  201 |     })
  202 |     // API 키 없으면 500이지만 앱 크래시 없이 처리
  203 |     const body = await res.json()
  204 |     expect(body).toHaveProperty("success")
  205 |     console.log(`✅ /api/content/generate: success 필드 포함 응답 (${res.status()})`)
  206 |   })
  207 | 
  208 |   // ── 8. 발행 일정 탭 ───────────────────────
  209 |   test("발행 일정 탭 — 빈 상태 메시지", async ({ page }) => {
  210 |     await goTo(page, "발행 일정")
> 211 |     await expect(page.locator("text=생성된 일정이 없어요")).toBeVisible()
      |                                                    ^ Error: expect(locator).toBeVisible() failed
  212 |     await expect(page.locator("text=콘텐츠 생성하기")).toBeVisible()
  213 |     console.log("✅ 발행 일정: 빈 상태 안내 메시지 표시")
  214 |   })
  215 | 
  216 |   // ── 9. 보관함 탭 ──────────────────────────
  217 |   test("보관함 탭 — 빈 상태 메시지", async ({ page }) => {
  218 |     await goTo(page, "보관함")
  219 |     await expect(page.locator("text=저장된 소재가 없어요")).toBeVisible()
  220 |     console.log("✅ 보관함: 빈 상태 안내 메시지 표시")
  221 |   })
  222 | 
  223 |   // ── 10. 채널 분석 탭 ──────────────────────
  224 |   test("채널 분석 탭 — 연동 현황 표시", async ({ page }) => {
  225 |     await goTo(page, "채널 분석")
  226 |     await expect(page.locator("text=현재 연동 상태")).toBeVisible()
  227 |     const connected = page.locator("text=연동").nth(0)
  228 |     await expect(connected).toBeVisible()
  229 |     console.log("✅ 채널 분석: 연동 현황 표시")
  230 |   })
  231 | 
  232 |   // ── 11. 설정 탭 ───────────────────────────
  233 |   test("설정 탭 — 브랜드 프로필 표시", async ({ page }) => {
  234 |     await goTo(page, "설정")
  235 |     await expect(page.locator("text=브랜드 설정")).toBeVisible()
  236 |     const editBtns = page.locator("button:has-text('편집')")
  237 |     const count = await editBtns.count()
  238 |     expect(count).toBeGreaterThan(0)
  239 |     console.log(`✅ 설정 탭: 브랜드 ${count}개 표시`)
  240 |   })
  241 | 
  242 |   // ── 12. 진단 탭 ───────────────────────────
  243 |   test("진단 탭 — 관리자 키 폼 표시", async ({ page }) => {
  244 |     await goTo(page, "진단")
  245 |     await expect(page.locator("text=관리자 진단")).toBeVisible()
  246 |     await expect(page.locator("input[type='password']")).toBeVisible()
  247 |     console.log("✅ 진단 탭: 관리자 키 입력폼 표시")
  248 |   })
  249 | 
  250 |   // ── 13. 모바일 반응형 ─────────────────────
  251 |   test("모바일 뷰 (375px) — 기본 렌더링", async ({ page }) => {
  252 |     await page.setViewportSize({ width: 375, height: 812 })
  253 |     await page.goto(BASE)
  254 |     await page.waitForLoadState("networkidle")
  255 |     await expect(page.locator(".sfa-shell")).toBeVisible()
  256 |     // 모바일에선 D2, 우측 패널 숨김
  257 |     await expect(page.locator(".d2-sidebar")).not.toBeVisible()
  258 |     console.log("✅ 모바일 375px: 기본 레이아웃 정상")
  259 |   })
  260 | 
  261 | })
  262 | 
```