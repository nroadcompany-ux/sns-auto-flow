// 수정일: 2026-06-08
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  if (!prisma) return NextResponse.json({ success: true, items: [] })
  try {
    const { searchParams } = new URL(req.url)
    const clientId = searchParams.get("clientId")
    const status = searchParams.get("status")
    // Content 모델에서 큐 아이템 조회
    const items = await prisma.content.findMany({
      where: {
        ...(status && status !== "all" ? { status } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    })
    return NextResponse.json({ success: true, items })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message, items: [] })
  }
}

export async function POST(req: NextRequest) {
  if (!prisma) return NextResponse.json({ success: false, error: "DB not configured" }, { status: 503 })
  try {
    const body = await req.json()
    if (Array.isArray(body)) {
      let count = 0
      for (const item of body) {
        await prisma.content.create({
          data: {
            topic: item.topic || "주제 없음",
            angle: item.angle || "일반",
            channels: JSON.stringify(item.channels || []),
            contentJson: JSON.stringify(item.content || {}),
            status: item.status || "draft",
          },
        })
        count++
      }
      return NextResponse.json({ success: true, count })
    }
    const item = await prisma.content.create({
      data: {
        topic: body.topic || "주제 없음",
        angle: body.angle || "일반",
        channels: JSON.stringify(body.channels || []),
        contentJson: JSON.stringify(body.content || {}),
        status: body.status || "draft",
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
      },
    })
    return NextResponse.json({ success: true, item })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  if (!prisma) return NextResponse.json({ success: false, error: "DB not configured" }, { status: 503 })
  try {
    const { id, ...data } = await req.json()
    const item = await prisma.content.update({ where: { id }, data })
    return NextResponse.json({ success: true, item })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  if (!prisma) return NextResponse.json({ success: false, error: "DB not configured" }, { status: 503 })
  try {
    const { ids } = await req.json()
    if (Array.isArray(ids)) {
      await prisma.content.deleteMany({ where: { id: { in: ids } } })
    } else {
      await prisma.content.delete({ where: { id: ids } })
    }
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
