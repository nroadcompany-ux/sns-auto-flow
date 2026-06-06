import Anthropic from "@anthropic-ai/sdk"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function parse(text: string) {
  return JSON.parse(text.replace(/```json|```/g, "").trim())
}

export async function generateContent({
  topic, keywords, tone, index, total, angle,
}: {
  topic: string; keywords?: string; tone: string
  index: number; total: number; angle?: string
}) {
  const res = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    system: `소상공인 마케팅 전문 콘텐츠 작가. 반드시 JSON만 응답.
형식: {"blog":{"title":"","summary":"","body":"","seoKeywords":[]},"news":{"headline":"","subheadline":"","body":"","tags":[]},"instagram":{"caption":"","hashtags":[]},"threads":{"post":""},"kakao":{"title":"","body":""}}`,
    messages: [{
      role: "user",
      content: `주제: ${topic}\n키워드: ${keywords || "없음"}\n톤: ${tone}\n편번호: ${index}/${total}\n각도: ${angle || "일반"}\n\n블로그 800-1200자 SEO최적화, 뉴스 역피라미드 기사체, 인스타 감성적 이모지포함 2200자이내, 스레드 핵심만 500자이내, 카카오 친근하고 짧게. 반드시 JSON만.`
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
    model: "claude-sonnet-4-20250514",
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
    model: "claude-sonnet-4-20250514",
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
    model: "claude-sonnet-4-20250514",
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
