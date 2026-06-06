import { NextRequest, NextResponse } from "next/server"
import { publish } from "@/lib/publish"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  try {
    const { channels, payload, dbId } = await req.json()
    const results = await Promise.allSettled(
      channels.map((ch: string) => publish({ ...payload, channel: ch }))
    )
    const summary = results.map((r, i) => ({
      channel: channels[i],
      success: r.status === "fulfilled" && (r.value as any).success,
      fallback: r.status === "fulfilled" ? (r.value as any).fallback : true,
      error: r.status === "rejected" ? (r as any).reason?.message : undefined,
    }))

    // DB 상태 업데이트
    if (dbId) {
      try {
        const allPublished = summary.every(s => s.success)
        const anyPublished = summary.some(s => s.success)
        const newStatus = allPublished ? "published" : anyPublished ? "published" : "failed"

        await prisma.content.update({
          where: { id: dbId },
          data: {
            status: newStatus,
            publishedAt: anyPublished ? new Date() : null,
          },
        })

        // 채널별 Post 저장
        for (const s of summary) {
          await prisma.post.create({
            data: {
              contentId: dbId,
              channel: s.channel,
              title: payload.title || "",
              body: payload.body || "",
              hashtags: (payload.hashtags || []).join(","),
              status: s.success ? "published" : s.fallback ? "fallback" : "failed",
              errorMsg: s.error || null,
              publishedAt: s.success ? new Date() : null,
            },
          }).catch(() => {}) // Post 저장 실패는 무시
        }
      } catch (dbErr) {
        console.error("[publish] DB update failed:", dbErr)
      }
    }

    return NextResponse.json({ success: true, summary })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
