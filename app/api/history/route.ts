import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// 최근 콘텐츠 목록 조회
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status") // 선택적 필터
    const limit = parseInt(searchParams.get("limit") || "50")

    const items = await prisma.content.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        posts: {
          select: { channel: true, status: true, publishedAt: true },
        },
      },
    })

    // contentJson 파싱해서 반환
    const parsed = items.map(item => ({
      id: item.id,
      topic: item.topic,
      angle: item.angle,
      tone: item.tone,
      sourceType: item.sourceType,
      channels: (() => { try { return JSON.parse(item.channels) } catch { return [] } })(),
      content: (() => { try { return JSON.parse(item.contentJson) } catch { return null } })(),
      status: item.status,
      scheduledAt: item.scheduledAt,
      publishedAt: item.publishedAt,
      createdAt: item.createdAt,
      posts: item.posts,
    }))

    return NextResponse.json({ success: true, items: parsed, total: parsed.length })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message, items: [] }, { status: 500 })
  }
}

// 단일 콘텐츠 상태 업데이트 (예약 등)
export async function PATCH(req: NextRequest) {
  try {
    const { id, status, scheduledAt } = await req.json()
    const updated = await prisma.content.update({
      where: { id },
      data: {
        status,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      },
    })
    return NextResponse.json({ success: true, item: updated })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// 삭제
export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json()
    await prisma.content.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
