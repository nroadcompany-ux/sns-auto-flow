import { NextRequest, NextResponse } from "next/server"
import { generateSVGImage } from "@/lib/image/generate"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    // 프론트에서 { title, brand(string), color } 또는 { headline, brand(IBrand), size } 형태로 올 수 있음
    const headline = body.headline || body.title || "SNS FLOW AUTO"
    const subtext  = body.subtext
    const size     = body.size
    const brand = typeof body.brand === "string"
      ? { name: body.brand, color: body.color || "#3182F6", hashtags: [], tone: "friendly" as const, imageEngine: "custom" as const }
      : body.brand ?? { name: "SNS FLOW AUTO", color: "#3182F6", hashtags: [], tone: "friendly" as const, imageEngine: "custom" as const }

    const svg = generateSVGImage({ headline, subtext, brand, size })
    return new NextResponse(svg, { headers: { "Content-Type": "image/svg+xml" } })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
