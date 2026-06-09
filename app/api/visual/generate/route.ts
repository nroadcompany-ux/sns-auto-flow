import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"

const claude = new Anthropic()

export async function POST(req: NextRequest) {
  try {
    const { prompt, style, size, brandName } = await req.json()
    if (!prompt?.trim()) return NextResponse.json({ success: false, error: "프롬프트를 입력해주세요" }, { status: 400 })

    const FAL_KEY = process.env.FAL_KEY
    if (!FAL_KEY) {
      return NextResponse.json({
        success: false,
        error: "FAL_KEY 환경변수가 설정되지 않았습니다. .env에 FAL_KEY=발급받은키 를 추가해주세요.",
        setupRequired: true,
      }, { status: 503 })
    }

    // 한국어 → 영어 프롬프트 변환
    const translateRes = await claude.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      messages: [{
        role: "user",
        content: `Translate this Korean image generation prompt to English for Flux AI. Make it vivid and descriptive. Return ONLY the English prompt, nothing else.\n\nKorean: ${prompt}\nBrand: ${brandName || ""}\nStyle: ${style}`,
      }],
    })
    const englishPrompt = (translateRes.content[0] as any).text.trim()

    // 사이즈 매핑
    const sizeMap: Record<string, string> = {
      square: "square_hd",
      portrait: "portrait_4_3",
      story: "portrait_16_9",
      landscape: "landscape_16_9",
    }
    const imageSize = sizeMap[size] || "square_hd"

    // fal.ai Flux API 호출
    const falRes = await fetch("https://fal.run/fal-ai/flux/schnell", {
      method: "POST",
      headers: {
        "Authorization": `Key ${FAL_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: englishPrompt,
        image_size: imageSize,
        num_images: 2,
        enable_safety_checker: true,
      }),
    })

    if (!falRes.ok) {
      const err = await falRes.text()
      return NextResponse.json({ success: false, error: `Flux API 오류: ${err.slice(0, 100)}` }, { status: 502 })
    }

    const falData = await falRes.json()
    const images: string[] = (falData.images || []).map((img: any) => img.url || img)

    return NextResponse.json({ success: true, images, prompt: englishPrompt })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "알 수 없는 오류"
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
