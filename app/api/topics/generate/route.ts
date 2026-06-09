// 수정일: 2026-06-08
import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"

const client = new Anthropic()

export async function POST(req: NextRequest) {
  try {
    const { keywords, count = 5, clientName = "" } = await req.json()
    if (!keywords) return NextResponse.json({ success: false, error: "keywords required" }, { status: 400 })

    const msg = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `당신은 SNS 콘텐츠 전략가입니다.${clientName ? ` 업체명: ${clientName}.` : ""}
다음 키워드를 바탕으로 SNS·블로그에 적합한 주제 ${count}개를 생성하세요.

키워드: ${keywords}

응답 형식 (JSON 배열만, 설명 없이):
["주제1", "주제2", "주제3"]`,
        },
      ],
    })

    const text = msg.content[0].type === "text" ? msg.content[0].text : ""
    const match = text.match(/\[[\s\S]*\]/)
    const topics: string[] = match ? JSON.parse(match[0]) : []
    return NextResponse.json({ success: true, topics })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
