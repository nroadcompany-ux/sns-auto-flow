import { NextResponse } from "next/server";
import { publishToSns } from "@/lib/publish";
import { prisma } from "@/lib/prisma";
import type { ContentStatus, PublishRequest, PublishResponse } from "@/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: PublishRequest;
  try {
    body = (await req.json()) as PublishRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.title || !body.body) {
    return NextResponse.json(
      { error: "title and body are required" },
      { status: 400 }
    );
  }

  const scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
  const isFuture = scheduledAt instanceof Date && scheduledAt.getTime() > Date.now();

  try {
    let status: ContentStatus;
    let externalUrl: string | null = null;
    let demo = false;

    if (isFuture) {
      // Just schedule it; a background worker / cron would publish later.
      status = "scheduled";
    } else {
      const result = await publishToSns(body);
      demo = result.demo;
      externalUrl = result.externalUrl;
      status = result.ok ? "published" : "failed";
    }

    // Upsert the content row (update existing draft if contentId provided).
    let id = body.contentId ?? "";
    try {
      if (body.contentId) {
        const updated = await prisma.content.update({
          where: { id: body.contentId },
          data: {
            status,
            externalUrl,
            scheduledAt: isFuture ? scheduledAt : null,
            publishedAt: status === "published" ? new Date() : null,
            imageUrl: body.imageUrl ?? undefined,
          },
        });
        id = updated.id;
      } else {
        const created = await prisma.content.create({
          data: {
            topic: body.topic ?? body.title,
            title: body.title,
            body: body.body,
            hashtags: (body.hashtags ?? []).join(" "),
            platform: body.platform,
            status,
            externalUrl,
            scheduledAt: isFuture ? scheduledAt : null,
            publishedAt: status === "published" ? new Date() : null,
            imageUrl: body.imageUrl ?? null,
          },
        });
        id = created.id;
      }
    } catch (dbErr) {
      console.error("[publish] DB write failed:", dbErr);
      if (!id) id = "unsaved";
    }

    const payload: PublishResponse = { ok: status !== "failed", id, status, externalUrl, demo };
    return NextResponse.json(payload);
  } catch (err) {
    console.error("[publish] error:", err);
    const message = err instanceof Error ? err.message : "publish failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// List recent content (used by the History & Schedule pages).
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status"); // optional filter

  try {
    const items = await prisma.content.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json({ items });
  } catch (err) {
    console.error("[publish:GET] DB read failed:", err);
    return NextResponse.json({ items: [] });
  }
}
