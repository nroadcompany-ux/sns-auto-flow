// 수정일: 2026-06-08
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  if (!prisma) return NextResponse.json({ success: true, clients: [] })
  try {
    // Client 모델이 없을 경우를 대비한 안전 처리
    const clients = await (prisma as any).client
      ? await (prisma as any).client.findMany({ where: { isActive: true }, orderBy: { createdAt: "asc" } })
      : []
    return NextResponse.json({ success: true, clients })
  } catch {
    return NextResponse.json({ success: true, clients: [] })
  }
}

export async function POST(req: NextRequest) {
  if (!prisma) return NextResponse.json({ success: false, error: "DB not configured" }, { status: 503 })
  try {
    const body = await req.json()
    const client = await (prisma as any).client.create({ data: body })
    return NextResponse.json({ success: true, client })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  if (!prisma) return NextResponse.json({ success: false, error: "DB not configured" }, { status: 503 })
  try {
    const { id, ...data } = await req.json()
    const client = await (prisma as any).client.update({ where: { id }, data })
    return NextResponse.json({ success: true, client })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  if (!prisma) return NextResponse.json({ success: false, error: "DB not configured" }, { status: 503 })
  try {
    const { id } = await req.json()
    await (prisma as any).client.update({ where: { id }, data: { isActive: false } })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
