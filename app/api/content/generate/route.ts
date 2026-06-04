import { NextResponse } from "next/server";
import { generateContent } from "@/lib/ai/generate";
import { prisma } from "@/lib/prisma";
import type { GenerateRequest, GenerateResponse, Platform } from "@/types";

export const runtime = "nodejs";

const VALID_PLATFORMS: Platform[] = ["instagram", "threads", "blog", "x"];

export async function POST(req: Request) {
  let body: GenerateRequest;
  try {
    body = (await req.json()) as GenerateRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.topic || !body.topic.trim()) {
    return NextResponse.json({ error: "topic is required" }, { status: 400 });
  }
  if (!VALID_PLATFORMS.includes(body.platform)) {
    body.platform = "instagram";
  }

  try {
    const { content, demo } = await generateContent(body);

    let id: string | undefined;
    try {
      const saved = await prisma.content.create({
        data: {
          topic: body.topic.trim(),
          title: content.title,
          body: content.body,
          hashtags: content.hashtags.join(" "),
          platform: body.platform,
          tone: body.tone ?? "friendly",
          status: "draft",
        },
      });
      id = saved.id;
    } catch (dbErr) {
      // Persisting a draft is best-effort; never block generation on the DB.
      console.error("[content/generate] DB save failed:", dbErr);
    }

    const payload: GenerateResponse = { id, demo, ...content };
    return NextResponse.json(payload);
  } catch (err) {
    console.error("[content/generate] error:", err);
    const message = err instanceof Error ? err.message : "generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
