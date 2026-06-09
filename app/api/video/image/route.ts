import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { prisma } from "@/lib/prisma"

const claude = new Anthropic()

// 상황별 Flux 프롬프트
const PROMPTS: Record<string, Record<string, string>> = {
  female: {
    POS:        "Korean woman in her 30s, professional smile, standing next to a sleek POS terminal in a bright modern restaurant, clean white background, photorealistic, natural skin tone, East Asian features, warm lighting, --ar 9:16",
    kiosk:      "Korean woman in her 30s, natural smile, using a touchscreen kiosk ordering system in a modern cafe, photorealistic, clean interior background, East Asian features, professional look, --ar 9:16",
    tableorder: "Korean woman in her 30s, happy expression, pointing at a tablet table ordering system, modern Korean restaurant setting, photorealistic, East Asian features, warm tone, --ar 9:16",
    custom:     "Korean woman in her 30s, cafe owner, wearing apron, warm confident smile, white background, photorealistic, natural skin, professional portrait, East Asian features, --ar 9:16",
  },
  male: {
    POS:        "Korean man in his 30s, confident smile, standing next to a sleek POS terminal in a bright modern restaurant, clean white background, photorealistic, natural skin tone, East Asian features, warm lighting, --ar 9:16",
    kiosk:      "Korean man in his 30s, natural gesture, using a touchscreen kiosk ordering system in a modern cafe, photorealistic, clean interior, East Asian features, smart casual, --ar 9:16",
    tableorder: "Korean man in his 30s, confident smile, pointing at a tablet table ordering system, modern Korean restaurant setting, photorealistic, East Asian features, --ar 9:16",
    custom:     "Korean man in his 30s, restaurant owner, smart casual jacket, confident smile, white background, photorealistic, natural skin, professional portrait, East Asian features, --ar 9:16",
  },
}

export async function POST(req: NextRequest) {
  try {
    const { topic, gender = "female", situation = "custom", count = 4, saveToBank = true } = await req.json()

    const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN
    if (!REPLICATE_TOKEN) {
      return NextResponse.json({
        success: false,
        error: "REPLICATE_API_TOKEN이 설정되지 않았습니다.",
        setupRequired: true,
      }, { status: 503 })
    }

    // 주제를 반영한 영어 프롬프트 생성
    let basePrompt = PROMPTS[gender]?.[situation] || PROMPTS.female.custom
    if (topic) {
      const res = await claude.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 100,
        messages: [{
          role: "user",
          content: `Add context to this image prompt to reflect the topic "${topic}". Keep it under 30 words. Return ONLY the modified prompt:\n\n${basePrompt}`,
        }],
      })
      basePrompt = (res.content[0] as any).text.trim()
    }

    // Replicate Flux 호출
    const replicateRes = await fetch("https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${REPLICATE_TOKEN}`,
        "Content-Type": "application/json",
        "Prefer": "wait",
      },
      body: JSON.stringify({
        input: {
          prompt: basePrompt,
          aspect_ratio: "9:16",
          output_format: "jpg",
          output_quality: 85,
          num_outputs: Math.min(count, 4),
          go_fast: true,
        },
      }),
    })

    if (!replicateRes.ok) {
      const err = await replicateRes.text()
      return NextResponse.json({ success: false, error: `Replicate 오류: ${err.slice(0, 120)}` }, { status: 502 })
    }

    const replicateData = await replicateRes.json()
    const urls: string[] = Array.isArray(replicateData.output)
      ? replicateData.output
      : replicateData.output ? [replicateData.output] : []

    // 이미지 뱅크에 자동 저장
    const saved = []
    if (saveToBank && prisma && urls.length > 0) {
      for (const url of urls) {
        try {
          const img = await (prisma as any).imageBank.create({
            data: {
              url,
              label:     `${gender === "female" ? "여성" : "남성"} — ${situation} — ${topic || "자동생성"}`,
              gender,
              situation,
              source:    "flux",
              prompt:    basePrompt,
            },
          })
          saved.push(img)
        } catch {}
      }
    }

    return NextResponse.json({ success: true, images: urls, prompt: basePrompt, saved })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
