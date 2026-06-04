"use client";

import { useEffect, useState } from "react";

interface ContentRow {
  id: string;
  title: string;
  body: string;
  hashtags: string;
  platform: string;
  status: string;
  externalUrl: string | null;
  createdAt: string;
}

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
  scheduled: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
  published: "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300",
  failed: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
};

export default function HistoryPage() {
  const [items, setItems] = useState<ContentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/publish")
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-6">
        <h1 className="text-2xl font-black">📜 히스토리</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          생성하고 발행한 모든 콘텐츠 기록이에요.
        </p>
      </header>

      {loading ? (
        <p className="text-sm text-[var(--muted)]">불러오는 중…</p>
      ) : items.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="space-y-3">
          {items.map((it) => (
            <li
              key={it.id}
              className="rounded-2xl border bg-[var(--card)] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate font-semibold">{it.title}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-[var(--muted)]">
                    {it.body}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                    STATUS_STYLE[it.status] ?? STATUS_STYLE.draft
                  }`}
                >
                  {it.status}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-[var(--muted)]">
                <span>
                  {it.platform} · {new Date(it.createdAt).toLocaleString("ko-KR")}
                </span>
                {it.externalUrl && (
                  <a
                    href={it.externalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[var(--brand)] underline"
                  >
                    링크
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed bg-[var(--card)] p-10 text-center">
      <p className="text-3xl">🗒️</p>
      <p className="mt-2 text-sm text-[var(--muted)]">
        아직 만든 콘텐츠가 없어요. ‘콘텐츠 생성’에서 첫 글을 만들어보세요.
      </p>
    </div>
  );
}
