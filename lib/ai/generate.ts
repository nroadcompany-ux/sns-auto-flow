import Anthropic from "@anthropic-ai/sdk";
import type { GenerateRequest, GeneratedContent, Platform } from "@/types";
import { PLATFORMS, TONES } from "@/types";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

/** True when a usable Anthropic API key is configured. */
export function hasAnthropicKey(): boolean {
  const k = process.env.ANTHROPIC_API_KEY;
  return !!k && k.trim().length > 10;
}

/**
 * Generate SNS content for the requested platform/tone.
 * Falls back to a local template ("demo" mode) when no API key is present,
 * so the whole flow stays clickable before the user pastes a real key.
 */
export async function generateContent(
  req: GenerateRequest
): Promise<{ content: GeneratedContent; demo: boolean }> {
  if (!hasAnthropicKey()) {
    return { content: demoContent(req), demo: true };
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 1500,
    system:
      "You are a Korean social media copywriter. Always answer with a single " +
      "valid JSON object and nothing else.",
    messages: [{ role: "user", content: buildPrompt(req) }],
  });

  const text = message.content
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("\n")
    .trim();

  return { content: parseContent(text, req), demo: false };
}

function buildPrompt(req: GenerateRequest): string {
  const platform = PLATFORMS.find((p) => p.value === req.platform);
  const tone = TONES.find((t) => t.value === (req.tone ?? "friendly"));
  const keywords = (req.keywords ?? []).filter(Boolean).join(", ");
  const lengthHint =
    req.length === "short"
      ? "2-3 sentences"
      : req.length === "long"
        ? "6-9 sentences"
        : "4-5 sentences";

  return [
    `Write a ${req.platform} post in Korean about: "${req.topic}".`,
    `Tone: ${tone?.label ?? "친근한"}.`,
    `Body length: about ${lengthHint}, max ${platform?.max ?? 2200} characters.`,
    keywords ? `Naturally include these keywords: ${keywords}.` : "",
    "Return ONLY this JSON shape:",
    `{"title": "<short catchy title>", "body": "<the post body>", "hashtags": ["#tag1", "#tag2"]}`,
    "Provide 5-10 relevant Korean hashtags. Do not wrap the JSON in markdown.",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Best-effort parse of the model output into GeneratedContent. */
function parseContent(text: string, req: GenerateRequest): GeneratedContent {
  const jsonStart = text.indexOf("{");
  const jsonEnd = text.lastIndexOf("}");
  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    try {
      const raw = JSON.parse(text.slice(jsonStart, jsonEnd + 1)) as Partial<GeneratedContent>;
      const hashtags = normalizeHashtags(raw.hashtags);
      if (raw.body) {
        return {
          title: raw.title?.trim() || req.topic,
          body: String(raw.body).trim(),
          hashtags,
        };
      }
    } catch {
      // fall through to plain-text handling
    }
  }
  // Could not parse JSON — treat the whole text as the body.
  return {
    title: req.topic,
    body: text || demoContent(req).body,
    hashtags: extractHashtags(text),
  };
}

function normalizeHashtags(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((t) => String(t).trim())
    .filter(Boolean)
    .map((t) => (t.startsWith("#") ? t : `#${t}`));
}

function extractHashtags(text: string): string[] {
  const matches = text.match(/#[\p{L}\p{N}_]+/gu);
  return matches ? Array.from(new Set(matches)) : [];
}

// ---- Demo (no-API-key) fallback -------------------------------------------
function demoContent(req: GenerateRequest): GeneratedContent {
  const tone = TONES.find((t) => t.value === (req.tone ?? "friendly"))?.label ?? "친근한";
  const lead = leadByPlatform(req.platform, req.topic);
  const body = [
    lead,
    "",
    `오늘은 '${req.topic}' 이야기를 ${tone} 톤으로 풀어봤어요. ✨`,
    "여러분의 일상에 작은 영감이 되길 바라요. 댓글로 생각 남겨주세요!",
    "",
    "— SNS FLOW AUTO 데모 모드로 생성된 예시 글입니다.",
  ].join("\n");

  const base = ["#" + req.topic.replace(/\s+/g, ""), "#일상", "#추천", "#오늘의기록", "#소통"];
  const extra = (req.keywords ?? []).filter(Boolean).map((k) => "#" + k.replace(/\s+/g, ""));

  return {
    title: `${req.topic} — 이렇게 시작해보세요`,
    body,
    hashtags: Array.from(new Set([...base, ...extra])),
  };
}

function leadByPlatform(platform: Platform, topic: string): string {
  switch (platform) {
    case "x":
      return `${topic}, 한 줄로 정리하면 이렇습니다 👇`;
    case "threads":
      return `${topic}에 대해 솔직하게 이야기해볼게요.`;
    case "blog":
      return `# ${topic}\n\n안녕하세요, 오늘 다룰 주제는 '${topic}'입니다.`;
    case "instagram":
    default:
      return `📸 ${topic}`;
  }
}
