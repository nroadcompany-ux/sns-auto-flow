import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"

const CHANNEL_GUIDE: Record<string, string> = {
  INSTAGRAM:     "인스타그램 피드 게시물. 이모지 포함, 공감되는 문장, 해시태그 5~10개. 500자 이내.",
  THREADS:       "스레드 텍스트 게시물. 이모지 1~2개, 핵심만 간결하게. 300자 이내.",
  BLOG_NAVER:    "네이버 블로그 글. SEO 키워드 자연스럽게 포함. 제목+본문+소결로 구성. 800~1200자.",
  NEWS_HOMEPAGE: "뉴스 기사 형식. 역피라미드 구조(중요 → 세부). 헤드라인+소제목+본문+태그.",
  KAKAO_CHANNEL: "카카오 채널 메시지. 친근하고 짧게. 핵심 혜택 강조. 200자 이내.",
  PAYPLAY_BLOG:  "페이플레이 블로그. 브랜드 톤, SEO 최적화, 소상공인 대상. 800자 내외.",
  PAYPLAY_PRESS: "언론보도 형식. 공식적인 어투, 수치/사실 강조, 브랜드 신뢰감.",
  BAND:          "밴드 게시물. 커뮤니티 감성, 친근한 말투. 이미지 설명 포함.",
  FACEBOOK:      "페이스북 게시물. 링크 공유에 적합한 설명형. 200~400자.",
  DAANGN:        "당근 비즈니스 게시물. 동네 상권 감성, 간단 명료하게.",
}

export async function POST(req: NextRequest) {
  try {
    const { topic, channel, tone, keywords, angle } = await req.json()
    if (!topic || !channel) return NextResponse.json({ success: false, error: "topic, channel 필수" }, { status: 400 })

    const client = new Anthropic()
    const toneGuide = { friendly: "친근하고 편안한 말투", professional: "전문적이고 신뢰감 있는 공식체", emotional: "감성적이고 공감 가는 스토리텔링" }[tone as string] || "친근한 말투"
    const channelGuide = CHANNEL_GUIDE[channel] || "SNS 게시글을 작성해주세요."

    const prompt = `주제: ${topic}${angle ? `\n각도: ${angle}` : ""}${keywords ? `\n키워드: ${keywords}` : ""}
톤: ${toneGuide}
채널: ${channelGuide}

위 조건에 맞는 ${channel} 게시물을 새로 작성해주세요. 이전 내용과 다른 새로운 각도로 작성하세요.

반드시 JSON 형식으로만 응답: { "text": "생성된 내용 전체" }`

    const msg = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    })

    const raw = msg.content[0].type === "text" ? msg.content[0].text : ""
    const match = raw.match(/\{[\s\S]*?\}/)
    const parsed = match ? JSON.parse(match[0]) : { text: raw }

    return NextResponse.json({ success: true, text: parsed.text || raw })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
