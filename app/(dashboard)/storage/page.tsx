"use client";

import { useEffect, useState } from "react";

interface AssetRow {
  id: string;
  prompt: string;
  url: string;
  width: number;
  height: number;
  createdAt: string;
}

export default function StoragePage() {
  const [items, setItems] = useState<AssetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);

  function load() {
    fetch("/api/image")
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function generate() {
    if (!prompt.trim()) return;
    setBusy(true);
    try {
      await fetch("/api/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      setPrompt("");
      load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-6">
        <h1 className="text-2xl font-black">🖼️ 스토리지</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          생성한 카드 이미지가 모이는 곳이에요.
        </p>
      </header>

      <div className="mb-6 flex gap-2">
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="이미지에 넣을 문구"
          className="flex-1 rounded-xl border bg-[var(--background)] px-3 py-2.5 text-sm outline-none focus:border-[var(--brand)]"
        />
        <button
          onClick={generate}
          disabled={busy}
          className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white brand-gradient disabled:opacity-60"
        >
          {busy ? "생성 중…" : "생성"}
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-[var(--muted)]">불러오는 중…</p>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-[var(--card)] p-10 text-center">
          <p className="text-3xl">🎨</p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            아직 이미지가 없어요. 위에서 문구를 넣어 만들어보세요.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((a) => (
            <figure
              key={a.id}
              className="overflow-hidden rounded-2xl border bg-[var(--card)]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={a.url} alt={a.prompt} className="aspect-square w-full object-cover" />
              <figcaption className="truncate p-2 text-xs text-[var(--muted)]">
                {a.prompt}
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}
