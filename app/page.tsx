"use client"
import { useState, useEffect, useCallback, useRef } from "react"
import { CHANNEL_META, TChannel, TTone, TSourceType, TImageEngine, IScheduleItem } from "@/types"
import {
  type SavedTopic, type SavedURL, type SavedMaterial, type BrandProfile, DEFAULT_BRANDS,
  getTopics, addTopic, deleteTopic,
  getURLs, addURL, deleteURL,
  getMaterials, addMaterial, deleteMaterial,
  getBrands, saveBrands, getActiveBrandId, setActiveBrandId, getActiveBrand,
} from "@/lib/storage"

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
  draft:     { label: "임시저장", cls: "badge-gray" },
  scheduled: { label: "예약됨",   cls: "badge-orange" },
  published: { label: "게시완료", cls: "badge-green" },
  failed:    { label: "실패",     cls: "badge-red" },
}

type TNav = "home" | "create" | "schedule" | "storage" | "settings" | "admin"

// ── 유틸 ─────────────────────────────────────
function genDates(count: number, start: string, freq: string): Date[] {
  const base = new Date(start)
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(base)
    if (freq === "daily")         d.setDate(base.getDate() + i)
    else if (freq === "weekly")   d.setDate(base.getDate() + i * 7)
    else if (freq === "biweekly") d.setDate(base.getDate() + i * 14)
    else                          d.setMonth(base.getMonth() + i)
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
    case "INSTAGRAM":       return `${c.instagram.caption}\n\n${c.instagram.hashtags.join(" ")}`
    case "THREADS":         return c.threads.post
    case "KAKAO_CHANNEL":   return `${c.kakao.title}\n\n${c.kakao.body}`
    default:                return c.blog.body
  }
}

// ── 컴포넌트 ──────────────────────────────────
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div className="card" style={style}>{children}</div>
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 10 }}>{children}</div>
}

function PrimaryBtn({ children, onClick, disabled, style }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; style?: React.CSSProperties }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`btn btn-primary btn-full${disabled ? "" : ""}`}
      style={style}>
      {children}
    </button>
  )
}

// ── 메인 ─────────────────────────────────────
export default function SFA() {
  const [nav, setNav] = useState<TNav>("home")

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

  // DB 히스토리
  const [dbItems, setDbItems] = useState<IScheduleItem[]>([])
  const [dbLoading, setDbLoading] = useState(false)

  // localStorage 저장 데이터
  const [savedTopics, setSavedTopics]       = useState<SavedTopic[]>([])
  const [savedURLs, setSavedURLs]           = useState<SavedURL[]>([])
  const [savedMaterials, setSavedMaterials] = useState<SavedMaterial[]>([])
  const [brandProfiles, setBrandProfiles]   = useState<BrandProfile[]>(DEFAULT_BRANDS)
  const [activeBrandId, setActiveBrandIdState] = useState<string>("b1")

  // UI 상태
  const [isDragging, setIsDragging]         = useState(false)
  const [showChannelGuide, setShowChannelGuide] = useState(false)
  const [showMoreGuide, setShowMoreGuide]   = useState(false)
  const [scheduleDeadline, setScheduleDeadline] = useState("")
  const [editingBrandId, setEditingBrandId] = useState<string | null>(null)
  const fileDropRef = useRef<HTMLTextAreaElement>(null)

  // localStorage 로드
  useEffect(() => {
    setSavedTopics(getTopics())
    setSavedURLs(getURLs())
    setSavedMaterials(getMaterials())
    setBrandProfiles(getBrands())
    setActiveBrandIdState(getActiveBrandId())
    const ab = getActiveBrand()
    if (ab) setBrand({ name: ab.name, color: ab.color, hashtags: ab.hashtags })
  }, [])

  const switchBrand = (id: string) => {
    setActiveBrandId(id)
    setActiveBrandIdState(id)
    const ab = getBrands().find(b => b.id === id)
    if (ab) setBrand({ name: ab.name, color: ab.color, hashtags: ab.hashtags })
  }

  const updateBrandProfile = (profile: BrandProfile) => {
    const updated = getBrands().map(b => b.id === profile.id ? profile : b)
    saveBrands(updated)
    setBrandProfiles(updated)
    if (profile.id === activeBrandId) setBrand({ name: profile.name, color: profile.color, hashtags: profile.hashtags })
  }

  const handleSaveTopic = () => {
    if (!topic.trim()) return
    addTopic(topic, keywords)
    setSavedTopics(getTopics())
  }
  const handleSelectTopic = (t: SavedTopic) => { setTopic(t.text); setKeywords(t.keywords) }
  const handleDeleteTopic = (id: string) => { deleteTopic(id); setSavedTopics(getTopics()) }

  const handleSaveURL = () => {
    if (!sourceContent.trim() || sourceType !== "URL") return
    addURL(sourceContent, sourceContent)
    setSavedURLs(getURLs())
  }
  const handleSelectURL = (u: SavedURL) => setSourceContent(u.url)
  const handleDeleteURL = (id: string) => { deleteURL(id); setSavedURLs(getURLs()) }

  const handleSaveMaterial = () => {
    if (!sourceContent.trim() || sourceType !== "FILE") return
    addMaterial(`자료 ${savedMaterials.length + 1}`, sourceContent)
    setSavedMaterials(getMaterials())
  }
  const handleSelectMaterial = (m: SavedMaterial) => setSourceContent(m.content)
  const handleDeleteMaterial = (id: string) => { deleteMaterial(id); setSavedMaterials(getMaterials()) }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const text = e.dataTransfer.getData("text/plain")
    const file = e.dataTransfer.files[0]
    if (text) { setSourceContent(text); return }
    if (file && file.type === "text/plain") {
      file.text().then(t => setSourceContent(t))
    } else if (file) {
      setSourceContent(`[파일: ${file.name}] — 내용을 직접 붙여넣어 주세요.`)
    }
  }, [])

  const loadHistory = useCallback(async () => {
    setDbLoading(true)
    try {
      const res = await fetch("/api/history?limit=50")
      const data = await res.json()
      if (data.success) {
        const mapped: IScheduleItem[] = data.items.map((item: any, i: number) => ({
          id: item.id, index: i + 1, topic: item.topic,
          angle: item.angle || "일반", date: new Date(item.createdAt),
          status: item.status as any, content: item.content,
          channels: item.channels || [], dbId: item.id,
        }))
        setDbItems(mapped)
      }
    } catch {}
    finally { setDbLoading(false) }
  }, [])

  useEffect(() => {
    if (nav === "schedule" || nav === "storage" || nav === "home") loadHistory()
  }, [nav, loadHistory])

  const dates = genDates(count, startDate, freq)
  const toggleCh = (ch: TChannel) =>
    setChannels(p => p.includes(ch) ? p.filter(c => c !== ch) : [...p, ch])

  const handleGenerate = async () => {
    const input = sourceType === "MANUAL" ? topic : sourceContent
    if (!input.trim()) return
    setGenerating(true)
    setGenLogs(Array.from({ length: count }, () => ({ step: "대기 중", done: false, error: false })))
    try {
      const res = await fetch("/api/content/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, keywords, tone, count, sourceType, sourceContent, startDate, frequency: freq, channels }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)

      const results: IScheduleItem[] = data.results.map((r: any, i: number) => {
        setGenLogs(p => p.map((l, idx) => idx === i ? { ...l, step: "완료", done: true } : l))
        return {
          id: r.dbId || `${Date.now()}-${i}`,
          index: r.index || i + 1,
          topic: r.topic || topic,
          angle: r.angle || "일반",
          date: dates[i],
          status: "draft" as const,
          content: r.content,
          channels,
          dbId: r.dbId,
        }
      })
      setSchedule(results)
      if (results[0]) { setActiveItem(results[0]); setActiveChannel(channels[0]) }
      setTimeout(() => { setGenerating(false); setNav("schedule") }, 500)
    } catch (e) {
      const msg = e instanceof Error && e.message ? e.message.slice(0, 60) : "오류 발생"
      setGenLogs(p => p.map(l => ({ ...l, error: true, step: msg })))
      setGenerating(false)
    }
  }

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
        body: JSON.stringify({ channels: item.channels, payload, dbId: (item as any).dbId }),
      })
      const data = await res.json()
      setPublishResults(data.summary || [])
    } finally { setPublishing(false) }
  }

  const copy = (key: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

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
    } finally { setDiagLoading(false) }
  }

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────

  const navItems: { id: TNav; label: string; icon: string }[] = [
    { id: "create",   label: "콘텐츠 생성", icon: "✦" },
    { id: "schedule", label: "발행 일정",    icon: "▦" },
    { id: "storage",  label: "보관함",       icon: "○" },
    { id: "settings", label: "설정",         icon: "◈" },
    { id: "admin",    label: "진단",         icon: "⊙" },
  ]

  return (
    <div className="sfa-shell">

      {/* ── 사이드바 ── */}
      <aside className="sfa-sidebar">
        <button
          className="sfa-sidebar-logo"
          onClick={() => setNav("home")}
          style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 20px 20px", borderBottom: "1px solid var(--border-light)", marginBottom: 12, background: "none", border: "none", cursor: "pointer", textAlign: "left", width: "100%" }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: "linear-gradient(135deg, #1B64DA 0%, #3182F6 100%)", color: "#fff", fontSize: 11, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", letterSpacing: -0.5, flexShrink: 0 }}>SF</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 13, color: "var(--text-primary)", letterSpacing: -0.3 }}>SNS FLOW</div>
            <div style={{ fontSize: 9, color: "var(--text-tertiary)", fontWeight: 700, letterSpacing: 2 }}>AUTO</div>
          </div>
        </button>

        <nav style={{ flex: 1, padding: "0 8px", display: "flex", flexDirection: "column", gap: 2 }}>
          {navItems.map(item => (
            <button key={item.id}
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                borderRadius: "var(--radius-sm)", border: "none",
                background: nav === item.id ? "var(--toss-blue-light)" : "transparent",
                fontSize: 13, color: nav === item.id ? "var(--toss-blue)" : "var(--text-secondary)",
                cursor: "pointer", textAlign: "left", fontWeight: nav === item.id ? 700 : 500,
                transition: "all 0.15s",
              }}
              onClick={() => setNav(item.id)}>
              <span style={{ fontSize: 11, opacity: 0.7, width: 14, textAlign: "center" }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sfa-sidebar-stats" style={{ padding: "16px 20px 0", borderTop: "1px solid var(--border-light)", display: "flex", gap: 12 }}>
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)" }}>{dbItems.length || schedule.length}</div>
            <div style={{ fontSize: 10, color: "var(--text-tertiary)", marginTop: 2 }}>총 콘텐츠</div>
          </div>
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: "var(--success)" }}>{dbItems.filter(s => s.status === "published").length || schedule.filter(s => s.status === "published").length}</div>
            <div style={{ fontSize: 10, color: "var(--text-tertiary)", marginTop: 2 }}>게시 완료</div>
          </div>
        </div>
      </aside>

      {/* ── 메인 ── */}
      <main className="sfa-main">
        <div className="sfa-content">

          {/* ══ 홈 ══ */}
          {nav === "home" && (
            <div style={{ maxWidth: 840 }}>

              {/* 헤더 */}
              <div style={{ marginBottom: 28 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg, #1B64DA 0%, #3182F6 100%)", color: "#fff", fontSize: 15, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>SF</div>
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", letterSpacing: -0.5 }}>SNS FLOW AUTO</div>
                    <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2 }}>AI 기반 SNS 콘텐츠 자동화 플랫폼</div>
                  </div>
                </div>
                <div style={{ padding: "16px 20px", background: "var(--toss-blue-light)", borderRadius: "var(--radius-md)", fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.8, borderLeft: "3px solid var(--toss-blue)" }}>
                  주제 하나만 입력하면 <strong style={{ color: "var(--text-primary)" }}>블로그 · 뉴스 · 인스타그램 · 스레드 · 카카오</strong> 5개 채널용 콘텐츠를 Claude AI가 동시에 작성해요.<br />
                  채널별로 내용을 복사하거나, 연동된 채널엔 자동 발행까지 한 번에 처리할 수 있어요.
                </div>
              </div>

              {/* 통계 */}
              <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 28 }}>
                {[
                  { label: "총 생성", value: dbItems.length, color: "var(--toss-blue)" },
                  { label: "게시 완료", value: dbItems.filter(i => i.status === "published").length, color: "var(--success)" },
                  { label: "임시저장", value: dbItems.filter(i => i.status === "draft").length, color: "var(--warning)" },
                ].map(s => (
                  <div key={s.label} className="card" style={{ textAlign: "center", padding: "20px 12px", marginBottom: 0 }}>
                    <div style={{ fontSize: 28, fontWeight: 800, color: s.color, letterSpacing: -0.5 }}>{s.value}</div>
                    <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 4 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* 3단계 사용법 */}
              <div className="card" style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 16 }}>시작하는 방법</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                  {[
                    { step: 1, title: "주제 입력",       desc: "생성 탭 → 주제·키워드·톤 설정 후\n자동화 시작 클릭",           action: "create" as TNav },
                    { step: 2, title: "내용 확인 · 복사", desc: "발행 일정 탭에서\n채널별 탭을 클릭하고 복사",               action: "schedule" as TNav },
                    { step: 3, title: "SNS에 붙여넣기",   desc: "복사한 내용을 각 SNS에 직접 게시\n(연동 시 자동 발행 가능)", action: "storage" as TNav },
                  ].map(s => (
                    <button key={s.step} onClick={() => setNav(s.action)}
                      style={{ textAlign: "left", padding: 16, background: "var(--bg)", border: "1px solid var(--border-light)", borderRadius: "var(--radius-md)", cursor: "pointer", transition: "all 0.15s" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <div style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--toss-blue)", color: "#fff", fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{s.step}</div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{s.title}</span>
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.7, whiteSpace: "pre-line" }}>{s.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 채널별 발행 설명 */}
              <div className="card" style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: showChannelGuide ? 14 : 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>채널별 발행 방법</div>
                  <button className="btn-ghost" onClick={() => setShowChannelGuide(v => !v)} style={{ fontSize: 12 }}>
                    {showChannelGuide ? "접기" : "전체 보기"}
                  </button>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: showChannelGuide ? 14 : 0 }}>
                  {[
                    { ch: "AI 글 생성",       ok: true,  status: "지금 바로 가능" },
                    { ch: "복사 붙여넣기",     ok: true,  status: "지금 바로 가능" },
                    { ch: "페이플레이 블로그", ok: false, status: "연동 준비 중" },
                    { ch: "인스타·스레드",     ok: false, status: "Meta 심사 필요" },
                    { ch: "카카오 채널",       ok: false, status: "API 심사 필요" },
                    { ch: "당근·밴드·페이스북",ok: false, status: "미연동" },
                  ].map(it => (
                    <div key={it.ch} style={{ padding: "8px 12px", background: "var(--bg)", borderRadius: "var(--radius-sm)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>{it.ch}</span>
                      <span className={`badge ${it.ok ? "badge-green" : "badge-gray"}`}>{it.status}</span>
                    </div>
                  ))}
                </div>

                {showChannelGuide && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {[
                      { name: "네이버 블로그",       status: "복사 후 직접 게시", ok: false, simple: "한국에서 제일 많이 쓰는 블로그예요. 네이버 검색에 내 글이 노출돼요.", process: ["AI가 블로그 글을 완성해요", "발행 일정에서 '네이버 블로그' 탭 클릭", "'복사하기' 버튼 눌러 내용 복사", "blog.naver.com 에서 새 글 쓰기 → 붙여넣기 → 발행"], tip: "SEO 키워드가 자동으로 들어가서 검색에 더 잘 노출돼요." },
                      { name: "홈페이지 뉴스",         status: "연동 준비 중",     ok: false, simple: "가게 홈페이지에 뉴스처럼 소식을 올릴 수 있어요.", process: ["AI가 뉴스 기사 형식으로 글을 써요", "홈페이지 API 연결 후 자동 발행 예정", "현재는 복사해서 홈페이지에 직접 붙여넣기"], tip: "역피라미드 기사 형식으로 써줘서 전문적으로 보여요." },
                      { name: "인스타그램",             status: "Meta 심사 필요",  ok: false, simple: "사진과 이모지·해시태그가 가득한 글을 올리는 SNS예요. 젊은 고객들이 많이 봐요.", process: ["AI가 이모지+해시태그 포함 인스타 글을 써요", "복사하기로 내용 복사", "인스타그램 앱에서 새 게시물 → 붙여넣기 → 게시", "(자동 발행) Meta 개발자 계정 + 앱 심사 통과 후 가능"], tip: "Meta 앱 심사는 수일~수주 소요돼요. 당장은 복사 방식이 편해요." },
                      { name: "스레드 (Threads)",        status: "Meta 심사 필요",  ok: false, simple: "인스타그램이 만든 짧은 글 SNS예요. 트위터처럼 텍스트 위주로 소통해요.", process: ["AI가 핵심만 담은 짧은 스레드 글을 써요", "복사해서 Threads 앱에 붙여넣기", "자동 발행은 인스타그램과 동일하게 Meta 심사 후 가능"], tip: "500자 이내로 핵심만 담아줘요." },
                      { name: "카카오 채널",             status: "채널 연동 필요",  ok: false, simple: "카카오톡으로 단골 고객에게 알림을 보내는 기능이에요. 가게 소식이 카톡으로 바로 전달돼요.", process: ["AI가 친근한 카카오 채널 메시지를 써요", "복사해서 카카오 채널 관리자 센터에 붙여넣기", "(자동 발행) business.kakao.com 채널 개설 + API 심사 후"], tip: "카카오 채널 자동 발행은 사업자 인증 + 3~7일 심사가 필요해요." },
                      { name: "페이플레이 블로그·언론보도", status: "연동 중 (곧 가능)", ok: true, simple: "페이플레이 홈페이지에 글이 올라가요. 홈페이지 방문자들이 볼 수 있어요.", process: ["AI가 블로그 글과 뉴스 형식 글을 써요", "자동 발행 클릭 시 페이플레이 홈페이지에 바로 게시", "현재 홈페이지 API 연결 작업 진행 중이에요"], tip: "곧 자동 발행이 가능해질 예정이에요!" },
                    ].map(ch => (
                      <div key={ch.name} style={{ border: "1px solid var(--border-light)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
                        <div style={{ padding: "10px 14px", background: ch.ok ? "#E6F9F2" : "var(--bg)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text-primary)" }}>{ch.name}</div>
                          <span className={`badge ${ch.ok ? "badge-green" : "badge-red"}`}>{ch.status}</span>
                        </div>
                        <div style={{ padding: "12px 14px" }}>
                          <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 8, lineHeight: 1.6 }}>{ch.simple}</div>
                          <div style={{ fontSize: 12, color: "var(--text-tertiary)", lineHeight: 2 }}>
                            {ch.process.map((step, i) => <div key={i}>{i + 1}. {step}</div>)}
                          </div>
                          <div style={{ marginTop: 8, fontSize: 12, color: "var(--text-secondary)", background: "var(--bg)", padding: "6px 10px", borderRadius: 6 }}>{ch.tip}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 자세한 사용 방법 */}
              <div className="card" style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>자세한 사용 방법</div>
                  <button className="btn-ghost" onClick={() => setShowMoreGuide(v => !v)} style={{ fontSize: 12 }}>
                    {showMoreGuide ? "접기" : "더보기"}
                  </button>
                </div>
                {showMoreGuide && (
                  <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                    {[
                      { step: "STEP 1", title: "콘텐츠 생성 탭으로 이동", content: ["왼쪽 사이드바에서 '콘텐츠 생성'을 클릭하세요.", "콘텐츠 소스 선택: 주제를 직접 입력하거나, URL에서 추출하거나, 자료를 붙여넣을 수 있어요.", "주제 입력: '여름 매출 올리는 소상공인 마케팅 전략' 처럼 구체적으로 쓸수록 좋아요.", "키워드: '여름, 할인, 이벤트' 처럼 포함되길 원하는 단어를 쉼표로 구분해 넣으세요.", "톤 설정: 친근하게(일반 고객용), 전문적으로(B2B), 감성적으로(스토리텔링) 중 선택."] },
                      { step: "STEP 2", title: "발행 채널 선택",             content: ["오른쪽 '발행 채널' 카드에서 올릴 채널을 켜고 끄세요.", "ON 표시된 채널만 글이 생성됩니다.", "처음엔 '네이버 블로그 + 인스타그램 + 스레드' 3개만 켜놓고 해보세요.", "발행 주기와 시작일을 설정하면 날짜별로 예약 일정이 잡혀요."] },
                      { step: "STEP 3", title: "자동화 시작 클릭",           content: ["오른쪽 하단 '자동화 시작' 버튼을 누르세요.", "AI가 채널별로 글을 쓰는 동안 진행 상황이 실시간으로 표시돼요.", "보통 1편당 10~30초 정도 걸려요.", "글이 완성되면 자동으로 '발행 일정' 탭으로 이동해요."] },
                      { step: "STEP 4", title: "발행 일정 탭에서 내용 확인", content: ["왼쪽 목록에서 편 번호를 클릭하면 상세 내용이 오른쪽에 나타나요.", "상단 탭(네이버 블로그, 인스타그램...)을 클릭해 채널별 내용을 확인하세요.", "내용이 마음에 안 들면 텍스트를 직접 수정할 수 있어요.", "인스타그램 탭에는 해시태그가 분리되어 표시돼요."] },
                      { step: "STEP 5", title: "복사 → SNS에 붙여넣기",     content: ["'복사하기' 버튼을 누르면 내용이 클립보드에 복사돼요.", "네이버 블로그: blog.naver.com → 글쓰기 → 붙여넣기", "인스타그램: 앱 열기 → + 버튼 → 사진 선택 → 내용 붙여넣기", "스레드: 앱 열기 → 새 게시물 → 붙여넣기", "카카오: 카카오 채널 관리자 센터 → 메시지 발송 → 붙여넣기"] },
                    ].map((s, i) => (
                      <div key={i} style={{ background: "var(--bg)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
                        <div style={{ background: "var(--text-primary)", color: "#fff", padding: "7px 14px", fontSize: 11, fontWeight: 800, letterSpacing: 1 }}>{s.step}</div>
                        <div style={{ padding: "12px 14px" }}>
                          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: "var(--text-primary)" }}>{s.title}</div>
                          {s.content.map((line, j) => (
                            <div key={j} style={{ fontSize: 13, color: j === 0 ? "var(--text-primary)" : "var(--text-secondary)", lineHeight: 1.8, paddingLeft: j > 0 ? 8 : 0 }}>
                              {j > 0 ? "· " : ""}{line}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 현재 제한사항 */}
              <div className="card" style={{ background: "#FFFBEB", borderColor: "#FDE68A" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#92400E", marginBottom: 10 }}>현재 알려진 제한사항</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, color: "#78350F" }}>
                  <div>· <strong>생성 비용:</strong> Claude API 사용량만큼 과금됩니다. 생성 1회 ≈ $0.01~0.03</div>
                  <div>· <strong>히스토리 저장:</strong> 배포 서버에서는 DB 설정 전까지 저장되지 않습니다</div>
                  <div>· <strong>자동 발행:</strong> 현재 대부분 채널은 소재 보관함 저장 모드입니다. 직접 복사해서 게시하세요</div>
                </div>
              </div>

              {/* CTA */}
              <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                <button onClick={() => setNav("create")} className="btn btn-primary btn-full" style={{ flex: 2 }}>지금 바로 콘텐츠 만들기</button>
                <button onClick={() => setNav("admin")} className="btn btn-secondary btn-full" style={{ flex: 1 }}>시스템 진단</button>
              </div>
            </div>
          )}

          {/* ══ 생성 ══ */}
          {nav === "create" && !generating && (
            <>
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", letterSpacing: -0.5 }}>콘텐츠 자동화</div>
                <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>최소 정보 입력 → 블로그부터 SNS까지 자동 생성·발행</div>
              </div>

              <div className="sfa-create-grid">
                {/* 왼쪽 */}
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                  {/* 콘텐츠 소스 */}
                  <div className="card">
                    <SectionLabel>콘텐츠 소스</SectionLabel>
                    <div className="source-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      {SOURCE_OPTIONS.map(s => (
                        <button key={s.id}
                          style={{ padding: "12px 14px", border: `1.5px solid ${sourceType === s.id ? "var(--toss-blue)" : "var(--border)"}`, borderRadius: "var(--radius-sm)", background: sourceType === s.id ? "var(--toss-blue-light)" : "var(--bg-card)", cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}
                          onClick={() => setSourceType(s.id)}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: sourceType === s.id ? "var(--toss-blue)" : "var(--text-primary)", marginBottom: 3 }}>{s.label}</div>
                          <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{s.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 입력 영역 */}
                  <div className="card">
                    <SectionLabel>{sourceType === "URL" ? "URL 입력" : sourceType === "FILE" ? "자료 붙여넣기 (드래그앤드롭 가능)" : "주제 입력"}</SectionLabel>

                    {/* URL 모드 */}
                    {sourceType === "URL" && (
                      <>
                        <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                          <input className="form-input" placeholder="https://..." value={sourceContent} onChange={e => setSourceContent(e.target.value)} style={{ flex: 1 }} />
                          <button onClick={handleSaveURL} className="btn btn-secondary btn-sm" style={{ whiteSpace: "nowrap" }}>저장</button>
                        </div>
                        {savedURLs.length > 0 && (
                          <div>
                            <div className="form-label">저장된 URL</div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                              {savedURLs.map(u => (
                                <div key={u.id} style={{ display: "flex", alignItems: "center", background: "var(--toss-blue-light)", borderRadius: 6, overflow: "hidden" }}>
                                  <button onClick={() => handleSelectURL(u)} style={{ padding: "4px 8px", background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "var(--toss-blue)", fontWeight: 600 }}>{u.label.slice(0, 25)}</button>
                                  <button onClick={() => handleDeleteURL(u.id)} className="btn-danger-ghost" style={{ padding: "2px 6px" }}>×</button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {/* 자료 모드 */}
                    {sourceType === "FILE" && (
                      <>
                        <div
                          onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
                          onDragLeave={() => setIsDragging(false)}
                          onDrop={handleDrop}
                          style={{ position: "relative" }}>
                          <textarea
                            ref={fileDropRef}
                            className="form-input"
                            style={{ border: isDragging ? "1.5px dashed var(--toss-blue)" : undefined, background: isDragging ? "var(--toss-blue-light)" : undefined, minHeight: 120 }}
                            placeholder="여기에 텍스트를 붙여넣거나, 파일을 드래그해서 놓으세요..."
                            value={sourceContent} onChange={e => setSourceContent(e.target.value)} />
                          {isDragging && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", fontSize: 14, fontWeight: 700, color: "var(--toss-blue)" }}>여기에 놓으세요</div>}
                        </div>
                        <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                          <button onClick={handleSaveMaterial} className="btn btn-secondary btn-sm">자료 저장</button>
                          {savedMaterials.map(m => (
                            <div key={m.id} style={{ display: "flex", alignItems: "center", background: "var(--bg)", borderRadius: 6, overflow: "hidden", border: "1px solid var(--border)" }}>
                              <button onClick={() => handleSelectMaterial(m)} style={{ padding: "4px 8px", background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "var(--text-secondary)", fontWeight: 600 }}>{m.label}</button>
                              <button onClick={() => handleDeleteMaterial(m.id)} className="btn-danger-ghost" style={{ padding: "2px 6px" }}>×</button>
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    {/* 직접입력 / 다각화 모드 */}
                    {(sourceType === "MANUAL" || sourceType === "DIVERSIFIED") && (
                      <>
                        <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                          <input className="form-input" style={{ flex: 1 }}
                            placeholder="예) 여름 매출 올리는 소상공인 마케팅 전략" value={topic} onChange={e => setTopic(e.target.value)} />
                          <button onClick={handleSaveTopic} disabled={!topic.trim()} className="btn btn-secondary btn-sm" style={{ whiteSpace: "nowrap" }}>저장</button>
                        </div>
                        {savedTopics.length > 0 && (
                          <div style={{ marginBottom: 10 }}>
                            <div className="form-label">저장된 주제</div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                              {savedTopics.map(t => (
                                <div key={t.id} style={{ display: "flex", alignItems: "center", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 6, overflow: "hidden" }}>
                                  <button onClick={() => handleSelectTopic(t)} style={{ padding: "4px 8px", background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "var(--text-secondary)", fontWeight: 600, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.text}</button>
                                  <button onClick={() => handleDeleteTopic(t.id)} className="btn-danger-ghost" style={{ padding: "2px 6px" }}>×</button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        <input className="form-input"
                          placeholder="키워드 (쉼표로 구분, 선택사항)" value={keywords} onChange={e => setKeywords(e.target.value)} />
                      </>
                    )}

                    {/* 톤 & 매너 */}
                    <div style={{ marginTop: 16 }}>
                      <SectionLabel>톤 & 매너</SectionLabel>
                      <div style={{ display: "flex", gap: 8 }}>
                        {TONE_OPTIONS.map(t => (
                          <button key={t.id}
                            style={{ flex: 1, padding: "10px 8px", border: `1.5px solid ${tone === t.id ? "var(--toss-blue)" : "var(--border)"}`, borderRadius: "var(--radius-sm)", background: tone === t.id ? "var(--toss-blue-light)" : "var(--bg-card)", cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}
                            onClick={() => setTone(t.id)}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: tone === t.id ? "var(--toss-blue)" : "var(--text-primary)" }}>{t.label}</div>
                            <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 2 }}>{t.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 이미지 생성 방식 */}
                  <div className="card">
                    <SectionLabel>이미지 생성 방식</SectionLabel>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      {IMAGE_ENGINES.map(e => (
                        <button key={e.id}
                          style={{ padding: "12px 14px", border: `1.5px solid ${imageEngine === e.id ? "var(--toss-blue)" : "var(--border)"}`, borderRadius: "var(--radius-sm)", background: imageEngine === e.id ? "var(--toss-blue-light)" : "var(--bg-card)", cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}
                          onClick={() => setImageEngine(e.id)}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: imageEngine === e.id ? "var(--toss-blue)" : "var(--text-primary)", marginBottom: 3 }}>{e.label}</div>
                          <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{e.desc}</div>
                        </button>
                      ))}
                    </div>
                    {imageEngine === "canva" && (
                      <input className="form-input" style={{ marginTop: 10 }}
                        placeholder="캔바 API Key" value={canvaKey} onChange={e => setCanvaKey(e.target.value)} />
                    )}
                  </div>
                </div>

                {/* 오른쪽 */}
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                  {/* 발행 일정 */}
                  <div className="card">
                    <SectionLabel>발행 일정</SectionLabel>
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      <div>
                        <div className="form-label">수량</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <button className="btn btn-secondary" style={{ width: 32, height: 32, padding: 0, fontSize: 18 }} onClick={() => setCount(c => Math.max(1, c - 1))}>−</button>
                          <span style={{ fontWeight: 700, fontSize: 16, minWidth: 36, textAlign: "center", color: "var(--text-primary)" }}>{count}편</span>
                          <button className="btn btn-secondary" style={{ width: 32, height: 32, padding: 0, fontSize: 18 }} onClick={() => setCount(c => Math.min(12, c + 1))}>+</button>
                        </div>
                      </div>
                      <div>
                        <div className="form-label">발행 주기</div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {FREQ_OPTIONS.map(f => (
                            <button key={f.id}
                              style={{ padding: "6px 12px", borderRadius: "var(--radius-sm)", border: "none", background: freq === f.id ? "var(--toss-blue)" : "var(--bg)", color: freq === f.id ? "#fff" : "var(--text-secondary)", fontSize: 12.5, fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}
                              onClick={() => setFreq(f.id)}>{f.label}</button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="form-label">시작일</div>
                        <input type="date" className="form-input"
                          value={startDate} onChange={e => setStartDate(e.target.value)} />
                      </div>
                      <div>
                        <div className="form-label">마감일 — 언제까지? (선택)</div>
                        <input type="date" className="form-input"
                          style={scheduleDeadline ? { borderColor: "var(--warning)" } : undefined}
                          value={scheduleDeadline} onChange={e => setScheduleDeadline(e.target.value)} min={startDate} />
                        {scheduleDeadline && (
                          <div style={{ marginTop: 6, padding: "6px 10px", background: "#FFF4E0", borderRadius: "var(--radius-sm)", fontSize: 12, color: "var(--warning)", fontWeight: 600 }}>
                            {startDate} ~ {scheduleDeadline} 사이 {count}편 발행
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 14 }}>
                      {dates.map((d, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 4, background: "var(--toss-blue-light)", border: "1px solid #BFDBFE", borderRadius: 20, padding: "4px 10px", fontSize: 12, color: "var(--toss-blue)" }}>
                          <span style={{ fontWeight: 800, fontSize: 11, background: "var(--toss-blue)", color: "#fff", borderRadius: 10, width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>{i + 1}</span>
                          {fmtDate(d)}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 발행 채널 */}
                  <div className="card">
                    <SectionLabel>발행 채널</SectionLabel>
                    <div className="channel-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                      {ALL_CHANNELS.map(ch => {
                        const m = CHANNEL_META[ch]; const on = channels.includes(ch)
                        return (
                          <button key={ch}
                            style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", border: `1.5px solid ${on ? m.color : "var(--border)"}`, borderRadius: "var(--radius-sm)", background: on ? "#fff" : "var(--bg)", cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}
                            onClick={() => toggleCh(ch)}>
                            <div className="status-dot" style={{ background: on ? m.color : "var(--border)" }} />
                            <span style={{ flex: 1, fontSize: 11.5, fontWeight: 500, color: on ? "var(--text-primary)" : "var(--text-tertiary)" }}>{m.label}</span>
                            {on && <span style={{ fontSize: 10, color: "#fff", background: m.color, padding: "1px 5px", borderRadius: 4, fontWeight: 700 }}>ON</span>}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* 자동화 요약 */}
                  <div className="card">
                    <SectionLabel>자동화 요약</SectionLabel>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
                      {[
                        ["소스", { MANUAL: "직접 입력", DIVERSIFIED: "주제 다각화", URL: "URL 추출", FILE: "자료 기반" }[sourceType]],
                        ["수량", `${count}편`],
                        ["주기", { daily: "매일", weekly: "매주", biweekly: "격주", monthly: "매월" }[freq]],
                        ["채널", `${channels.length}개`],
                        ["총 생성", `${count * channels.length}개`],
                      ].map(([k, v]) => (
                        <div key={k as string} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                          <span style={{ color: "var(--text-tertiary)" }}>{k}</span>
                          <span style={{ fontWeight: 700, color: k === "총 생성" ? "var(--toss-blue)" : "var(--text-primary)", fontSize: k === "총 생성" ? 16 : 13 }}>{v}</span>
                        </div>
                      ))}
                    </div>
                    <PrimaryBtn onClick={handleGenerate} disabled={!topic && sourceType === "MANUAL"}>자동화 시작</PrimaryBtn>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ══ 생성 중 ══ */}
          {generating && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
              <div className="card" style={{ width: 480, textAlign: "center" }}>
                <div style={{ width: 44, height: 44, border: "3px solid var(--border)", borderTopColor: "var(--toss-blue)", borderRadius: "50%", margin: "0 auto 20px", animation: "spin 0.8s linear infinite" }} />
                <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6, color: "var(--text-primary)" }}>AI가 콘텐츠를 생성 중이에요</div>
                <div style={{ fontSize: 13, color: "var(--text-tertiary)", marginBottom: 24 }}>{count}편 × {channels.length}채널 = {count * channels.length}개 콘텐츠</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {genLogs.map((l, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "var(--bg)", borderRadius: "var(--radius-sm)" }}>
                      <div className="status-dot" style={{ background: l.done ? "var(--success)" : l.error ? "var(--danger)" : "var(--toss-blue)", animation: !l.done && !l.error ? "pulse 1.2s infinite" : undefined }} />
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 600, textAlign: "left", color: "var(--text-primary)" }}>{topic || "주제"} {i + 1}편</span>
                      <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{l.step}</span>
                      <span style={{ fontSize: 12 }}>{l.done ? "✓" : l.error ? "✗" : "…"}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ══ 일정 ══ */}
          {nav === "schedule" && (() => {
            const displayItems = dbItems.length > 0 ? dbItems : schedule
            return (
              <>
                <div style={{ marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", letterSpacing: -0.5 }}>발행 일정</div>
                    <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>채널별 콘텐츠 검토 · 편집 · 복사 · 자동 발행</div>
                  </div>
                  <button onClick={loadHistory} className="btn btn-secondary btn-sm">{dbLoading ? "로딩 중..." : "새로고침"}</button>
                </div>

                {displayItems.length === 0 ? (
                  <div className="card" style={{ textAlign: "center", padding: 60 }}>
                    <div style={{ fontSize: 28, color: "var(--border)", marginBottom: 12 }}>◈</div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-tertiary)", marginBottom: 16 }}>생성된 일정이 없어요</div>
                    <button className="btn btn-secondary" onClick={() => setNav("create")}>콘텐츠 생성하기</button>
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 16 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {displayItems.map(item => {
                        const st = STATUS_STYLE[item.status as keyof typeof STATUS_STYLE] || STATUS_STYLE.draft
                        return (
                          <button key={item.id}
                            style={{ background: "var(--bg-card)", border: `1.5px solid ${activeItem?.id === item.id ? "var(--toss-blue)" : "var(--border-light)"}`, borderRadius: "var(--radius-md)", padding: "12px 14px", cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}
                            onClick={() => { setActiveItem(item); setActiveChannel(item.channels[0] || "INSTAGRAM"); setPublishResults([]) }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)" }}>{item.index}편</span>
                              <span className={`badge ${st.cls}`}>{st.label}</span>
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.4, marginBottom: 6 }}>{item.topic}</div>
                            <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 6 }}>{fmtDate(item.date)} · {item.angle}</div>
                            <div style={{ display: "flex", gap: 3 }}>
                              {item.channels.map(ch => <div key={ch} className="status-dot" style={{ background: CHANNEL_META[ch as TChannel]?.color || "var(--border)" }} />)}
                            </div>
                          </button>
                        )
                      })}
                    </div>

                    {activeItem && (
                      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                        <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--border-light)" }}>
                          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>{activeItem.topic}</div>
                          <div style={{ fontSize: 13, color: "var(--text-tertiary)" }}>{fmtDate(activeItem.date)} · {activeItem.angle}</div>
                        </div>
                        <div style={{ display: "flex", borderBottom: "1px solid var(--border-light)", padding: "0 22px", overflowX: "auto" }}>
                          {activeItem.channels.map(ch => {
                            const m = CHANNEL_META[ch as TChannel]
                            if (!m) return null
                            return (
                              <button key={ch}
                                style={{ padding: "11px 12px", border: "none", borderBottom: `2px solid ${activeChannel === ch ? m.color : "transparent"}`, background: "transparent", fontSize: 12, fontWeight: activeChannel === ch ? 700 : 500, color: activeChannel === ch ? m.color : "var(--text-tertiary)", cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.15s" }}
                                onClick={() => setActiveChannel(ch as TChannel)}>
                                {m.label}
                              </button>
                            )
                          })}
                        </div>
                        <div style={{ padding: 22 }}>
                          {activeItem.content ? (
                            <>
                              <div style={{ background: "var(--bg)", borderRadius: "var(--radius-sm)", padding: 14, lineHeight: 1.8, fontSize: 13, color: "var(--text-primary)", whiteSpace: "pre-wrap", marginBottom: 14, maxHeight: 300, overflowY: "auto" }}>
                                {getChannelText(activeItem, activeChannel)}
                              </div>
                              {activeChannel === "INSTAGRAM" && (
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 14 }}>
                                  {activeItem.content.instagram.hashtags.map(h => (
                                    <span key={h} style={{ background: "var(--toss-blue-light)", color: "var(--toss-blue)", borderRadius: 20, padding: "3px 10px", fontSize: 12, fontWeight: 600 }}>{h}</span>
                                  ))}
                                </div>
                              )}
                              <div style={{ display: "flex", gap: 8, paddingTop: 14, borderTop: "1px solid var(--border-light)" }}>
                                <button className="btn btn-secondary" onClick={() => copy(activeItem.id + activeChannel, getChannelText(activeItem, activeChannel))}>
                                  {copied === activeItem.id + activeChannel ? "복사됨 ✓" : "복사하기"}
                                </button>
                                <button className="btn btn-primary" onClick={() => handlePublish(activeItem)} disabled={publishing}>
                                  {publishing ? "발행 중..." : "자동 발행"}
                                </button>
                              </div>
                              {publishResults.length > 0 && (
                                <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 6 }}>
                                  {publishResults.map((r: any) => (
                                    <div key={r.channel} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, padding: "8px 12px", background: "var(--bg)", borderRadius: "var(--radius-sm)" }}>
                                      <div className="status-dot" style={{ background: r.success ? "var(--success)" : r.fallback ? "var(--warning)" : "var(--danger)" }} />
                                      <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{CHANNEL_META[r.channel as TChannel]?.label}</span>
                                      <span style={{ color: "var(--text-tertiary)", marginLeft: "auto", fontSize: 12 }}>{r.success ? "발행 완료" : r.fallback ? "보관함 저장" : "실패"}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </>
                          ) : (
                            <div style={{ color: "var(--text-tertiary)", textAlign: "center", padding: 40, fontSize: 13 }}>콘텐츠를 생성해 주세요</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )
          })()}

          {/* ══ 보관함 ══ */}
          {nav === "storage" && (
            <>
              <div style={{ marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", letterSpacing: -0.5 }}>소재 보관함</div>
                  <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>생성된 전체 소재 · 원클릭 복사 · 발행 일정으로 이동</div>
                </div>
                <button onClick={loadHistory} className="btn btn-secondary btn-sm">{dbLoading ? "…" : "새로고침"}</button>
              </div>
              {(() => {
                const storageItems = dbItems.length > 0 ? dbItems : schedule
                return storageItems.length === 0 ? (
                  <div className="card" style={{ textAlign: "center", padding: 60 }}>
                    <div style={{ fontSize: 28, color: "var(--border)", marginBottom: 12 }}>○</div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-tertiary)" }}>저장된 소재가 없어요</div>
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
                    {storageItems.map(item => {
                      const st = STATUS_STYLE[item.status as keyof typeof STATUS_STYLE] || STATUS_STYLE.draft
                      return (
                        <div key={item.id} className="card" style={{ cursor: "pointer", padding: 16, marginBottom: 0, transition: "all 0.15s" }}
                          onClick={() => { setActiveItem(item); setActiveChannel(item.channels[0] || "INSTAGRAM"); setNav("schedule") }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                            <span className={`badge ${st.cls}`}>{st.label}</span>
                            <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{fmtDate(item.date)}</span>
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.4, marginBottom: 10 }}>{item.topic}</div>
                          <div style={{ display: "flex", gap: 3 }}>
                            {item.channels.map(ch => <div key={ch} className="status-dot" style={{ background: CHANNEL_META[ch as TChannel]?.color || "var(--border)" }} />)}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
            </>
          )}

          {/* ══ 설정 ══ */}
          {nav === "settings" && (
            <>
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", letterSpacing: -0.5 }}>브랜드 설정</div>
                <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>최대 5개 브랜드 저장 · 활성 브랜드가 AI 글쓰기에 자동 반영됩니다</div>
              </div>

              <div className="brand-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14, marginBottom: 24 }}>
                {brandProfiles.map(profile => (
                  <div key={profile.id} style={{ background: "var(--bg-card)", border: `2px solid ${activeBrandId === profile.id ? profile.color : "var(--border-light)"}`, borderRadius: "var(--radius-lg)", overflow: "hidden", transition: "border-color 0.15s", boxShadow: "var(--shadow-sm)" }}>
                    <div style={{ height: 4, background: profile.color }} />
                    <div style={{ padding: "14px 16px" }}>
                      {activeBrandId === profile.id && (
                        <div style={{ display: "inline-block", background: profile.color, color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, marginBottom: 8 }}>현재 사용 중</div>
                      )}
                      <div style={{ fontWeight: 800, fontSize: 15, color: "var(--text-primary)", marginBottom: 8 }}>
                        {profile.name || <span style={{ color: "var(--text-tertiary)", fontWeight: 400, fontSize: 13 }}>이름 없음 (편집해서 추가)</span>}
                      </div>
                      {profile.keywords && <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 3 }}>키워드: {profile.keywords}</div>}
                      {profile.hashtags && <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 3 }}>태그: {profile.hashtags}</div>}
                      {profile.blogUrl && <div style={{ fontSize: 11, color: "var(--toss-blue)", marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{profile.blogUrl}</div>}
                      {profile.note && <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 3 }}>{profile.note}</div>}
                      <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
                        {activeBrandId !== profile.id && (
                          <button onClick={() => switchBrand(profile.id)} style={{ flex: 1, padding: "7px 0", background: profile.color, color: "#fff", border: "none", borderRadius: "var(--radius-sm)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>이걸로 사용</button>
                        )}
                        <button
                          onClick={() => setEditingBrandId(editingBrandId === profile.id ? null : profile.id)}
                          style={{ flex: activeBrandId !== profile.id ? 1 : 2, padding: "7px 0", background: editingBrandId === profile.id ? "var(--text-primary)" : "var(--bg)", color: editingBrandId === profile.id ? "#fff" : "var(--text-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all 0.15s" }}>
                          {editingBrandId === profile.id ? "접기" : "편집"}
                        </button>
                      </div>
                    </div>
                    {editingBrandId === profile.id && (
                      <div style={{ borderTop: "1px solid var(--border-light)", padding: "14px 16px", background: "var(--bg)", display: "flex", flexDirection: "column", gap: 10 }}>
                        {([
                          { label: "브랜드명", key: "name", placeholder: "예) 페이플레이" },
                          { label: "자주 쓰는 키워드", key: "keywords", placeholder: "소상공인, 창업, 마케팅" },
                          { label: "고정 해시태그", key: "hashtags", placeholder: "#소상공인 #마케팅" },
                          { label: "블로그/채널 링크", key: "blogUrl", placeholder: "https://blog.naver.com/..." },
                          { label: "메모", key: "note", placeholder: "이 브랜드 관련 메모" },
                        ] as { label: string; key: keyof BrandProfile; placeholder: string }[]).map(f => (
                          <div key={String(f.key)}>
                            <div className="form-label">{f.label}</div>
                            <input className="form-input" placeholder={f.placeholder}
                              value={String(profile[f.key] || "")}
                              onChange={e => updateBrandProfile({ ...profile, [f.key]: e.target.value })} />
                          </div>
                        ))}
                        <div>
                          <div className="form-label">대표 컬러</div>
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <input type="color" style={{ width: 38, height: 38, border: "1.5px solid var(--border)", borderRadius: "var(--radius-sm)", cursor: "pointer", padding: 2 }}
                              value={profile.color}
                              onChange={e => updateBrandProfile({ ...profile, color: e.target.value })} />
                            <input className="form-input" placeholder="#111111" value={profile.color}
                              onChange={e => updateBrandProfile({ ...profile, color: e.target.value })} />
                            <div style={{ width: 38, height: 38, borderRadius: "var(--radius-sm)", background: profile.color, border: "1px solid var(--border)", flexShrink: 0 }} />
                          </div>
                        </div>
                        <button onClick={() => setEditingBrandId(null)} className="btn btn-primary btn-full">저장 완료</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="card" style={{ background: "var(--toss-blue-light)", borderColor: "#BFDBFE", maxWidth: 540 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--toss-blue)", marginBottom: 10 }}>브랜드 설정 활용 방법</div>
                <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 2 }}>
                  <div>· <strong>키워드</strong> — AI 글쓰기에 자동 반영 (쉼표로 구분)</div>
                  <div>· <strong>해시태그</strong> — 인스타·스레드 글에 자동 추가</div>
                  <div>· <strong>블로그 링크</strong> — 나중에 자동 발행 연동 시 사용</div>
                  <div>· <strong>5개 브랜드</strong> — 매장별·채널별로 저장해두고 전환해서 사용하세요</div>
                </div>
              </div>
            </>
          )}

          {/* ══ 진단 ══ */}
          {nav === "admin" && (
            <>
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", letterSpacing: -0.5 }}>관리자 진단</div>
                <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>오류 발생 시 Claude가 자동 분석 · 해결 코드 생성 · 관리자 전용</div>
              </div>
              <div className="card" style={{ maxWidth: 600 }}>
                <div className="form-field">
                  <div className="form-label">관리자 키</div>
                  <input type="password" className="form-input"
                    placeholder="SFA 관리자 키" value={adminKey} onChange={e => setAdminKey(e.target.value)} />
                </div>
                <div className="form-field">
                  <div className="form-label">오류 내용</div>
                  <textarea className="form-input" style={{ minHeight: 120 }}
                    placeholder="오류 메시지, 스택 트레이스 등 붙여넣기..." value={diagError} onChange={e => setDiagError(e.target.value)} />
                </div>
                <PrimaryBtn onClick={handleDiag} disabled={diagLoading || !diagError || !adminKey}>
                  {diagLoading ? "분석 중..." : "Claude 진단 요청"}
                </PrimaryBtn>
                {diagResult && (
                  <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ padding: 14, background: "#FFF4E0", borderRadius: "var(--radius-md)" }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--warning)", marginBottom: 6 }}>원인 분석</div>
                      <div style={{ fontSize: 13, color: "var(--text-primary)" }}>{diagResult.cause}</div>
                    </div>
                    <div style={{ padding: 14, background: "#E6F9F2", borderRadius: "var(--radius-md)" }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--success)", marginBottom: 6 }}>해결 방법</div>
                      <div style={{ fontSize: 13, color: "var(--text-primary)" }}>{diagResult.solution}</div>
                    </div>
                    {diagResult.fixedCode && (
                      <div style={{ padding: 14, background: "#1E1E2E", borderRadius: "var(--radius-md)" }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#A0AEC0", marginBottom: 8 }}>수정 코드</div>
                        <pre style={{ fontSize: 12, color: "#E2E8F0", overflow: "auto", margin: 0 }}>{diagResult.fixedCode}</pre>
                        <button className="btn btn-secondary btn-sm" style={{ marginTop: 10, background: "rgba(255,255,255,0.1)", color: "#E2E8F0", border: "1px solid rgba(255,255,255,0.2)" }}
                          onClick={() => copy("diag", diagResult.fixedCode)}>
                          {copied === "diag" ? "복사됨 ✓" : "코드 복사"}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

        </div>
      </main>

      {/* ── 우측 패널 ── */}
      <aside className="sfa-right-panel">
        <div>
          <div className="section-label">최근 생성</div>
          {dbItems.length === 0 ? (
            <div style={{ fontSize: 12, color: "var(--text-tertiary)", lineHeight: 1.7 }}>
              아직 생성된 콘텐츠가 없어요.<br/>주제를 입력해 시작해보세요.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {dbItems.slice(0, 5).map(item => {
                const st = STATUS_STYLE[item.status as keyof typeof STATUS_STYLE] || STATUS_STYLE.draft
                return (
                  <button key={item.id}
                    style={{ padding: "10px 12px", background: "var(--bg)", borderRadius: "var(--radius-sm)", border: "none", cursor: "pointer", textAlign: "left", width: "100%", transition: "all 0.15s" }}
                    onClick={() => { setActiveItem(item); setActiveChannel(item.channels[0] || "INSTAGRAM"); setNav("schedule") }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <span className={`badge ${st.cls}`}>{st.label}</span>
                      <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>{fmtDate(item.date)}</span>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.4, marginBottom: 4 }}>{item.topic}</div>
                    <div style={{ display: "flex", gap: 3 }}>
                      {item.channels.slice(0, 5).map(ch => (
                        <div key={ch} className="status-dot" style={{ background: CHANNEL_META[ch as TChannel]?.color || "var(--border)" }} />
                      ))}
                    </div>
                  </button>
                )
              })}
              <button className="btn-ghost" style={{ fontSize: 11, textAlign: "left", padding: "4px 0" }}
                onClick={() => { loadHistory(); setNav("storage") }}>
                전체 보기
              </button>
            </div>
          )}
        </div>

        <div>
          <div className="section-label">채널 현황</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[
              { title: "AI 자동 생성",     desc: "주제만 입력하면 5채널 동시 생성", ok: true },
              { title: "이미지 생성",       desc: "SVG 브랜드 카드 즉시 생성 가능",  ok: true },
              { title: "복사 발행",         desc: "채널탭에서 내용 복사 후 직접 게시", ok: true },
              { title: "페이플레이 발행",   desc: "홈페이지 API 연결 시 자동 발행",   ok: false },
              { title: "카카오 채널",       desc: "카카오 채널 + API 심사 필요",       ok: false },
              { title: "Instagram / Threads", desc: "Meta 앱 심사 필요",            ok: false },
            ].map(tip => (
              <div key={tip.title} style={{ padding: "9px 12px", background: tip.ok ? "#E6F9F2" : "var(--bg)", borderRadius: "var(--radius-sm)", borderLeft: `3px solid ${tip.ok ? "var(--success)" : "var(--border)"}` }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", marginBottom: 2 }}>
                  {tip.title}
                  <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 600, color: tip.ok ? "var(--success)" : "var(--text-tertiary)" }}>{tip.ok ? "가능" : "미연동"}</span>
                </div>
                <div style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.5 }}>{tip.desc}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: "auto", paddingTop: 16, borderTop: "1px solid var(--border-light)" }}>
          <button className="btn btn-secondary btn-full" onClick={() => setNav("admin")}>관리자 진단</button>
        </div>
      </aside>
    </div>
  )
}
