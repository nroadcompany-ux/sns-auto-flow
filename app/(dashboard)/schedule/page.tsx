"use client";

import { useEffect, useState } from "react";

interface ContentRow {
  id: string;
  title: string;
  platform: string;
  status: string;
  scheduledAt: string | null;
  createdAt: string;
}

export default function SchedulePage() {
  const [items, setItems] = useState<ContentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/publish?status=scheduled")
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-6">
        <h1 className="text-2xl font-black">🗓️ 예약</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          발행 시간이 예약된 콘텐츠 목록이에요. (‘콘텐츠 생성’에서 예약 시간을 지정하면 여기에 모여요.)
        </p>
      </header>

      {loading ? (
        <p className="text-sm text-[var(--muted)]">불러오는 중…</p>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-[var(--card)] p-10 text-center">
          <p className="text-3xl">⏰</p>
          <p className="mt-2 text-sm text-[var(--muted)]">예약된 게시물이 없어요.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items
            .slice()
            .sort(
              (a, b) =>
                new Date(a.scheduledAt ?? a.createdAt).getTime() -
                new Date(b.scheduledAt ?? b.createdAt).getTime()
            )
            .map((it) => (
              <li
                key={it.id}
                className="flex items-center gap-4 rounded-2xl border bg-[var(--card)] p-4"
              >
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl brand-gradient text-white">
                  🗓️
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-semibold">{it.title}</h3>
                  <p className="text-xs text-[var(--muted)]">{it.platform}</p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-semibold text-[var(--brand)]">
                    {it.scheduledAt
                      ? new Date(it.scheduledAt).toLocaleString("ko-KR")
                      : "—"}
                  </p>
                  <p className="text-xs text-[var(--muted)]">예약됨</p>
                </div>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
