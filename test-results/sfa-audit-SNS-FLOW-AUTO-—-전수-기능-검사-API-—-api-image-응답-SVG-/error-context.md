# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: sfa-audit.spec.ts >> SNS FLOW AUTO — 전수 기능 검사 >> API — /api/image 응답 (SVG)
- Location: tests\sfa-audit.spec.ts:172:7

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 200
Received: 500
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - complementary [ref=e3]:
      - button "SF SNS FLOW AUTO" [ref=e4] [cursor=pointer]:
        - generic [ref=e5]: SF
        - generic:
          - generic: SNS FLOW
          - generic: AUTO
      - navigation [ref=e6]:
        - button "홈" [ref=e7] [cursor=pointer]:
          - img [ref=e9]
          - generic: 홈
        - button "콘텐츠 생성" [ref=e12] [cursor=pointer]:
          - img [ref=e14]
          - generic: 콘텐츠 생성
        - button "발행 일정" [ref=e16] [cursor=pointer]:
          - img [ref=e18]
          - generic: 발행 일정
        - button "보관함" [ref=e20] [cursor=pointer]:
          - img [ref=e22]
          - generic: 보관함
        - button "채널 분석" [ref=e24] [cursor=pointer]:
          - img [ref=e26]
          - generic: 채널 분석
        - button "설정" [ref=e27] [cursor=pointer]:
          - img [ref=e29]
          - generic: 설정
        - button "진단" [ref=e32] [cursor=pointer]:
          - img [ref=e34]
          - generic: 진단
    - main [ref=e36]:
      - generic [ref=e38]:
        - generic [ref=e39]:
          - generic [ref=e40]:
            - generic [ref=e41]: SF
            - generic [ref=e42]:
              - generic [ref=e43]: SNS FLOW AUTO
              - generic [ref=e44]: AI 기반 SNS 콘텐츠 자동화 플랫폼
          - generic [ref=e45]:
            - text: 주제 하나만 입력하면
            - strong [ref=e46]: 블로그 · 뉴스 · 인스타그램 · 스레드 · 카카오
            - text: 5개 채널용 콘텐츠를 Claude AI가 동시에 작성해요.
        - generic [ref=e47]:
          - generic [ref=e48]:
            - generic [ref=e49]: "3"
            - generic [ref=e50]: 총 생성
          - generic [ref=e51]:
            - generic [ref=e52]: "0"
            - generic [ref=e53]: 게시 완료
          - generic [ref=e54]:
            - generic [ref=e55]: "3"
            - generic [ref=e56]: 임시저장
        - generic [ref=e57]:
          - generic [ref=e58]: 시작하는 방법
          - generic [ref=e59]:
            - button "1 주제 입력 생성 탭 → 주제·키워드·톤 설정 후 자동화 시작 클릭" [ref=e60] [cursor=pointer]:
              - generic [ref=e61]:
                - generic [ref=e62]: "1"
                - generic [ref=e63]: 주제 입력
              - generic [ref=e64]: 생성 탭 → 주제·키워드·톤 설정 후 자동화 시작 클릭
            - button "2 내용 확인 · 복사 발행 일정 탭에서 채널별 탭을 클릭하고 복사" [ref=e65] [cursor=pointer]:
              - generic [ref=e66]:
                - generic [ref=e67]: "2"
                - generic [ref=e68]: 내용 확인 · 복사
              - generic [ref=e69]: 발행 일정 탭에서 채널별 탭을 클릭하고 복사
            - button "3 SNS에 붙여넣기 복사한 내용을 각 SNS에 직접 게시 (연동 시 자동 발행)" [ref=e70] [cursor=pointer]:
              - generic [ref=e71]:
                - generic [ref=e72]: "3"
                - generic [ref=e73]: SNS에 붙여넣기
              - generic [ref=e74]: 복사한 내용을 각 SNS에 직접 게시 (연동 시 자동 발행)
        - generic [ref=e75]:
          - generic [ref=e76]: 현재 알려진 제한사항
          - generic [ref=e77]:
            - generic [ref=e78]:
              - text: ·
              - strong [ref=e79]: "생성 비용:"
              - text: Claude API 사용량만큼 과금됩니다 (1회 ≈ $0.01~0.03)
            - generic [ref=e80]:
              - text: ·
              - strong [ref=e81]: "자동 발행:"
              - text: 페이플레이 블로그/언론보도 외 채널은 복사 후 직접 게시하세요
            - generic [ref=e82]:
              - text: ·
              - strong [ref=e83]: "채널 연동:"
              - text: Meta(인스타·스레드), 카카오는 API 심사 후 연동 가능합니다
        - generic [ref=e84]:
          - button "지금 바로 콘텐츠 만들기" [ref=e85] [cursor=pointer]
          - button "채널 분석" [ref=e86] [cursor=pointer]
  - button "Open Next.js Dev Tools" [ref=e92] [cursor=pointer]:
    - img [ref=e93]
  - alert [ref=e96]
```

# Test source

```ts
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
  94  |     await expect(firstChannel).not.toHaveClass(/on/)
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
> 176 |     expect(res.status()).toBe(200)
      |                          ^ Error: expect(received).toBe(expected) // Object.is equality
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
  211 |     await expect(page.locator("text=생성된 일정이 없어요")).toBeVisible()
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