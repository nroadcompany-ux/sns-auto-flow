import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

const REQUIRED_ENV = [
  "REMOTION_LAMBDA_FUNCTION",
  "REMOTION_S3_BUCKET",
  "REMOTION_SERVE_URL",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "AWS_REGION",
]

export async function POST(req: NextRequest) {
  try {
    const {
      topic, imageUrl, brandName = "페이플레이", brandColor = "#3182F6",
      ctaText = "페이플레이와 함께하세요",
      outroText = "스마트한 결제 솔루션",
      outroContact = "payplay.co.kr",
      contentId,
    } = await req.json()

    if (!topic) return NextResponse.json({ success: false, error: "topic required" }, { status: 400 })

    // 환경변수 미설정 → 명확한 안내 반환
    const missing = REQUIRED_ENV.filter(k => !process.env[k])
    if (missing.length > 0) {
      return NextResponse.json({
        success: false,
        setupRequired: true,
        missing,
        message: "Remotion Lambda 환경변수가 설정되지 않았습니다. .env에 추가 후 재배포하세요.",
        guide: "npx remotion lambda functions deploy && npx remotion lambda sites create --site-name=payplay-shortform",
      }, { status: 503 })
    }

    // Lambda는 동적 import (서버 전용)
    const { renderMediaOnLambda } = await import("@remotion/lambda/client")

    const { renderId, bucketName } = await renderMediaOnLambda({
      region:       process.env.AWS_REGION as any || "ap-northeast-2",
      functionName: process.env.REMOTION_LAMBDA_FUNCTION!,
      serveUrl:     process.env.REMOTION_SERVE_URL!,
      composition:  "PayplayShortform",
      inputProps:   { topic, imageUrl: imageUrl || "", brandName, brandColor, ctaText, outroText, outroContact },
      codec:        "h264",
      imageFormat:  "jpeg",
      maxRetries:   1,
      privacy:      "public",
    })

    // DB 업데이트 (contentId가 있으면)
    if (contentId && prisma) {
      await prisma.content.update({
        where:  { id: contentId },
        data: { renderJobId: renderId, renderStatus: "rendering", type: "video" },
      })
    }

    return NextResponse.json({ success: true, renderId, bucketName })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
