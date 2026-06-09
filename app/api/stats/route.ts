// 수정일: 2026-06-08
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  if (!prisma) return NextResponse.json({ success: true, stats: [], summary: {} })
  try {
    const { searchParams } = new URL(req.url)
    const clientId = searchParams.get("clientId")

    // Content 모델 기반 통계 집계
    const [total, published, draft, scheduled, failed] = await Promise.all([
      prisma.content.count(),
      prisma.content.count({ where: { status: "published" } }),
      prisma.content.count({ where: { status: "draft" } }),
      prisma.content.count({ where: { status: "scheduled" } }),
      prisma.content.count({ where: { status: "failed" } }),
    ])

    return NextResponse.json({
      success: true,
      summary: { total, published, draft, scheduled, failed },
      stats: [],
    })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message, stats: [], summary: {} })
  }
}
