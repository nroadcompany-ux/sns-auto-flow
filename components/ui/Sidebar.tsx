"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "대시보드", icon: "🏠" },
  { href: "/create", label: "콘텐츠 생성", icon: "✨" },
  { href: "/schedule", label: "예약", icon: "🗓️" },
  { href: "/history", label: "히스토리", icon: "📜" },
  { href: "/storage", label: "스토리지", icon: "🖼️" },
  { href: "/settings", label: "설정", icon: "⚙️" },
  { href: "/admin", label: "관리자", icon: "🔐" },
];

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav
      className="flex md:flex-col gap-1 md:gap-1.5 overflow-x-auto md:overflow-visible
                 p-2 md:p-3"
    >
      {NAV.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium
            whitespace-nowrap transition-colors
            ${
              isActive(item.href)
                ? "brand-gradient text-white shadow-sm"
                : "text-[var(--muted)] hover:bg-black/5 dark:hover:bg-white/5"
            }`}
        >
          <span className="text-base">{item.icon}</span>
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
