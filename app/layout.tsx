import type { Metadata } from "next"
import "./globals.css"
export const metadata: Metadata = {
  title: "마케팅플레이 오토",
  description: "SNS Maker Auto + Visual Maker Auto — AI 마케팅 자동화 플랫폼",
}
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  )
}
