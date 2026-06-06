import type { Metadata } from "next"
import "./globals.css"
export const metadata: Metadata = {
  title: "SNS FLOW AUTO",
  description: "콘텐츠 자동화 플랫폼 — 블로그부터 SNS까지",
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
