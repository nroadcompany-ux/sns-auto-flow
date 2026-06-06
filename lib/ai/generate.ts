import Anthropic from "@anthropic-ai/sdk"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function parse(text: string): any {
  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()

  // 1차: 그냥 파싱
  try { return JSON.parse(cleaned) } catch {}

  // 2차: 가장 바깥 { } 추출
  const start = cleaned.indexOf("{")
  if (start === -1) throw new Error("AI 응답에서 JSON을 찾을 수 없습니다")
  let depth = 0, end = -1
  for (let i = start; i < cleaned.length; i++) {
    if (cleaned[i] === "{") depth++
    else if (cleaned[i] === "}") { depth--; if (depth === 0) { end = i; break } }
  }
  if (end === -1) throw new Error("JSON이 불완전하게 잘렸습니다 (max_tokens 초과 가능)")
  const jsonStr = cleaned.slice(start, end + 1)

  try { return JSON.parse(jsonStr) } catch {}

  // 3차: 문자열 안의 리터럴 줄바꿈·탭 이스케이프
  let inString = false, escape = false
  let fixed = ""
  for (let i = 0; i < jsonStr.length; i++) {
    const c = jsonStr[i]
    if (escape) { fixed += c; escape = false; continue }
    if (c === "\\") { escape = true; fixed += c; continue }
    if (c === '"') inString = !inString
    if (inString && c === "\n") { fixed += "\\n"; continue }
    if (inString && c === "\r") { fixed += "\\r"; continue }
    if (inString && c === "\t") { fixed += "\\t"; continue }
    fixed += c
  }
  return JSON.parse(fixed)
}

export async function generateContent({
  topic, keywords, tone, index, total, angle,
}: {
  topic: string; keywords?: string; tone: string
  index: number; total: number; angle?: string
}) {
  const res = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 4096,
    system: `소상공인 마케팅 전문 콘텐츠 작가.
규칙: JSON 객체만 출력. 마크다운 금지. JSON 문자열 값 안에서 줄바꿈은 반드시 \\n으로 표기.
형식: {"blog":{"title":"","summary":"","body":"","seoKeywords":[]},"news":{"headline":"","subheadline":"","body":"","tags":[]},"instagram":{"caption":"","hashtags":[]},"threads":{"post":""},"kakao":{"title":"","body":""}}`,
    messages: [{
      role: "user",
      content: `주제: ${topic}\n키워드: ${keywords || "없음"}\n톤: ${tone}\n편번호: ${index}/${total}\n각도: ${angle || "일반"}\n\n블로그 300자, 뉴스 200자, 인스타 200자+이모지+해시태그5개, 스레드 150자, 카카오 100자. JSON만 출력.`
    }]
  })
  const text = res.content[0].type === "text" ? res.content[0].text : ""
  return parse(text)
}

export async function diversifyTopics({
  topic, count, startDate, frequency,
}: {
  topic: string; count: number; startDate: string; frequency: string
}) {
  const res = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1000,
    system: `주제 다각화 전문가. JSON 배열만 응답. 형식: [{"index":1,"angle":"문제제기","topic":"","keywords":[]}]`,
    messages: [{
      role: "user",
      content: `메인주제: ${topic}\n총편수: ${count}\n주기: ${frequency}\n시작일: ${startDate}\n\n각 편마다 다른 각도(문제제기→솔루션→사례→팁→FAQ→CTA). JSON 배열만.`
    }]
  })
  const text = res.content[0].type === "text" ? res.content[0].text : ""
  return parse(text)
}

export async function extractFromSource(source: string) {
  const res = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 500,
    system: `핵심 추출 전문가. JSON만 응답. 형식: {"mainTopic":"","keyPoints":[],"suggestedAngles":[]}`,
    messages: [{ role: "user", content: `다음 내용에서 핵심 추출:\n\n${source}\n\nJSON만.` }]
  })
  const text = res.content[0].type === "text" ? res.content[0].text : ""
  return parse(text)
}

export async function diagnosError({
  error, stack, code, context,
}: {
  error: string; stack?: string; code?: string; context?: string
}) {
  const res = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 2000,
    system: `Next.js/TypeScript 시니어 개발자. 오류 분석 + 해결 코드 제공. JSON만: {"cause":"","solution":"","fixedCode":"","severity":"low|medium|high"}`,
    messages: [{
      role: "user",
      content: `시스템: ${context || "SNS FLOW AUTO"}\n오류: ${error}\n스택: ${stack || "없음"}\n코드: ${code || "없음"}\n\n원인분석+수정코드. JSON만.`
    }]
  })
  const text = res.content[0].type === "text" ? res.content[0].text : ""
  return parse(text)
}
