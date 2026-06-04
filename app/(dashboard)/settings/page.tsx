import { PLATFORMS } from "@/types";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-black">⚙️ 설정</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          연동 채널과 환경 값을 확인하세요.
        </p>
      </header>

      <section className="rounded-2xl border bg-[var(--card)] p-5">
        <h2 className="font-bold">지원 플랫폼</h2>
        <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PLATFORMS.map((p) => (
            <li
              key={p.value}
              className="rounded-xl border bg-[var(--background)] p-3 text-center text-sm"
            >
              <div className="text-xl">{p.emoji}</div>
              <div className="mt-1 font-medium">{p.label}</div>
              <div className="text-xs text-[var(--muted)]">최대 {p.max}자</div>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border bg-[var(--card)] p-5">
        <h2 className="font-bold">환경 변수</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          아래 값들은 프로젝트 루트의{" "}
          <code className="rounded bg-black/5 px-1 dark:bg-white/10">.env.local</code>{" "}
          에서 설정합니다.
        </p>
        <ul className="mt-3 space-y-2 text-sm">
          {[
            ["ANTHROPIC_API_KEY", "Claude AI 글 생성용 키 (비우면 데모 모드)"],
            ["PAYPLAY_API_BASE / _SECRET", "실제 SNS 발행 연동"],
            ["NEXTAUTH_SECRET", "세션 암호화 키"],
            ["SFA_ADMIN_KEY", "관리자/진단 접근 키"],
          ].map(([k, v]) => (
            <li
              key={k}
              className="flex flex-col gap-0.5 rounded-xl border bg-[var(--background)] p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <code className="font-mono text-[var(--brand)]">{k}</code>
              <span className="text-xs text-[var(--muted)]">{v}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-amber-300 bg-amber-50 p-5 dark:border-amber-800 dark:bg-amber-950/30">
        <h2 className="font-bold text-amber-800 dark:text-amber-300">
          ⚠️ 배포 전 보안 점검
        </h2>
        <p className="mt-1 text-sm text-amber-700 dark:text-amber-200">
          <code>NEXTAUTH_SECRET</code>, <code>PAYPLAY_API_SECRET</code>,{" "}
          <code>SFA_ADMIN_KEY</code> 의 기본 placeholder 값은 반드시 강력한 무작위
          값으로 교체하세요. <code>openssl rand -base64 32</code> 로 생성할 수 있어요.
        </p>
      </section>
    </div>
  );
}
