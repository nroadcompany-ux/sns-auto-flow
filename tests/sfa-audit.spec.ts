import { test, expect, Page } from "@playwright/test"

const BASE = "http://localhost:5245"

// 헬퍼: 탭 이동
async function goTo(page: Page, label: string) {
  await page.click(`button[title="${label}"]`)
  await page.waitForTimeout(300)
}

test.describe("SNS FLOW AUTO — 전수 기능 검사", () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(BASE)
    await page.waitForLoadState("networkidle")
  })

  // ── 1. 홈 탭 ──────────────────────────────
  test("홈 탭 렌더링", async ({ page }) => {
    await expect(page.locator("text=SNS FLOW AUTO").first()).toBeVisible()
    await expect(page.locator("text=시작하는 방법")).toBeVisible()
    await expect(page.locator("text=지금 바로 콘텐츠 만들기")).toBeVisible()
    console.log("✅ 홈 탭: 정상 렌더링")
  })

  // ── 2. D1 사이드바 ────────────────────────
  test("D1 사이드바 hover-expand 구조", async ({ page }) => {
    const sidebar = page.locator(".d1-sidebar")
    await expect(sidebar).toBeVisible()
    const labels = page.locator(".d1-label")
    const count = await labels.count()
    expect(count).toBeGreaterThanOrEqual(6)
    console.log(`✅ D1 사이드바: 레이블 ${count}개 확인`)
  })

  // ── 3. 생성 탭 ────────────────────────────
  test("생성 탭 — 아코디언 3개 존재", async ({ page }) => {
    await goTo(page, "콘텐츠 생성")
    const accordions = page.locator(".accordion-card")
    await expect(accordions).toHaveCount(3)
    console.log("✅ 생성 탭: 아코디언 3개 확인")
  })

  test("생성 탭 — 소스 & 주제 아코디언 기본 열림", async ({ page }) => {
    await goTo(page, "콘텐츠 생성")
    const body = page.locator(".accordion-body").first()
    await expect(body).toBeVisible()
    console.log("✅ 소스 & 주제: 기본 열림 확인")
  })

  test("생성 탭 — 아코디언 토글 작동", async ({ page }) => {
    await goTo(page, "콘텐츠 생성")
    // Card 1 닫기
    await page.locator(".accordion-header").nth(0).click()
    await page.waitForTimeout(200)
    const body = page.locator(".accordion-body")
    const count = await body.count()
    expect(count).toBe(0)
    // Card 1 다시 열기
    await page.locator(".accordion-header").nth(0).click()
    await page.waitForTimeout(200)
    await expect(page.locator(".accordion-body").first()).toBeVisible()
    console.log("✅ 아코디언 토글: 정상 작동")
  })

  // ── 4. D2 채널 사이드바 ───────────────────
  test("D2 채널 사이드바 — 자동 오픈 및 전체 채널 표시", async ({ page }) => {
    await goTo(page, "콘텐츠 생성")
    const d2 = page.locator(".d2-sidebar")
    await expect(d2).toBeVisible()
    // 채널 10개 모두 표시
    const channelButtons = page.locator(".d2-ch-item")
    const count = await channelButtons.count()
    expect(count).toBe(10)
    console.log(`✅ D2 채널 사이드바: ${count}개 채널 표시`)
  })

  test("D2 채널 — 연동/미연동 배지 표시", async ({ page }) => {
    await goTo(page, "콘텐츠 생성")
    const connectedBadges = page.locator(".d2-conn-badge.connected")
    const count = await connectedBadges.count()
    expect(count).toBe(2) // PAYPLAY_BLOG, PAYPLAY_PRESS
    console.log(`✅ D2 연동 채널: ${count}개 (PAYPLAY_BLOG, PAYPLAY_PRESS)`)
  })

  test("D2 채널 — ON/OFF 토글 작동", async ({ page }) => {
    await goTo(page, "콘텐츠 생성")
    const firstChannel = page.locator(".d2-ch-item").first()
    // 인스타그램은 기본 ON
    await expect(firstChannel).toHaveClass(/on/)
    // 토글 OFF
    await firstChannel.click()
    await page.waitForTimeout(150)
    await expect(firstChannel).not.toHaveClass(/on/)
    // 토글 ON 복구
    await firstChannel.click()
    await page.waitForTimeout(150)
    await expect(firstChannel).toHaveClass(/on/)
    console.log("✅ D2 토글: ON/OFF 정상 작동")
  })

  test("D2 채널 — 전체선택/전체해제", async ({ page }) => {
    await goTo(page, "콘텐츠 생성")
    // 전체 선택
    await page.click("button:has-text('전체')")
    await page.waitForTimeout(200)
    const allOn = page.locator(".d2-ch-item.on")
    expect(await allOn.count()).toBe(10)
    // 전체 해제
    await page.click("button:has-text('해제')")
    await page.waitForTimeout(200)
    expect(await allOn.count()).toBe(0)
    console.log("✅ 전체선택/해제: 정상 작동")
  })

  test("D2 블로그 채널 — URL 선택 드롭다운", async ({ page }) => {
    await goTo(page, "콘텐츠 생성")
    // PAYPLAY_BLOG는 기본 ON + connected → 블로그 expand 자동 표시
    const expand = page.locator(".d2-blog-expand").first()
    await expect(expand).toBeVisible()
    await expect(page.locator(".d2-blog-select").first()).toBeVisible()
    console.log("✅ 블로그 URL 선택: 드롭다운 표시")
  })

  test("D2 닫기/열기", async ({ page }) => {
    await goTo(page, "콘텐츠 생성")
    await page.click(".d2-close-btn")
    await page.waitForTimeout(200)
    await expect(page.locator(".d2-sidebar")).not.toBeVisible()
    // 채널 열기 버튼으로 다시 오픈
    await page.click("text=채널 선택")
    await page.waitForTimeout(200)
    await expect(page.locator(".d2-sidebar")).toBeVisible()
    console.log("✅ D2 닫기/열기: 정상 작동")
  })

  // ── 5. 우측 요약 패널 ──────────────────────
  test("우측 패널 — 자동화 요약 표시", async ({ page }) => {
    await goTo(page, "콘텐츠 생성")
    await expect(page.locator("text=자동화 요약")).toBeVisible()
    await expect(page.locator("text=총 생성")).toBeVisible()
    await expect(page.locator("text=✦ 자동화 시작")).toBeVisible()
    console.log("✅ 우측 패널: 요약 및 시작 버튼 확인")
  })

  test("우측 패널 — 접기/펴기", async ({ page }) => {
    await goTo(page, "콘텐츠 생성")
    await page.click(".right-panel-toggle")
    await page.waitForTimeout(300)
    const panel = page.locator(".right-panel-wrap")
    await expect(panel).toHaveClass(/collapsed/)
    await page.click(".right-panel-toggle")
    await page.waitForTimeout(300)
    await expect(panel).toHaveClass(/expanded/)
    console.log("✅ 우측 패널 접기/펴기: 정상")
  })

  // ── 6. 키워드 3단 ─────────────────────────
  test("키워드 3단 입력 — 브랜드/메인/서브", async ({ page }) => {
    await goTo(page, "콘텐츠 생성")
    const inputs = page.locator(".kw-input")
    expect(await inputs.count()).toBe(3)
    // 브랜드 키워드 추가
    await inputs.nth(0).fill("테스트브랜드")
    await inputs.nth(0).press("Enter")
    await page.waitForTimeout(150)
    await expect(page.locator(".kw-chip-brand")).toBeVisible()
    console.log("✅ 키워드 3단: 입력 및 칩 생성 확인")
  })

  // ── 7. API 엔드포인트 응답 ────────────────
  test("API — /api/image 응답 (SVG)", async ({ page }) => {
    const res = await page.request.post(`${BASE}/api/image`, {
      data: { title: "테스트", brand: "SFA", color: "#3182F6" },
    })
    expect(res.status()).toBe(200)
    const contentType = res.headers()["content-type"]
    expect(contentType).toContain("svg")
    console.log("✅ /api/image: 200 SVG 반환")
  })

  test("API — /api/diagnostic 인증 게이트", async ({ page }) => {
    // 잘못된 키
    const bad = await page.request.post(`${BASE}/api/diagnostic`, {
      data: { error: "test error", context: "SFA" },
      headers: { "x-admin-key": "wrong-key" },
    })
    expect(bad.status()).toBe(403)
    console.log("✅ /api/diagnostic: 403 인증 게이트 정상")
  })

  test("API — /api/history 응답", async ({ page }) => {
    const res = await page.request.get(`${BASE}/api/history?limit=10`)
    expect([200, 500]).toContain(res.status()) // DB 미연결 시 500도 허용
    console.log(`✅ /api/history: ${res.status()} 응답`)
  })

  test("API — /api/content/generate API 키 없을 때 에러 처리", async ({ page }) => {
    const res = await page.request.post(`${BASE}/api/content/generate`, {
      data: { topic: "테스트", tone: "friendly", count: 1, channels: ["INSTAGRAM"], sourceType: "MANUAL" },
    })
    // API 키 없으면 500이지만 앱 크래시 없이 처리
    const body = await res.json()
    expect(body).toHaveProperty("success")
    console.log(`✅ /api/content/generate: success 필드 포함 응답 (${res.status()})`)
  })

  // ── 8. 발행 일정 탭 ───────────────────────
  test("발행 일정 탭 — 빈 상태 메시지", async ({ page }) => {
    await goTo(page, "발행 일정")
    await expect(page.locator("text=생성된 일정이 없어요")).toBeVisible()
    await expect(page.locator("text=콘텐츠 생성하기")).toBeVisible()
    console.log("✅ 발행 일정: 빈 상태 안내 메시지 표시")
  })

  // ── 9. 보관함 탭 ──────────────────────────
  test("보관함 탭 — 빈 상태 메시지", async ({ page }) => {
    await goTo(page, "보관함")
    await expect(page.locator("text=저장된 소재가 없어요")).toBeVisible()
    console.log("✅ 보관함: 빈 상태 안내 메시지 표시")
  })

  // ── 10. 채널 분석 탭 ──────────────────────
  test("채널 분석 탭 — 연동 현황 표시", async ({ page }) => {
    await goTo(page, "채널 분석")
    await expect(page.locator("text=현재 연동 상태")).toBeVisible()
    const connected = page.locator("text=연동").nth(0)
    await expect(connected).toBeVisible()
    console.log("✅ 채널 분석: 연동 현황 표시")
  })

  // ── 11. 설정 탭 ───────────────────────────
  test("설정 탭 — 브랜드 프로필 표시", async ({ page }) => {
    await goTo(page, "설정")
    await expect(page.locator("text=브랜드 설정")).toBeVisible()
    const editBtns = page.locator("button:has-text('편집')")
    const count = await editBtns.count()
    expect(count).toBeGreaterThan(0)
    console.log(`✅ 설정 탭: 브랜드 ${count}개 표시`)
  })

  // ── 12. 진단 탭 ───────────────────────────
  test("진단 탭 — 관리자 키 폼 표시", async ({ page }) => {
    await goTo(page, "진단")
    await expect(page.locator("text=관리자 진단")).toBeVisible()
    await expect(page.locator("input[type='password']")).toBeVisible()
    console.log("✅ 진단 탭: 관리자 키 입력폼 표시")
  })

  // ── 13. 모바일 반응형 ─────────────────────
  test("모바일 뷰 (375px) — 기본 렌더링", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto(BASE)
    await page.waitForLoadState("networkidle")
    await expect(page.locator(".sfa-shell")).toBeVisible()
    // 모바일에선 D2, 우측 패널 숨김
    await expect(page.locator(".d2-sidebar")).not.toBeVisible()
    console.log("✅ 모바일 375px: 기본 레이아웃 정상")
  })

})
