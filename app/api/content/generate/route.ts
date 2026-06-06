import { NextRequest, NextResponse } from "next/server"
import { generateContent, diversifyTopics, extractFromSource } from "@/lib/ai/generate"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  try {
    const { topic, keywords, tone, count, sourceType, sourceContent, startDate, frequency, channels } = await req.json()
    let plans: any[] = []

    if (sourceType === "DIVERSIFIED") {
      plans = await diversifyTopics({ topic, count, startDate, frequency })
    } else if (sourceType === "URL" || sourceType === "FILE") {
      const ex = await extractFromSource(sourceContent)
      plans = [{ index: 1, angle: "일반", topic: ex.mainTopic, keywords: ex.keyPoints }]
    } else {
      plans = [{ index: 1, angle: "일반", topic, keywords: [] }]
    }

    const results = []
    for (const plan of plans.slice(0, count)) {
      const content = await generateContent({
        topic: plan.topic || topic,
        keywords: Array.isArray(plan.keywords) ? plan.keywords.join(", ") : keywords,
        tone: tone || "friendly",
        index: plan.index,
        total: count,
        angle: plan.angle,
      })

      // DB 저장 (실패해도 생성 결과는 반환)
      let dbId: string | undefined
      try {
        const saved = await prisma.content.create({
          data: {
            topic: plan.topic || topic,
            angle: plan.angle || "일반",
            sourceType: sourceType || "MANUAL",
            tone: tone || "friendly",
            channels: JSON.stringify(channels || []),
            contentJson: JSON.stringify(content),
            status: "draft",
          },
        })
        dbId = saved.id
      } catch (dbErr) {
        console.error("[generate] DB save failed:", dbErr)
      }

      results.push({ ...plan, content, dbId })
    }

    return NextResponse.json({ success: true, results })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
