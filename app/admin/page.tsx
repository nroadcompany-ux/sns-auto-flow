"use client";

import { useState } from "react";
import type { DiagnosticResult } from "@/types";

export default function AdminPage() {
  const [key, setKey] = useState("");
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function runDiagnostic() {
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const res = await fetch("/api/diagnostic", {
        headers: { "x-sfa-admin-key": key },
      });
      if (res.status === 401) {
        throw new Error("관리자 키가 올바르지 않습니다.");
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "진단 실패");
      setResult(data as DiagnosticResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : "진단 실패");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-black">🔐 관리자 · 시스템 진단</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          관리자 키(<code>SFA_ADMIN_KEY</code>)를 입력하면 환경 설정 상태를 점검해요.
        </p>
      </header>

      <div className="flex gap-2">
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="SFA_ADMIN_KEY"
          className="flex-1 rounded-xl border bg-[var(--background)] px-3 py-2.5 text-sm outline-none focus:border-[var(--brand)]"
        />
        <button
          onClick={runDiagnostic}
          disabled={loading || !key}
          className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white brand-gradient disabled:opacity-60"
        >
          {loading ? "점검 중…" : "진단 실행"}
        </button>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40">
          {error}
        </p>
      )}

      {result && (
        <div className="space-y-3">
          <div
            className={`rounded-xl p-3 text-sm font-semibold ${
              result.ok
                ? "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300"
                : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
            }`}
          >
            {result.ok
              ? "✅ 모든 항목 정상"
              : "⚠️ 일부 항목 점검 필요 (아래 참고)"}
            <span className="ml-2 font-normal text-[var(--muted)]">
              {new Date(result.checkedAt).toLocaleString("ko-KR")}
            </span>
          </div>

          <ul className="space-y-2">
            {result.checks.map((c) => (
              <li
                key={c.name}
                className="flex items-start gap-3 rounded-xl border bg-[var(--card)] p-3"
              >
                <span className="text-lg">{c.ok ? "✅" : "⚠️"}</span>
                <div>
                  <p className="font-semibold">{c.name}</p>
                  <p className="text-sm text-[var(--muted)]">{c.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs text-[var(--muted)]">
        기본 키는 <code>.env.local</code> 의 <code>SFA_ADMIN_KEY</code> 값입니다 — 배포
        전에 반드시 강력한 값으로 교체하세요.
      </p>
    </div>
  );
}
