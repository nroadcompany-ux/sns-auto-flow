import { NextRequest, NextResponse } from "next/server"
import { diagnosError } from "@/lib/ai/generate"

export async function POST(req: NextRequest) {
  const adminKey = req.headers.get("x-admin-key")
  if (adminKey !== process.env.SFA_ADMIN_KEY)
    return NextResponse.json({ error: "권한 없음" }, { status: 403 })
  try {
    const { error, stack, code, context } = await req.json()
    const analysis = await diagnosError({ error, stack, code, context })
    return NextResponse.json({ success: true, analysis })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
