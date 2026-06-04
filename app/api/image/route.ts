import { NextResponse } from "next/server";
import { generateImage } from "@/lib/image/generate";
import { prisma } from "@/lib/prisma";
import type { ImageRequest } from "@/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: ImageRequest;
  try {
    body = (await req.json()) as ImageRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.prompt || !body.prompt.trim()) {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  }

  const width = clamp(body.width ?? 1080, 256, 2048);
  const height = clamp(body.height ?? 1080, 256, 2048);

  try {
    const image = await generateImage(body.prompt.trim(), width, height);

    try {
      await prisma.asset.create({
        data: { prompt: body.prompt.trim(), url: image.url, width, height },
      });
    } catch (dbErr) {
      console.error("[image] DB save failed:", dbErr);
    }

    return NextResponse.json(image);
  } catch (err) {
    console.error("[image] error:", err);
    const message = err instanceof Error ? err.message : "image generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// List recent assets (used by the Storage page).
export async function GET() {
  try {
    const items = await prisma.asset.findMany({
      orderBy: { createdAt: "desc" },
      take: 60,
    });
    return NextResponse.json({ items });
  } catch (err) {
    console.error("[image:GET] DB read failed:", err);
    return NextResponse.json({ items: [] });
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(n)));
}
