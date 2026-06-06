import { NextRequest, NextResponse } from "next/server"
import { generateContent, diversifyTopics, extractFromSource } from "@/lib/ai/generate"

export async function POST(req: NextRequest) {
  try {
    const { topic, keywords, tone, count, sourceType, sourceContent, startDate, frequency } = await req.json()
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
      results.push({ ...plan, content })
    }
    return NextResponse.json({ success: true, results })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
