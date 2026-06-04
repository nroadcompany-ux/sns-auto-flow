// ============================================================
//  SNS FLOW AUTO — shared types & domain constants
// ============================================================

export type Platform = "instagram" | "threads" | "blog" | "x";
export type Tone =
  | "friendly"
  | "professional"
  | "witty"
  | "informative"
  | "emotional";
export type Length = "short" | "medium" | "long";
export type ContentStatus = "draft" | "scheduled" | "published" | "failed";

export const PLATFORMS: { value: Platform; label: string; emoji: string; max: number }[] = [
  { value: "instagram", label: "Instagram", emoji: "📸", max: 2200 },
  { value: "threads", label: "Threads", emoji: "🧵", max: 500 },
  { value: "blog", label: "Blog", emoji: "📝", max: 5000 },
  { value: "x", label: "X (Twitter)", emoji: "𝕏", max: 280 },
];

export const TONES: { value: Tone; label: string }[] = [
  { value: "friendly", label: "친근한" },
  { value: "professional", label: "전문적인" },
  { value: "witty", label: "위트있는" },
  { value: "informative", label: "정보전달" },
  { value: "emotional", label: "감성적인" },
];

export const LENGTHS: { value: Length; label: string }[] = [
  { value: "short", label: "짧게" },
  { value: "medium", label: "보통" },
  { value: "long", label: "길게" },
];

// ---- Content generation ----------------------------------------------------
export interface GenerateRequest {
  topic: string;
  platform: Platform;
  tone?: Tone;
  keywords?: string[];
  length?: Length;
}

export interface GeneratedContent {
  title: string;
  body: string;
  hashtags: string[];
}

export interface GenerateResponse extends GeneratedContent {
  id?: string;
  demo: boolean;
}

// ---- Image generation ------------------------------------------------------
export interface ImageRequest {
  prompt: string;
  width?: number;
  height?: number;
}

export interface ImageResponse {
  id?: string;
  url: string;
  width: number;
  height: number;
}

// ---- Publishing ------------------------------------------------------------
export interface PublishRequest {
  contentId?: string;
  topic?: string;
  platform: Platform;
  title: string;
  body: string;
  hashtags?: string[];
  imageUrl?: string | null;
  scheduledAt?: string | null; // ISO date string; future = schedule
}

export interface PublishResponse {
  ok: boolean;
  id: string;
  status: ContentStatus;
  externalUrl?: string | null;
  demo: boolean;
}

// ---- Diagnostics -----------------------------------------------------------
export interface DiagnosticCheck {
  name: string;
  ok: boolean;
  detail: string;
}

export interface DiagnosticResult {
  ok: boolean;
  checkedAt: string;
  checks: DiagnosticCheck[];
}
