import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const renderId  = searchParams.get("renderId")
  const bucketName = searchParams.get("bucketName")
  const contentId  = searchParams.get("contentId")

  if (!renderId) return NextResponse.json({ success: false, error: "renderId required" }, { status: 400 })

  // Lambda 미설정 → 에러 반환
  const missing = ["REMOTION_LAMBDA_FUNCTION","AWS_REGION","AWS_ACCESS_KEY_ID","AWS_SECRET_ACCESS_KEY"].filter(k => !process.env[k])
  if (missing.length > 0) {
    return NextResponse.json({ success: false, setupRequired: true, missing }, { status: 503 })
  }

  try {
    const { getRenderProgress } = await import("@remotion/lambda/client")

    const progress = await getRenderProgress({
      renderId,
      bucketName:   bucketName || process.env.REMOTION_S3_BUCKET!,
      functionName: process.env.REMOTION_LAMBDA_FUNCTION!,
      region:       process.env.AWS_REGION as any || "ap-northeast-2",
    })

    const isDone   = progress.done
    const isFailed = !!progress.fatalErrorEncountered
    const percent  = Math.round((progress.overallProgress || 0) * 100)
    const videoUrl = isDone ? progress.outputFile : null

    // DB 업데이트
    if (contentId && prisma) {
      await prisma.content.update({
        where: { id: contentId },
        data: {
          renderStatus: isDone ? "done" : isFailed ? "failed" : "rendering",
          ...(videoUrl ? { mediaUrl: videoUrl } : {}),
        },
      })
    }

    return NextResponse.json({
      success: true,
      status:  isDone ? "done" : isFailed ? "failed" : "rendering",
      percent,
      videoUrl,
      errors:  progress.errors?.map((e: any) => e.message) || [],
    })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
