"use client";

import { useState } from "react";
import {
  PLATFORMS,
  TONES,
  LENGTHS,
  type GenerateResponse,
  type ImageResponse,
  type Platform,
  type PublishResponse,
  type Tone,
  type Length,
} from "@/types";

type Step = "idle" | "generating" | "ready" | "imaging" | "publishing" | "done";

export default function CreatePage() {
  const [topic, setTopic] = useState("");
  const [platform, setPlatform] = useState<Platform>("instagram");
  const [tone, setTone] = useState<Tone>("friendly");
  const [length, setLength] = useState<Length>("medium");
  const [keywords, setKeywords] = useState("");

  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState<string | null>(null);

  const [content, setContent] = useState<GenerateResponse | null>(null);
  const [bodyEdit, setBodyEdit] = useState("");
  const [image, setImage] = useState<ImageResponse | null>(null);
  const [result, setResult] = useState<PublishResponse | null>(null);
  const [scheduledAt, setScheduledAt] = useState("");

  const busy = ["generating", "imaging", "publishing"].includes(step);

  async function handleGenerate() {
    setError(null);
    setResult(null);
    setImage(null);
    if (!topic.trim()) {
      setError("주제를 입력해주세요.");
      return;
    }
    setStep("generating");
    try {
      const res = await fetch("/api/content/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          platform,
          tone,
          length,
          keywords: keywords.split(",").map((k) => k.trim()).filter(Boolean),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "생성 실패");
      setContent(data as GenerateResponse);
      setBodyEdit((data as GenerateResponse).body);
      setStep("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : "생성 실패");
      setStep("idle");
    }
  }

  async function handleImage() {
    if (!content) return;
    setError(null);
    setStep("imaging");
    try {
      const res = await fetch("/api/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: content.title || topic }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "이미지 생성 실패");
      setImage(data as ImageResponse);
      setStep("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : "이미지 생성 실패");
      setStep("ready");
    }
  }

  async function handlePublish() {
    if (!content) return;
    setError(null);
    setStep("publishing");
    try {
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentId: content.id,
          topic,
          platform,
          title: content.title,
          body: bodyEdit,
          hashtags: content.hashtags,
          imageUrl: image?.url ?? null,
          scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "발행 실패");
      setResult(data as PublishResponse);
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "발행 실패");
      setStep("ready");
    }
  }

  function reset() {
    setContent(null);
    setImage(null);
    setResult(null);
    setBodyEdit("");
    setScheduledAt("");
    setStep("idle");
  }

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-6">
        <h1 className="text-2xl font-black">✨ 콘텐츠 생성</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          주제를 입력하면 AI가 글을 쓰고, 이미지 생성과 발행까지 한 흐름으로 이어져요.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ---- Form ---- */}
        <section className="rounded-2xl border bg-[var(--card)] p-5 space-y-4">
          <Field label="주제 *">
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="예: 동네 카페 신메뉴 출시"
              className="input"
            />
          </Field>

          <Field label="플랫폼">
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPlatform(p.value)}
                  className={`chip ${platform === p.value ? "chip-on" : ""}`}
                >
                  {p.emoji} {p.label}
                </button>
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="톤">
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value as Tone)}
                className="input"
              >
                {TONES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="길이">
              <select
                value={length}
                onChange={(e) => setLength(e.target.value as Length)}
                className="input"
              >
                {LENGTHS.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="키워드 (쉼표로 구분)">
            <input
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="예: 신메뉴, 할인, 오픈이벤트"
              className="input"
            />
          </Field>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={busy}
            className="btn-primary w-full"
          >
            {step === "generating" ? "생성 중…" : "콘텐츠 생성하기"}
          </button>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40">
              {error}
            </p>
          )}
        </section>

        {/* ---- Result ---- */}
        <section className="rounded-2xl border bg-[var(--card)] p-5 space-y-4">
          {!content && (
            <div className="grid h-full min-h-48 place-items-center text-center text-sm text-[var(--muted)]">
              왼쪽에서 주제를 입력하고 생성하면
              <br />
              결과가 여기에 표시돼요.
            </div>
          )}

          {content && (
            <>
              <div className="flex items-center justify-between">
                <h2 className="font-bold">{content.title}</h2>
                {content.demo && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                    DEMO
                  </span>
                )}
              </div>

              <textarea
                value={bodyEdit}
                onChange={(e) => setBodyEdit(e.target.value)}
                rows={8}
                className="input font-normal leading-relaxed"
              />

              <div className="flex flex-wrap gap-1.5">
                {content.hashtags.map((h) => (
                  <span
                    key={h}
                    className="rounded-full bg-black/5 px-2 py-0.5 text-xs text-[var(--brand)] dark:bg-white/10"
                  >
                    {h}
                  </span>
                ))}
              </div>

              {image && (
                <img
                  src={image.url}
                  alt="generated"
                  className="w-full rounded-xl border"
                />
              )}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleImage}
                  disabled={busy}
                  className="btn-ghost"
                >
                  {step === "imaging" ? "이미지 생성 중…" : "🖼️ 이미지 생성"}
                </button>
              </div>

              <div className="border-t pt-4 space-y-3">
                <Field label="예약 시간 (비우면 즉시 발행)">
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="input"
                  />
                </Field>
                <button
                  type="button"
                  onClick={handlePublish}
                  disabled={busy}
                  className="btn-primary w-full"
                >
                  {step === "publishing"
                    ? "발행 중…"
                    : scheduledAt
                      ? "🗓️ 예약하기"
                      : "🚀 지금 발행"}
                </button>
              </div>

              {result && (
                <div className="rounded-xl bg-green-50 p-3 text-sm dark:bg-green-950/40">
                  <p className="font-semibold text-green-700 dark:text-green-300">
                    {result.status === "scheduled"
                      ? "예약되었습니다 🗓️"
                      : "발행 완료 🚀"}
                    {result.demo && " (데모)"}
                  </p>
                  {result.externalUrl && (
                    <a
                      href={result.externalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="break-all text-green-700 underline dark:text-green-300"
                    >
                      {result.externalUrl}
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={reset}
                    className="mt-2 block text-xs text-[var(--muted)] underline"
                  >
                    새로 만들기
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>

      <style>{`
        .input {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid var(--border);
          background: var(--background);
          padding: 0.6rem 0.75rem;
          font-size: 0.9rem;
          outline: none;
        }
        .input:focus { border-color: var(--brand); }
        .chip {
          border-radius: 9999px;
          border: 1px solid var(--border);
          padding: 0.4rem 0.8rem;
          font-size: 0.85rem;
          background: var(--background);
        }
        .chip-on {
          background-image: linear-gradient(135deg, var(--brand), var(--brand-2));
          color: white;
          border-color: transparent;
        }
        .btn-primary {
          border-radius: 0.75rem;
          padding: 0.65rem 1rem;
          font-weight: 600;
          color: white;
          background-image: linear-gradient(135deg, var(--brand), var(--brand-2));
        }
        .btn-primary:disabled { opacity: 0.6; }
        .btn-ghost {
          border-radius: 0.75rem;
          padding: 0.55rem 0.9rem;
          font-weight: 600;
          font-size: 0.875rem;
          border: 1px solid var(--border);
          background: var(--background);
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-[var(--muted)]">
        {label}
      </span>
      {children}
    </label>
  );
}
