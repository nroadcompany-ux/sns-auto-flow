import Link from "next/link";

const FEATURES = [
  {
    href: "/create",
    icon: "✨",
    title: "콘텐츠 생성",
    desc: "주제만 넣으면 Claude AI가 플랫폼별 SNS 글과 해시태그를 만들어줘요.",
  },
  {
    href: "/storage",
    icon: "🖼️",
    title: "이미지 생성 · 보관",
    desc: "글에 어울리는 카드 이미지를 자동 생성하고 한곳에 모아둬요.",
  },
  {
    href: "/schedule",
    icon: "🗓️",
    title: "예약 발행",
    desc: "원하는 시간에 맞춰 게시물을 예약하고 흐름을 관리해요.",
  },
  {
    href: "/history",
    icon: "📜",
    title: "히스토리",
    desc: "지금까지 만든 글과 발행 상태를 한눈에 추적해요.",
  },
];

const STEPS = [
  "주제 · 플랫폼 · 톤을 고르고 ‘콘텐츠 생성’",
  "AI 초안을 다듬고 카드 이미지 생성",
  "바로 발행하거나 시간을 예약",
];

export default function Home() {
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Hero */}
      <section className="rounded-3xl brand-gradient p-8 sm:p-10 text-white shadow-lg">
        <p className="text-sm font-semibold uppercase tracking-widest text-white/80">
          AI SNS Automation
        </p>
        <h1 className="mt-2 text-3xl sm:text-4xl font-black leading-tight">
          한 번의 주제 입력으로
          <br />
          SNS 콘텐츠를 끝까지.
        </h1>
        <p className="mt-3 max-w-xl text-white/90">
          글 생성 → 이미지 → 발행까지, SNS FLOW AUTO가 흐름을 자동화합니다.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/create"
            className="rounded-xl bg-white px-5 py-2.5 font-semibold text-[var(--brand)]
                       shadow hover:bg-white/90 transition-colors"
          >
            지금 만들어보기 →
          </Link>
          <Link
            href="/admin"
            className="rounded-xl bg-white/15 px-5 py-2.5 font-semibold text-white
                       hover:bg-white/25 transition-colors"
          >
            시스템 진단
          </Link>
        </div>
      </section>

      {/* Steps */}
      <section className="grid gap-3 sm:grid-cols-3">
        {STEPS.map((step, i) => (
          <div key={i} className="rounded-2xl border bg-[var(--card)] p-4">
            <div className="mb-2 grid h-8 w-8 place-items-center rounded-full brand-gradient text-sm font-bold text-white">
              {i + 1}
            </div>
            <p className="text-sm text-[var(--foreground)]">{step}</p>
          </div>
        ))}
      </section>

      {/* Features */}
      <section className="grid gap-4 sm:grid-cols-2">
        {FEATURES.map((f) => (
          <Link
            key={f.href}
            href={f.href}
            className="group rounded-2xl border bg-[var(--card)] p-5 transition-shadow hover:shadow-md"
          >
            <div className="text-2xl">{f.icon}</div>
            <h3 className="mt-3 font-bold group-hover:brand-text">{f.title}</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">{f.desc}</p>
          </Link>
        ))}
      </section>

      <p className="text-center text-xs text-[var(--muted)]">
        API 키를 넣기 전에는 데모 모드로 동작합니다 — 모든 버튼을 미리 눌러볼 수 있어요.
      </p>
    </div>
  );
}
