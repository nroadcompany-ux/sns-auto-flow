import { NextRequest, NextResponse } from "next/server"
import { generateSVGImage } from "@/lib/image/generate"

export async function POST(req: NextRequest) {
  try {
    const { headline, subtext, brand, size } = await req.json()
    const svg = generateSVGImage({ headline, subtext, brand, size })
    return new NextResponse(svg, { headers: { "Content-Type": "image/svg+xml" } })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
