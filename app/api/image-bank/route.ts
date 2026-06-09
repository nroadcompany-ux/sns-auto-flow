import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  if (!prisma) return NextResponse.json({ success: true, images: [] })
  try {
    const { searchParams } = new URL(req.url)
    const gender    = searchParams.get("gender")
    const situation = searchParams.get("situation")
    const source    = searchParams.get("source")

    const images = await (prisma as any).imageBank.findMany({
      where: {
        ...(gender    ? { gender }    : {}),
        ...(situation ? { situation } : {}),
        ...(source    ? { source }    : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    })
    return NextResponse.json({ success: true, images })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message, images: [] }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  if (!prisma) return NextResponse.json({ success: false, error: "DB not configured" }, { status: 503 })
  try {
    const { url, label, gender, situation, source, prompt } = await req.json()
    if (!url) return NextResponse.json({ success: false, error: "url required" }, { status: 400 })

    const image = await (prisma as any).imageBank.create({
      data: {
        url,
        label:     label     || "이미지",
        gender:    gender    || "female",
        situation: situation || null,
        source:    source    || "flux",
        prompt:    prompt    || null,
      },
    })
    return NextResponse.json({ success: true, image })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  if (!prisma) return NextResponse.json({ success: false, error: "DB not configured" }, { status: 503 })
  try {
    const { id } = await req.json()
    await (prisma as any).imageBank.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
