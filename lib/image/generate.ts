import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import sharp from "sharp";
import type { ImageResponse } from "@/types";

const OUTPUT_DIR = path.join(process.cwd(), "public", "generated");

/**
 * Render a branded card image from a text prompt and save it under
 * /public/generated. Returns a public URL the browser can load directly.
 *
 * This uses `sharp` to rasterize an SVG, so it works fully offline — no
 * external image API needed. Swap `buildSvg` for a real text-to-image call
 * later without changing the route.
 */
export async function generateImage(
  prompt: string,
  width = 1080,
  height = 1080
): Promise<ImageResponse> {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const id = crypto.randomUUID();
  const file = path.join(OUTPUT_DIR, `${id}.png`);
  const svg = buildSvg(prompt, width, height);

  await sharp(Buffer.from(svg)).png().toFile(file);

  return { id, url: `/generated/${id}.png`, width, height };
}

function buildSvg(prompt: string, width: number, height: number): string {
  const lines = wrapText(prompt, 18).slice(0, 6);
  const fontSize = Math.round(width / 16);
  const lineHeight = Math.round(fontSize * 1.25);
  const startY = height / 2 - ((lines.length - 1) * lineHeight) / 2;

  const tspans = lines
    .map(
      (line, i) =>
        `<tspan x="50%" y="${startY + i * lineHeight}">${escapeXml(line)}</tspan>`
    )
    .join("");

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#6366f1"/>
      <stop offset="50%" stop-color="#8b5cf6"/>
      <stop offset="100%" stop-color="#ec4899"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  <rect x="${width * 0.06}" y="${height * 0.06}" width="${width * 0.88}" height="${height * 0.88}"
        rx="${width * 0.04}" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="3"/>
  <text fill="#ffffff" font-family="Arial, 'Apple SD Gothic Neo', sans-serif"
        font-size="${fontSize}" font-weight="700" text-anchor="middle"
        dominant-baseline="middle">${tspans}</text>
  <text x="50%" y="${height - height * 0.08}" fill="rgba(255,255,255,0.85)"
        font-family="Arial, sans-serif" font-size="${Math.round(fontSize * 0.45)}"
        text-anchor="middle">SNS FLOW AUTO</text>
</svg>`.trim();
}

function wrapText(text: string, maxPerLine: number): string[] {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).trim().length > maxPerLine && current) {
      lines.push(current.trim());
      current = word;
    } else {
      current = (current + " " + word).trim();
    }
  }
  if (current) lines.push(current.trim());
  return lines.length ? lines : [text];
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
