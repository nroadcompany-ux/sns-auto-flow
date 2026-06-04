import axios from "axios";
import type { PublishRequest } from "@/types";

interface PublishResult {
  ok: boolean;
  externalUrl: string | null;
  demo: boolean;
  error?: string;
}

/**
 * Publish a post to the target SNS platform via the PayPlay publish API.
 *
 * When the PayPlay credentials are still the dev placeholders, this returns a
 * simulated success ("demo" mode) so the end-to-end flow works locally without
 * hitting a real network. Replace PAYPLAY_API_BASE / PAYPLAY_API_SECRET in
 * .env.local with real values to switch to live publishing.
 */
export async function publishToSns(req: PublishRequest): Promise<PublishResult> {
  const base = process.env.PAYPLAY_API_BASE ?? "";
  const secret = process.env.PAYPLAY_API_SECRET ?? "";

  const isPlaceholder =
    !base ||
    !secret ||
    base.includes("example.com") ||
    secret.includes("REPLACE_ME");

  if (isPlaceholder) {
    const slug = encodeURIComponent(req.title.slice(0, 40).replace(/\s+/g, "-"));
    return {
      ok: true,
      demo: true,
      externalUrl: `https://demo.local/${req.platform}/${slug}`,
    };
  }

  try {
    const res = await axios.post(
      `${base.replace(/\/$/, "")}/publish`,
      {
        platform: req.platform,
        title: req.title,
        body: req.body,
        hashtags: req.hashtags ?? [],
        imageUrl: req.imageUrl ?? null,
      },
      {
        headers: { Authorization: `Bearer ${secret}` },
        timeout: 15000,
      }
    );
    const data = res.data as { url?: string; permalink?: string };
    return {
      ok: true,
      demo: false,
      externalUrl: data.url ?? data.permalink ?? null,
    };
  } catch (err) {
    const message =
      axios.isAxiosError(err) && err.response
        ? `${err.response.status} ${JSON.stringify(err.response.data)}`
        : err instanceof Error
          ? err.message
          : "unknown error";
    return { ok: false, demo: false, externalUrl: null, error: message };
  }
}
