import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import Sidebar from "@/components/ui/Sidebar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SNS FLOW AUTO",
  description: "AI로 SNS 콘텐츠를 생성하고, 이미지와 함께 자동 발행하세요.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <div className="md:flex md:min-h-screen">
          {/* Sidebar */}
          <aside
            className="md:w-60 md:shrink-0 border-b md:border-b-0 md:border-r
                       border-[var(--border)] bg-[var(--card)] md:sticky md:top-0 md:h-screen"
          >
            <div className="flex items-center gap-2 px-4 pt-4 md:pt-5">
              <Link href="/" className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg brand-gradient text-white text-sm font-black">
                  S
                </span>
                <span className="font-extrabold tracking-tight">
                  SNS FLOW <span className="brand-text">AUTO</span>
                </span>
              </Link>
            </div>
            <Sidebar />
          </aside>

          {/* Main content */}
          <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
