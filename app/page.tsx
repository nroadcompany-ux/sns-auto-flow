"use client"
import { useState } from "react"
import { CHANNEL_META, TChannel, TTone, TSourceType, TImageEngine, IScheduleItem } from "@/types"

// ── 상수 ─────────────────────────────────────
const ALL_CHANNELS = Object.keys(CHANNEL_META) as TChannel[]

const FREQ_OPTIONS = [
  { id: "daily", label: "매일" }, { id: "weekly", label: "매주" },
  { id: "biweekly", label: "격주" }, { id: "monthly", label: "매월" },
]

const TONE_OPTIONS: { id: TTone; label: string; desc: string }[] = [
  { id: "friendly",     label: "친근하게",   desc: "소상공인 눈높이" },
  { id: "professional", label: "전문적으로",  desc: "신뢰감 있는 공식체" },
  { id: "emotional",    label: "감성적으로",  desc: "공감·스토리텔링" },
]

const SOURCE_OPTIONS: { id: TSourceType; label: string; desc: string }[] = [
  { id: "MANUAL",      label: "주제 직접 입력", desc: "키워드만 입력하면 AI가 작성" },
  { id: "DIVERSIFIED", label: "주제 다각화",    desc: "편별로 다른 각도 자동 설계" },
  { id: "URL",         label: "URL 추출",       desc: "링크 입력 → 내용 분석 후 작성" },
  { id: "FILE",        label: "자료 붙여넣기",  desc: "브로셔·공문 등 텍스트 기반" },
]

const IMAGE_ENGINES: { id: TImageEngine; label: string; desc: string }[] = [
  { id: "custom", label: "기본 템플릿", desc: "SFA 제공 브랜드 디자인" },
  { id: "canva",  label: "캔바 연동",   desc: "내 캔바 템플릿 사용" },
]

const STATUS_STYLE = {
  draft:     { label: "임시저장", color: "#6b7280", bg: "#f3f4f6" },
  scheduled: { label: "예약됨",   color: "#d97706", bg: "#fef3c7" },
  published: { label: "게시완료", color: "#059669", bg: "#d1fae5" },
  failed:    { label: "실패",     color: "#dc2626", bg: "#fee2e2" },
}

type TNav = "create" | "schedule" | "storage" | "settings" | "admin"

// ── 유틸 ─────────────────────────────────────
function genDates(count: number, start: string, freq: string): Date[] {
  const base = new Date(start)
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(base)
    if (freq === "daily")    d.setDate(base.getDate() + i)
    else if (freq === "weekly")   d.setDate(base.getDate() + i * 7)
    else if (freq === "biweekly") d.setDate(base.getDate() + i * 14)
    else d.setMonth(base.getMonth() + i)
    return d
  })
}

function fmtDate(d: Date) {
  const days = ["일","월","화","수","목","금","토"]
  return `${d.getMonth()+1}/${d.getDate()}(${days[d.getDay()]})`
}

function todayStr() {
  return new Date().toISOString().split("T")[0]
}

function getChannelText(item: IScheduleItem, ch: TChannel): string {
  if (!item.content) return ""
  const c = item.content
  switch (ch) {
    case "BLOG_NAVER":
    case "PAYPLAY_BLOG":    return `${c.blog.title}\n\n${c.blog.body}\n\nSEO: ${c.blog.seoKeywords.join(", ")}`
    case "NEWS_HOMEPAGE":
    case "PAYPLAY_PRESS":   return `${c.news.headline}\n${c.news.subheadline}\n\n${c.news.body}\n\n태그: ${c.news.tags.join(", ")}`
    case "INSTAGRAM":        return `${c.instagram.caption}\n\n${c.instagram.hashtags.join(" ")}`
    case "THREADS":          return c.threads.post
    case "KAKAO_CHANNEL":    return `${c.kakao.title}\n\n${c.kakao.body}`
    default:                 return c.blog.body
  }
}

// ── 컴포넌트 ──────────────────────────────────
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: "#fff", borderRadius: 14, padding: 22, border: "1px solid #f0f0f0", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", ...style }}>{children}</div>
}

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 12 }}>{children}</div>
}

function BigBtn({ children, onClick, disabled, style }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; style?: React.CSSProperties }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{ width: "100%", padding: "14px", background: disabled ? "#e5e7eb" : "#111", color: disabled ? "#9ca3af" : "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", letterSpacing: -0.2, ...style }}
    >
      {children}
    </button>
  )
}

// ── 메인 ─────────────────────────────────────
export default function SFA() {
  const [nav, setNav] = useState<TNav>("create")

  // 생성 폼
  const [sourceType, setSourceType] = useState<TSourceType>("MANUAL")
  const [topic, setTopic] = useState("")
  const [sourceContent, setSourceContent] = useState("")
  const [keywords, setKeywords] = useState("")
  const [tone, setTone] = useState<TTone>("friendly")
  const [count, setCount] = useState(4)
  const [freq, setFreq] = useState("weekly")
  const [startDate, setStartDate] = useState(todayStr())
  const [channels, setChannels] = useState<TChannel[]>(["INSTAGRAM","THREADS","KAKAO_CHANNEL","PAYPLAY_BLOG"])
  const [imageEngine, setImageEngine] = useState<TImageEngine>("custom")
  const [canvaKey, setCanvaKey] = useState("")

  // 상태
  const [generating, setGenerating] = useState(false)
  const [genLogs, setGenLogs] = useState<{ step: string; done: boolean; error: boolean }[]>([])
  const [schedule, setSchedule] = useState<IScheduleItem[]>([])
  const [activeItem, setActiveItem] = useState<IScheduleItem | null>(null)
  const [activeChannel, setActiveChannel] = useState<TChannel>("INSTAGRAM")
  const [copied, setCopied] = useState<string | null>(null)
  const [publishing, setPublishing] = useState(false)
  const [publishResults, setPublishResults] = useState<any[]>([])

  // 브랜드
  const [brand, setBrand] = useState({ name: "SNS FLOW AUTO", color: "#111111", hashtags: "" })

  // 어드민
  const [adminKey, setAdminKey] = useState("")
  const [diagError, setDiagError] = useState("")
  const [diagResult, setDiagResult] = useState<any>(null)
  const [diagLoading, setDiagLoading] = useState(false)

  const dates = genDates(count, startDate, freq)
  const toggleCh = (ch: TChannel) =>
    setChannels(p => p.includes(ch) ? p.filter(c => c !== ch) : [...p, ch])

  // ── 자동화 실행
  const handleGenerate = async () => {
    const input = sourceType === "MANUAL" ? topic : sourceContent
    if (!input.trim()) return
    setGenerating(true)
    setGenLogs(Array.from({ length: count }, () => ({ step: "대기 중...", done: false, error: false })))
    try {
      const res = await fetch("/api/content/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, keywords, tone, count, sourceType, sourceContent, startDate, frequency: freq }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)

      const results: IScheduleItem[] = data.results.map((r: any, i: number) => {
        setGenLogs(p => p.map((l, idx) => idx === i ? { ...l, step: "완료", done: true } : l))
        return {
          id: `${Date.now()}-${i}`,
          index: r.index || i + 1,
          topic: r.topic || topic,
          angle: r.angle || "일반",
          date: dates[i],
          status: i === 0 ? "published" : "scheduled",
          content: r.content,
          channels,
        }
      })
      setSchedule(results)
      if (results[0]) { setActiveItem(results[0]); setActiveChannel(channels[0]) }
      setTimeout(() => { setGenerating(false); setNav("schedule") }, 500)
    } catch {
      setGenLogs(p => p.map(l => ({ ...l, error: true, step: "오류 발생" })))
      setGenerating(false)
    }
  }

  // ── 발행
  const handlePublish = async (item: IScheduleItem) => {
    if (!item.content) return
    setPublishing(true)
    setPublishResults([])
    const payload = {
      title: item.content.blog.title,
      body: item.content.blog.body,
      hashtags: item.content.instagram.hashtags,
    }
    try {
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channels: item.channels, payload }),
      })
      const data = await res.json()
      setPublishResults(data.summary || [])
    } finally {
      setPublishing(false)
    }
  }

  // ── 복사
  const copy = (key: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  // ── 진단
  const handleDiag = async () => {
    if (!diagError || !adminKey) return
    setDiagLoading(true); setDiagResult(null)
    try {
      const res = await fetch("/api/diagnostic", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ error: diagError, context: "SNS FLOW AUTO" }),
      })
      const data = await res.json()
      setDiagResult(data.analysis)
    } finally {
      setDiagLoading(false)
    }
  }

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>

      {/* 사이드바 */}
      <aside style={{ width: 220, background: "#fff", borderRight: "1px solid #f0f0f0", display: "flex", flexDirection: "column", padding: "24px 0", flexShrink: 0, position: "sticky", top: 0, height: "100vh" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 20px 24px", borderBottom: "1px solid #f0f0f0", marginBottom: 16 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "#111", color: "#fff", fontSize: 11, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", letterSpacing: -0.5, flexShrink: 0 }}>SF</div>
          <div>
            <div style={{ fontWeight: 900, fontSize: 13, color: "#111", letterSpacing: -0.3 }}>SNS FLOW</div>
            <div style={{ fontSize: 9, color: "#9ca3af", fontWeight: 700, letterSpacing: 2 }}>AUTO</div>
          </div>
        </div>

        <nav style={{ flex: 1, padding: "0 10px", display: "flex", flexDirection: "column", gap: 2 }}>
          {([
            { id: "create",   label: "콘텐츠 생성" },
            { id: "schedule", label: "발행 일정" },
            { id: "storage",  label: "소재 보관함" },
            { id: "settings", label: "설정" },
            { id: "admin",    label: "관리자 진단" },
          ] as { id: TNav; label: string }[]).map(item => (
            <button key={item.id}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, border: "none", background: nav === item.id ? "#f7f8fc" : "transparent", fontSize: 13, color: nav === item.id ? "#111" : "#6b7280", cursor: "pointer", textAlign: "left", fontWeight: nav === item.id ? 700 : 500 }}
              onClick={() => setNav(item.id)}>
              {item.label}
            </button>
          ))}
        </nav>

        <div style={{ padding: "16px 20px 0", borderTop: "1px solid #f0f0f0", display: "flex", gap: 16 }}>
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#111" }}>{schedule.length}</div>
            <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>총 콘텐츠</div>
          </div>
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#111" }}>{schedule.filter(s => s.status === "scheduled").length}</div>
            <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>예약 대기</div>
          </div>
        </div>
      </aside>

      {/* 메인 */}
      <main style={{ flex: 1, overflow: "auto" }}>
        <div style={{ padding: "32px 28px", maxWidth: 1100 }}>

          {/* ══ 생성 ══ */}
          {nav === "create" && !generating && (
            <>
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#111", letterSpacing: -0.5 }}>콘텐츠 자동화</div>
                <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 4 }}>최소 정보 입력 → 블로그부터 SNS까지 자동 생성·발행</div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 20, alignItems: "start" }}>
                {/* 왼쪽 */}
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                  <Card>
                    <Label>콘텐츠 소스</Label>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      {SOURCE_OPTIONS.map(s => (
                        <button key={s.id}
                          style={{ padding: 12, border: `1.5px solid ${sourceType === s.id ? "#111" : "#e5e7eb"}`, borderRadius: 10, background: sourceType === s.id ? "#fff" : "#fafbff", cursor: "pointer", textAlign: "left" }}
                          onClick={() => setSourceType(s.id)}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#111", marginBottom: 3 }}>{s.label}</div>
                          <div style={{ fontSize: 11, color: "#9ca3af" }}>{s.desc}</div>
                        </button>
                      ))}
                    </div>
                  </Card>

                  <Card>
                    <Label>{sourceType === "URL" ? "URL 입력" : sourceType === "FILE" ? "자료 붙여넣기" : "주제 입력"}</Label>
                    {sourceType === "URL" ? (
                      <input style={{ width: "100%", border: "1.5px solid #e5e7eb", borderRadius: 8, padding: "10px 12px", fontSize: 13, background: "#fafbff", boxSizing: "border-box" }}
                        placeholder="https://..." value={sourceContent} onChange={e => setSourceContent(e.target.value)} />
                    ) : sourceType === "FILE" ? (
                      <textarea style={{ width: "100%", border: "1.5px solid #e5e7eb", borderRadius: 8, padding: "10px 12px", fontSize: 13, background: "#fafbff", boxSizing: "border-box", height: 120, resize: "vertical" }}
                        placeholder="브로셔, 공문, 안내문 내용을 붙여넣으세요..." value={sourceContent} onChange={e => setSourceContent(e.target.value)} />
                    ) : (
                      <>
                        <input style={{ width: "100%", border: "1.5px solid #e5e7eb", borderRadius: 8, padding: "10px 12px", fontSize: 13, background: "#fafbff", boxSizing: "border-box", marginBottom: 10 }}
                          placeholder="예) 여름 매출 올리는 소상공인 마케팅 전략" value={topic} onChange={e => setTopic(e.target.value)} />
                        <input style={{ width: "100%", border: "1.5px solid #e5e7eb", borderRadius: 8, padding: "10px 12px", fontSize: 13, background: "#fafbff", boxSizing: "border-box" }}
                          placeholder="키워드 (쉼표 구분, 선택)" value={keywords} onChange={e => setKeywords(e.target.value)} />
                      </>
                    )}
                    <div style={{ marginTop: 16 }}>
                      <Label>톤 & 매너</Label>
                      <div style={{ display: "flex", gap: 8 }}>
                        {TONE_OPTIONS.map(t => (
                          <button key={t.id}
                            style={{ flex: 1, padding: "10px 8px", border: `1.5px solid ${tone === t.id ? "#111" : "#e5e7eb"}`, borderRadius: 10, background: tone === t.id ? "#fff" : "#fafbff", cursor: "pointer", textAlign: "left" }}
                            onClick={() => setTone(t.id)}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "#111" }}>{t.label}</div>
                            <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{t.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </Card>

                  <Card>
                    <Label>이미지 생성 방식</Label>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      {IMAGE_ENGINES.map(e => (
                        <button key={e.id}
                          style={{ padding: 12, border: `1.5px solid ${imageEngine === e.id ? "#111" : "#e5e7eb"}`, borderRadius: 10, background: imageEngine === e.id ? "#fff" : "#fafbff", cursor: "pointer", textAlign: "left" }}
                          onClick={() => setImageEngine(e.id)}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#111", marginBottom: 3 }}>{e.label}</div>
                          <div style={{ fontSize: 11, color: "#9ca3af" }}>{e.desc}</div>
                        </button>
                      ))}
                    </div>
                    {imageEngine === "canva" && (
                      <input style={{ width: "100%", border: "1.5px solid #e5e7eb", borderRadius: 8, padding: "10px 12px", fontSize: 13, background: "#fafbff", boxSizing: "border-box", marginTop: 10 }}
                        placeholder="캔바 API Key" value={canvaKey} onChange={e => setCanvaKey(e.target.value)} />
                    )}
                  </Card>
                </div>

                {/* 오른쪽 */}
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                  <Card>
                    <Label>발행 일정</Label>
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 8 }}>수량</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <button style={{ width: 32, height: 32, borderRadius: 8, border: "1.5px solid #e5e7eb", background: "#fff", fontSize: 18, cursor: "pointer" }} onClick={() => setCount(c => Math.max(1, c - 1))}>−</button>
                          <span style={{ fontWeight: 700, fontSize: 16, minWidth: 36, textAlign: "center" }}>{count}편</span>
                          <button style={{ width: 32, height: 32, borderRadius: 8, border: "1.5px solid #e5e7eb", background: "#fff", fontSize: 18, cursor: "pointer" }} onClick={() => setCount(c => Math.min(12, c + 1))}>+</button>
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 8 }}>발행 주기</div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {FREQ_OPTIONS.map(f => (
                            <button key={f.id}
                              style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: freq === f.id ? "#111" : "#f7f8fc", color: freq === f.id ? "#fff" : "#6b7280", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                              onClick={() => setFreq(f.id)}>{f.label}</button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 8 }}>시작일</div>
                        <input type="date" style={{ width: "100%", border: "1.5px solid #e5e7eb", borderRadius: 8, padding: "10px 12px", fontSize: 13, background: "#fafbff", boxSizing: "border-box" }}
                          value={startDate} onChange={e => setStartDate(e.target.value)} />
                      </div>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 14 }}>
                      {dates.map((d, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 20, padding: "4px 10px", fontSize: 12, color: "#1d4ed8" }}>
                          <span style={{ fontWeight: 700, fontSize: 11, background: "#1a73e8", color: "#fff", borderRadius: 10, width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>{i + 1}</span>
                          {fmtDate(d)}
                        </div>
                      ))}
                    </div>
                  </Card>

                  <Card>
                    <Label>발행 채널</Label>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      {ALL_CHANNELS.map(ch => {
                        const m = CHANNEL_META[ch]; const on = channels.includes(ch)
                        return (
                          <button key={ch}
                            style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", border: `1.5px solid ${on ? m.color : "#e5e7eb"}`, borderRadius: 10, background: on ? "#fff" : "#fafbff", cursor: "pointer", textAlign: "left" }}
                            onClick={() => toggleCh(ch)}>
                            <div style={{ width: 8, height: 8, borderRadius: "50%", background: on ? m.color : "#e5e7eb", flexShrink: 0 }} />
                            <span style={{ flex: 1, fontSize: 11, fontWeight: 500, color: "#374151" }}>{m.label}</span>
                            {on && <span style={{ fontSize: 10, color: "#fff", background: m.color, padding: "1px 5px", borderRadius: 4, fontWeight: 700 }}>ON</span>}
                          </button>
                        )
                      })}
                    </div>
                  </Card>

                  <Card>
                    <Label>자동화 요약</Label>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
                      {[
                        ["소스", { MANUAL: "직접 입력", DIVERSIFIED: "주제 다각화", URL: "URL 추출", FILE: "자료 기반" }[sourceType]],
                        ["수량", `${count}편`],
                        ["주기", { daily: "매일", weekly: "매주", biweekly: "격주", monthly: "매월" }[freq]],
                        ["채널", `${channels.length}개`],
                        ["총 생성", `${count * channels.length}개`],
                      ].map(([k, v]) => (
                        <div key={k as string} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                          <span style={{ color: "#6b7280" }}>{k}</span>
                          <span style={{ fontWeight: 700, color: k === "총 생성" ? "#1a73e8" : "#111", fontSize: k === "총 생성" ? 16 : 13 }}>{v}</span>
                        </div>
                      ))}
                    </div>
                    <BigBtn onClick={handleGenerate} disabled={!topic && sourceType === "MANUAL"}>✦ 자동화 시작</BigBtn>
                  </Card>
                </div>
              </div>
            </>
          )}

          {/* ══ 생성 중 ══ */}
          {generating && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
              <Card style={{ width: 480, textAlign: "center" }}>
                <div style={{ width: 48, height: 48, border: "3px solid #f0f0f0", borderTopColor: "#111", borderRadius: "50%", margin: "0 auto 20px", animation: "spin 0.8s linear infinite" }} />
                <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>AI가 콘텐츠를 생성 중이에요</div>
                <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 24 }}>{count}편 × {channels.length}채널 = {count * channels.length}개 콘텐츠</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {genLogs.map((l, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "#f7f8fc", borderRadius: 10 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: l.done ? "#10b981" : l.error ? "#ef4444" : "#1a73e8", flexShrink: 0, animation: !l.done && !l.error ? "pulse 1.2s infinite" : undefined }} />
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 600, textAlign: "left" }}>{topic || "주제"} {i + 1}편</span>
                      <span style={{ fontSize: 12, color: "#9ca3af" }}>{l.step}</span>
                      <span>{l.done ? "✅" : l.error ? "❌" : "⏳"}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* ══ 일정 ══ */}
          {nav === "schedule" && (
            <>
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#111", letterSpacing: -0.5 }}>발행 일정</div>
                <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 4 }}>채널별 콘텐츠 검토 · 편집 · 복사 · 자동 발행</div>
              </div>

              {schedule.length === 0 ? (
                <Card style={{ textAlign: "center", padding: 60 }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>◈</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "#9ca3af", marginBottom: 16 }}>생성된 일정이 없어요</div>
                  <button style={{ padding: "10px 20px", background: "#f7f8fc", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }} onClick={() => setNav("create")}>콘텐츠 생성하기 →</button>
                </Card>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 20 }}>
                  {/* 목록 */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {schedule.map(item => (
                      <button key={item.id}
                        style={{ background: "#fff", border: `1.5px solid ${activeItem?.id === item.id ? "#111" : "#f0f0f0"}`, borderRadius: 12, padding: "14px 16px", cursor: "pointer", textAlign: "left" }}
                        onClick={() => { setActiveItem(item); setActiveChannel(item.channels[0]); setPublishResults([]) }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af" }}>{item.index}편</span>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, color: STATUS_STYLE[item.status].color, background: STATUS_STYLE[item.status].bg }}>{STATUS_STYLE[item.status].label}</span>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#111", lineHeight: 1.4, marginBottom: 6 }}>{item.topic}</div>
                        <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 8 }}>📅 {fmtDate(item.date)} · {item.angle}</div>
                        <div style={{ display: "flex", gap: 4 }}>
                          {item.channels.map(ch => <div key={ch} style={{ width: 7, height: 7, borderRadius: "50%", background: CHANNEL_META[ch].color }} />)}
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* 상세 */}
                  {activeItem && (
                    <Card style={{ padding: 0, overflow: "hidden" }}>
                      <div style={{ padding: "20px 24px", borderBottom: "1px solid #f0f0f0" }}>
                        <div style={{ fontSize: 17, fontWeight: 700, color: "#111", marginBottom: 4 }}>{activeItem.topic}</div>
                        <div style={{ fontSize: 13, color: "#9ca3af" }}>📅 {fmtDate(activeItem.date)} · {activeItem.angle}</div>
                      </div>

                      {/* 채널 탭 */}
                      <div style={{ display: "flex", borderBottom: "1px solid #f0f0f0", padding: "0 24px", overflowX: "auto" }}>
                        {activeItem.channels.map(ch => {
                          const m = CHANNEL_META[ch]
                          return (
                            <button key={ch}
                              style={{ padding: "12px 14px", border: "none", borderBottom: `2px solid ${activeChannel === ch ? m.color : "transparent"}`, background: "transparent", fontSize: 12, fontWeight: activeChannel === ch ? 700 : 500, color: activeChannel === ch ? m.color : "#9ca3af", cursor: "pointer", whiteSpace: "nowrap" }}
                              onClick={() => setActiveChannel(ch)}>
                              {m.label}
                            </button>
                          )
                        })}
                      </div>

                      {/* 콘텐츠 */}
                      <div style={{ padding: 24 }}>
                        {activeItem.content ? (
                          <>
                            <div style={{ background: "#f7f8fc", borderRadius: 12, padding: 16, lineHeight: 1.8, fontSize: 13, color: "#374151", whiteSpace: "pre-wrap", marginBottom: 16, maxHeight: 320, overflowY: "auto" }}>
                              {getChannelText(activeItem, activeChannel)}
                            </div>
                            {activeChannel === "INSTAGRAM" && (
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
                                {activeItem.content.instagram.hashtags.map(h => (
                                  <span key={h} style={{ background: "#fce4ec", color: "#e1306c", borderRadius: 20, padding: "3px 10px", fontSize: 12 }}>{h}</span>
                                ))}
                              </div>
                            )}
                            <div style={{ display: "flex", gap: 10, paddingTop: 16, borderTop: "1px solid #f0f0f0" }}>
                              <button
                                style={{ padding: "9px 16px", background: "#f7f8fc", color: "#111", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                                onClick={() => copy(activeItem.id + activeChannel, getChannelText(activeItem, activeChannel))}>
                                {copied === activeItem.id + activeChannel ? "✅ 복사됨" : "📋 복사하기"}
                              </button>
                              <button
                                style={{ padding: "9px 20px", background: "#111", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                                onClick={() => handlePublish(activeItem)} disabled={publishing}>
                                {publishing ? "발행 중..." : "🚀 자동 발행"}
                              </button>
                            </div>
                            {publishResults.length > 0 && (
                              <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 6 }}>
                                {publishResults.map((r: any) => (
                                  <div key={r.channel} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, padding: "8px 12px", background: "#f7f8fc", borderRadius: 8 }}>
                                    <span>{r.success ? "✅" : r.fallback ? "📋" : "❌"}</span>
                                    <span style={{ fontWeight: 600 }}>{CHANNEL_META[r.channel as TChannel]?.label}</span>
                                    <span style={{ color: "#9ca3af", marginLeft: "auto" }}>{r.success ? "발행완료" : r.fallback ? "보관함 저장" : "실패"}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        ) : (
                          <div style={{ color: "#9ca3af", textAlign: "center", padding: 40 }}>콘텐츠를 생성해주세요</div>
                        )}
                      </div>
                    </Card>
                  )}
                </div>
              )}
            </>
          )}

          {/* ══ 소재 보관함 ══ */}
          {nav === "storage" && (
            <>
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#111", letterSpacing: -0.5 }}>소재 보관함</div>
                <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 4 }}>자동 발행 실패 · 수동 발행 대기 소재 · 원클릭 복사</div>
              </div>
              {schedule.length === 0 ? (
                <Card style={{ textAlign: "center", padding: 60 }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>○</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "#9ca3af" }}>저장된 소재가 없어요</div>
                </Card>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
                  {schedule.map(item => (
                    <Card key={item.id} style={{ cursor: "pointer", padding: 18 }}
                      onClick={() => { setActiveItem(item); setActiveChannel(item.channels[0]); setNav("schedule") }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, color: STATUS_STYLE[item.status].color, background: STATUS_STYLE[item.status].bg }}>{STATUS_STYLE[item.status].label}</span>
                        <span style={{ fontSize: 11, color: "#9ca3af" }}>{fmtDate(item.date)}</span>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#111", lineHeight: 1.4, marginBottom: 12 }}>{item.topic}</div>
                      <div style={{ display: "flex", gap: 4 }}>
                        {item.channels.map(ch => <div key={ch} style={{ width: 7, height: 7, borderRadius: "50%", background: CHANNEL_META[ch].color }} />)}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ══ 설정 ══ */}
          {nav === "settings" && (
            <>
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#111", letterSpacing: -0.5 }}>브랜드 설정</div>
                <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 4 }}>AI 생성 시 자동 반영되는 브랜드 정보</div>
              </div>
              <Card style={{ maxWidth: 520 }}>
                {[
                  { label: "브랜드명", key: "name", placeholder: "예) 페이플레이" },
                  { label: "대표 컬러 (HEX)", key: "color", placeholder: "#111111" },
                  { label: "고정 해시태그", key: "hashtags", placeholder: "#소상공인 #마케팅" },
                ].map(f => (
                  <div key={f.key} style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.4 }}>{f.label}</div>
                    <input style={{ width: "100%", border: "1.5px solid #e5e7eb", borderRadius: 8, padding: "10px 12px", fontSize: 13, background: "#fafbff", boxSizing: "border-box" }}
                      placeholder={f.placeholder} value={(brand as any)[f.key]} onChange={e => setBrand(p => ({ ...p, [f.key]: e.target.value }))} />
                  </div>
                ))}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.4 }}>컬러 미리보기</div>
                  <div style={{ height: 40, borderRadius: 8, background: brand.color || "#111" }} />
                </div>
                <BigBtn>설정 저장</BigBtn>
              </Card>
            </>
          )}

          {/* ══ 관리자 진단 ══ */}
          {nav === "admin" && (
            <>
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#111", letterSpacing: -0.5 }}>관리자 진단</div>
                <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 4 }}>오류 발생 시 Claude가 자동 분석 · 해결 코드 생성 · 관리자 전용</div>
              </div>
              <Card style={{ maxWidth: 600 }}>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.4 }}>관리자 키</div>
                  <input type="password" style={{ width: "100%", border: "1.5px solid #e5e7eb", borderRadius: 8, padding: "10px 12px", fontSize: 13, background: "#fafbff", boxSizing: "border-box" }}
                    placeholder="SFA 관리자 키" value={adminKey} onChange={e => setAdminKey(e.target.value)} />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.4 }}>오류 내용</div>
                  <textarea style={{ width: "100%", border: "1.5px solid #e5e7eb", borderRadius: 8, padding: "10px 12px", fontSize: 13, background: "#fafbff", boxSizing: "border-box", height: 120, resize: "vertical" }}
                    placeholder="오류 메시지, 스택 트레이스 등 붙여넣기..." value={diagError} onChange={e => setDiagError(e.target.value)} />
                </div>
                <BigBtn onClick={handleDiag} disabled={diagLoading || !diagError || !adminKey}>
                  {diagLoading ? "분석 중..." : "🔍 Claude 진단 요청"}
                </BigBtn>
                {diagResult && (
                  <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ padding: 16, background: "#fef3c7", borderRadius: 10 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#92400e", marginBottom: 6 }}>원인 분석</div>
                      <div style={{ fontSize: 13, color: "#78350f" }}>{diagResult.cause}</div>
                    </div>
                    <div style={{ padding: 16, background: "#d1fae5", borderRadius: 10 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#065f46", marginBottom: 6 }}>해결 방법</div>
                      <div style={{ fontSize: 13, color: "#064e3b" }}>{diagResult.solution}</div>
                    </div>
                    {diagResult.fixedCode && (
                      <div style={{ padding: 16, background: "#1e1e2e", borderRadius: 10 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#a0aec0", marginBottom: 8 }}>수정 코드</div>
                        <pre style={{ fontSize: 12, color: "#e2e8f0", overflow: "auto", margin: 0 }}>{diagResult.fixedCode}</pre>
                        <button
                          style={{ marginTop: 10, padding: "8px 14px", background: "rgba(255,255,255,0.1)", color: "#e2e8f0", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 6, fontSize: 12, cursor: "pointer" }}
                          onClick={() => copy("diag", diagResult.fixedCode)}>
                          {copied === "diag" ? "✅ 복사됨" : "📋 코드 복사"}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            </>
          )}

        </div>
      </main>
    </div>
  )
}
