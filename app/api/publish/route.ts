import { NextRequest, NextResponse } from "next/server"
import { publish } from "@/lib/publish"

export async function POST(req: NextRequest) {
  try {
    const { channels, payload } = await req.json()
    const results = await Promise.allSettled(
      channels.map((ch: string) => publish({ ...payload, channel: ch }))
    )
    const summary = results.map((r, i) => ({
      channel: channels[i],
      success: r.status === "fulfilled" && (r.value as any).success,
      fallback: r.status === "fulfilled" ? (r.value as any).fallback : true,
      error: r.status === "rejected" ? (r as any).reason?.message : undefined,
    }))
    return NextResponse.json({ success: true, summary })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
