import { IBrand } from "@/types"

export type TImageSize = "square" | "landscape" | "portrait"

const SIZES = {
  square:    { w: 1080, h: 1080 },
  landscape: { w: 1200, h: 630 },
  portrait:  { w: 1080, h: 1350 },
}

export function generateSVGImage({
  headline, subtext, brand, size = "square",
}: {
  headline: string; subtext?: string; brand: IBrand; size?: TImageSize
}) {
  const { w, h } = SIZES[size]
  const maxChars = Math.floor(w / 38)
  const words = headline.split(" ")
  const lines: string[] = []
  let line = ""
  for (const word of words) {
    if ((line + word).length > maxChars) { lines.push(line.trim()); line = word + " " }
    else line += word + " "
  }
  if (line.trim()) lines.push(line.trim())

  const startY = h * 0.36
  const lineH = 86

  const titleSVG = lines.map((l, i) =>
    `<text x="64" y="${startY + i * lineH}" font-family="Pretendard,sans-serif" font-size="72" font-weight="800" fill="#111111">${l}</text>`
  ).join("\n  ")

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${w}" height="${h}" fill="#ffffff"/>
  <rect x="0" y="0" width="${w}" height="16" fill="${brand.color}"/>
  <rect x="0" y="${h - 16}" width="${w}" height="16" fill="${brand.color}"/>
  <circle cx="${w + 80}" cy="${h + 80}" r="${w * 0.58}" fill="${brand.color}" opacity="0.05"/>
  <circle cx="-80" cy="-80" r="${w * 0.32}" fill="${brand.color}" opacity="0.04"/>
  ${titleSVG}
  ${subtext ? `<text x="64" y="${startY + lines.length * lineH + 44}" font-family="Pretendard,sans-serif" font-size="36" fill="#666666">${subtext}</text>` : ""}
  <text x="64" y="${h - 56}" font-family="Pretendard,sans-serif" font-size="28" font-weight="700" fill="${brand.color}">${brand.name}</text>
</svg>`
}

export async function generateCanvaImage({
  templateId, headline, subtext, apiKey,
}: {
  templateId: string; headline: string; subtext?: string; apiKey: string
}) {
  const res = await fetch("https://api.canva.com/rest/v1/autofills", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      brand_template_id: templateId,
      data: {
        headline: { type: "text", text: headline },
        subtext:  { type: "text", text: subtext || "" },
      },
    }),
  })
  return res.json()
}

export function generateImage({
  engine, headline, subtext, brand, size,
}: {
  engine: "custom" | "canva"; headline: string; subtext?: string; brand: IBrand; size?: TImageSize
}) {
  if (engine === "canva" && brand.canvaApiKey && brand.templateId) {
    return generateCanvaImage({ templateId: brand.templateId, headline, subtext, apiKey: brand.canvaApiKey })
  }
  return generateSVGImage({ headline, subtext, brand, size })
}
