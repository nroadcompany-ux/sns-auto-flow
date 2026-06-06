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
  draft:     { label: "임시저장", color: "#6b7280", bg: "#f3f4f6" },
  scheduled: { label: "예약됨",   color: "#d97706", bg: "#fef3c7" },
  published: { label: "게시완료", color: "#059669", bg: "#d1fae5" },
  failed:    { label: "실패",     color: "#dc2626", bg: "#fee2e2" },
}

type TNav = "home" | "create" | "schedule" | "storage" | "settings" | "admin"

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

  // ── localStorage 저장 데이터 ──────────────────────────────
  const [savedTopics, setSavedTopics]       = useState<SavedTopic[]>([])
  const [savedURLs, setSavedURLs]           = useState<SavedURL[]>([])
  const [savedMaterials, setSavedMaterials] = useState<SavedMaterial[]>([])
  const [brandProfiles, setBrandProfiles]   = useState<BrandProfile[]>(DEFAULT_BRANDS)
  const [activeBrandId, setActiveBrandIdState] = useState<string>("b1")

  // ── UI 상태 ──────────────────────────────────────────────
  const [isDragging, setIsDragging]         = useState(false)
  const [showChannelGuide, setShowChannelGuide] = useState(false)
  const [showMoreGuide, setShowMoreGuide]   = useState(false)
  const [scheduleDeadline, setScheduleDeadline] = useState("")
  const [editingBrandId, setEditingBrandId] = useState<string | null>(null)
  const [topicInput, setTopicInput]         = useState("")  // 주제 저장용 임시 라벨
  const fileDropRef = useRef<HTMLTextAreaElement>(null)

  // localStorage 로드 (마운트 시 1회)
  useEffect(() => {
    setSavedTopics(getTopics())
    setSavedURLs(getURLs())
    setSavedMaterials(getMaterials())
    setBrandProfiles(getBrands())
    setActiveBrandIdState(getActiveBrandId())
    const ab = getActiveBrand()
    if (ab) setBrand({ name: ab.name, color: ab.color, hashtags: ab.hashtags })
  }, [])

  // 활성 브랜드 전환
  const switchBrand = (id: string) => {
    setActiveBrandId(id)
    setActiveBrandIdState(id)
    const ab = getBrands().find(b => b.id === id)
    if (ab) setBrand({ name: ab.name, color: ab.color, hashtags: ab.hashtags })
  }

  // 브랜드 저장
  const updateBrandProfile = (profile: BrandProfile) => {
    const updated = getBrands().map(b => b.id === profile.id ? profile : b)
    saveBrands(updated)
    setBrandProfiles(updated)
    if (profile.id === activeBrandId) setBrand({ name: profile.name, color: profile.color, hashtags: profile.hashtags })
  }

  // 주제 저장/선택
  const handleSaveTopic = () => {
    if (!topic.trim()) return
    addTopic(topic, keywords)
    setSavedTopics(getTopics())
  }
  const handleSelectTopic = (t: SavedTopic) => { setTopic(t.text); setKeywords(t.keywords) }
  const handleDeleteTopic = (id: string) => { deleteTopic(id); setSavedTopics(getTopics()) }

  // URL 저장/선택
  const handleSaveURL = () => {
    if (!sourceContent.trim() || sourceType !== "URL") return
    addURL(sourceContent, sourceContent)
    setSavedURLs(getURLs())
  }
  const handleSelectURL = (u: SavedURL) => setSourceContent(u.url)
  const handleDeleteURL = (id: string) => { deleteURL(id); setSavedURLs(getURLs()) }

  // 자료 저장/선택
  const handleSaveMaterial = () => {
    if (!sourceContent.trim() || sourceType !== "FILE") return
    addMaterial(`자료 ${savedMaterials.length + 1}`, sourceContent)
    setSavedMaterials(getMaterials())
  }
  const handleSelectMaterial = (m: SavedMaterial) => setSourceContent(m.content)
  const handleDeleteMaterial = (id: string) => { deleteMaterial(id); setSavedMaterials(getMaterials()) }

  // 드래그앤드롭
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
          id: item.id,
          index: i + 1,
          topic: item.topic,
          angle: item.angle || "일반",
          date: new Date(item.createdAt),
          status: item.status as any,
          content: item.content,
          channels: item.channels || [],
          dbId: item.id,
        }))
        setDbItems(mapped)
      }
    } catch {}
    finally { setDbLoading(false) }
  }, [])

  // 발행 일정 / 소재 보관함 탭 진입 시 히스토리 로드
  useEffect(() => {
    if (nav === "schedule" || nav === "storage" || nav === "home") loadHistory()
  }, [nav, loadHistory])

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
        body: JSON.stringify({ channels: item.channels, payload, dbId: (item as any).dbId }),
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
    <div className="sfa-shell">

      {/* 사이드바 */}
      <aside className="sfa-sidebar">
        <button className="sfa-sidebar-logo" onClick={() => setNav("home")}
          style={{ alignItems: "center", gap: 10, padding: "0 20px 24px", borderBottom: "1px solid #f0f0f0", marginBottom: 16, background: "none", border: "none", cursor: "pointer", textAlign: "left", width: "100%" }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "#111", color: "#fff", fontSize: 11, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", letterSpacing: -0.5, flexShrink: 0 }}>SF</div>
          <div>
            <div style={{ fontWeight: 900, fontSize: 13, color: "#111", letterSpacing: -0.3 }}>SNS FLOW</div>
            <div style={{ fontSize: 9, color: "#9ca3af", fontWeight: 700, letterSpacing: 2 }}>AUTO</div>
          </div>
        </button>

        <nav style={{ flex: 1, padding: "0 10px", display: "flex", flexDirection: "column", gap: 2 }}>
          {([
            { id: "create",   label: "✨ 생성" },
            { id: "schedule", label: "📅 일정" },
            { id: "storage",  label: "📦 보관함" },
            { id: "settings", label: "⚙️ 설정" },
            { id: "admin",    label: "🔐 진단" },
          ] as { id: TNav; label: string }[]).map(item => (
            <button key={item.id}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, border: "none", background: nav === item.id ? "#f7f8fc" : "transparent", fontSize: 13, color: nav === item.id ? "#111" : "#6b7280", cursor: "pointer", textAlign: "left", fontWeight: nav === item.id ? 700 : 500 }}
              onClick={() => setNav(item.id)}>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sfa-sidebar-stats" style={{ padding: "16px 20px 0", borderTop: "1px solid #f0f0f0", gap: 16 }}>
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#111" }}>{dbItems.length || schedule.length}</div>
            <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>총 콘텐츠</div>
          </div>
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#059669" }}>{dbItems.filter(s => s.status === "published").length || schedule.filter(s => s.status === "published").length}</div>
            <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>게시 완료</div>
          </div>
        </div>
      </aside>

      {/* 메인 */}
      <main className="sfa-main">
        <div className="sfa-content">

          {/* ══ 홈 대시보드 ══ */}
          {nav === "home" && (
            <div style={{ maxWidth: 860 }}>
              {/* 헤더 */}
              <div style={{ marginBottom: 32 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 14, background: "#111", color: "#fff", fontSize: 15, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>SF</div>
                  <div>
                    <div style={{ fontSize: 24, fontWeight: 900, color: "#111", letterSpacing: -0.5 }}>SNS FLOW AUTO</div>
                    <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 2 }}>AI 기반 SNS 콘텐츠 자동화 플랫폼</div>
                  </div>
                </div>
                <div style={{ padding: "16px 20px", background: "linear-gradient(135deg,#f0f7ff,#f5f0ff)", borderRadius: 14, fontSize: 14, color: "#374151", lineHeight: 1.8 }}>
                  주제 하나만 입력하면 <strong>블로그 · 뉴스 · 인스타그램 · 스레드 · 카카오</strong> 5개 채널용 콘텐츠를 Claude AI가 동시에 작성해줘요.<br />
                  채널별로 내용을 복사하거나, 연동된 채널에는 자동 발행까지 한번에 처리할 수 있어요.
                </div>
              </div>

              {/* 통계 */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 32 }}>
                {[
                  { label: "총 생성", value: dbItems.length, color: "#1a73e8", icon: "📝" },
                  { label: "게시 완료", value: dbItems.filter(i => i.status === "published").length, color: "#059669", icon: "✅" },
                  { label: "임시저장", value: dbItems.filter(i => i.status === "draft").length, color: "#d97706", icon: "🗂️" },
                ].map(s => (
                  <Card key={s.label} style={{ textAlign: "center", padding: "20px 12px" }}>
                    <div style={{ fontSize: 24, marginBottom: 6 }}>{s.icon}</div>
                    <div style={{ fontSize: 28, fontWeight: 900, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>{s.label}</div>
                  </Card>
                ))}
              </div>

              {/* 사용 방법 */}
              <Card style={{ marginBottom: 20 }}>
                <Label>📖 사용 방법 (3단계)</Label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                  {[
                    { step: 1, title: "주제 입력", icon: "✏️", desc: "상단 '✨ 생성' 탭 → 주제·키워드·톤 설정 후\n✦ 자동화 시작 클릭", action: "create" as TNav },
                    { step: 2, title: "내용 확인·복사", icon: "📋", desc: "생성 완료 후 '📅 일정' 탭에서\n채널별 탭을 클릭하고 '복사하기' 버튼 사용", action: "schedule" as TNav },
                    { step: 3, title: "SNS에 붙여넣기", icon: "🚀", desc: "복사한 내용을 각 SNS에 직접 게시\n(채널 연동 시 자동 발행 가능)", action: "storage" as TNav },
                  ].map(s => (
                    <button key={s.step} onClick={() => setNav(s.action)}
                      style={{ textAlign: "left", padding: "16px", background: "#f7f8fc", border: "1.5px solid #e5e7eb", borderRadius: 12, cursor: "pointer" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#111", color: "#fff", fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{s.step}</div>
                        <span style={{ fontSize: 16 }}>{s.icon}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#111" }}>{s.title}</span>
                      </div>
                      <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.7, whiteSpace: "pre-line" }}>{s.desc}</div>
                    </button>
                  ))}
                </div>
              </Card>

              {/* 채널별 발행 설명서 */}
              <Card style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: showChannelGuide ? 16 : 0 }}>
                  <Label style={{ marginBottom: 0 }}>📡 채널별 자동 발행 방법 — 어떻게 되나요?</Label>
                  <button onClick={() => setShowChannelGuide(v => !v)}
                    style={{ fontSize: 12, fontWeight: 700, color: "#1a73e8", background: "none", border: "none", cursor: "pointer" }}>
                    {showChannelGuide ? "접기 ▲" : "모두 보기 ▼"}
                  </button>
                </div>

                {/* 항상 표시: 요약 카드 */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: showChannelGuide ? 16 : 0 }}>
                  {[
                    { ch: "✅ AI 글 생성", color: "#10b981", status: "지금 바로 됨", statusBg: "#d1fae5", statusColor: "#065f46" },
                    { ch: "✅ 복사 붙여넣기", color: "#10b981", status: "지금 바로 됨", statusBg: "#d1fae5", statusColor: "#065f46" },
                    { ch: "🟡 페이플레이 블로그", color: "#d97706", status: "연동 준비 중", statusBg: "#fef3c7", statusColor: "#92400e" },
                    { ch: "🔴 인스타·스레드", color: "#ef4444", status: "Meta 심사 필요", statusBg: "#fee2e2", statusColor: "#991b1b" },
                    { ch: "🔴 카카오 채널", color: "#ef4444", status: "API 심사 필요", statusBg: "#fee2e2", statusColor: "#991b1b" },
                    { ch: "🔴 당근·밴드·페이스북", color: "#ef4444", status: "미연동", statusBg: "#f3f4f6", statusColor: "#6b7280" },
                  ].map(it => (
                    <div key={it.ch} style={{ padding: "8px 10px", background: "#f7f8fc", borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#111" }}>{it.ch}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 10, background: it.statusBg, color: it.statusColor }}>{it.status}</span>
                    </div>
                  ))}
                </div>

                {/* 상세 설명서 (펼치면 보임) */}
                {showChannelGuide && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {[
                      {
                        icon: "📝", name: "네이버 블로그", status: "복사 후 직접 게시", statusOk: false,
                        simple: "한국에서 제일 많이 쓰는 블로그예요. 네이버에서 검색하면 내 글이 나와요!",
                        process: ["1️⃣ AI가 블로그 글을 완성해줘요", "2️⃣ '발행 일정'에서 '네이버 블로그' 탭 클릭", "3️⃣ '복사하기' 버튼 눌러 내용 복사", "4️⃣ blog.naver.com 에서 새 글 쓰기 → 붙여넣기 → 발행!"],
                        tip: "💡 SEO 키워드가 자동으로 들어가서 검색에 더 잘 노출돼요"
                      },
                      {
                        icon: "🏠", name: "홈페이지 뉴스", status: "연동 준비 중", statusOk: false,
                        simple: "여러분 가게 홈페이지에 뉴스처럼 소식을 올릴 수 있어요!",
                        process: ["1️⃣ AI가 뉴스 기사 형식으로 글을 써줘요", "2️⃣ 홈페이지 API 연결 후 자동 발행 예정", "3️⃣ 현재는 복사해서 홈페이지에 직접 붙여넣기"],
                        tip: "💡 역피라미드 기사 형식으로 써줘서 전문적으로 보여요"
                      },
                      {
                        icon: "📸", name: "인스타그램", status: "Meta 심사 필요", statusOk: false,
                        simple: "사진과 함께 이모지·해시태그가 가득한 글을 올리는 SNS예요. 젊은 고객들이 많이 봐요!",
                        process: ["1️⃣ AI가 이모지+해시태그 포함 인스타 글을 써줘요", "2️⃣ '복사하기'로 내용 복사", "3️⃣ 인스타그램 앱에서 새 게시물 → 붙여넣기 → 게시", "4️⃣ (자동 발행) Meta 개발자 계정 + 앱 심사 통과 후 가능"],
                        tip: "⏰ Meta 앱 심사는 수일~수주 소요돼요. 당장은 복사 방식이 편해요"
                      },
                      {
                        icon: "🧵", name: "스레드 (Threads)", status: "Meta 심사 필요", statusOk: false,
                        simple: "인스타그램이 만든 짧은 글 SNS예요. 트위터처럼 텍스트 위주로 소통해요!",
                        process: ["1️⃣ AI가 핵심만 담은 짧은 스레드 글을 써줘요", "2️⃣ 복사해서 Threads 앱에 붙여넣기", "3️⃣ 자동 발행은 인스타그램과 동일하게 Meta 심사 후 가능"],
                        tip: "💡 500자 이내로 핵심만 담아줘요"
                      },
                      {
                        icon: "💛", name: "카카오 채널", status: "채널 연동 필요", statusOk: false,
                        simple: "카카오톡으로 단골 고객에게 알림을 보내는 기능이에요. 가게 소식이 카톡으로 바로 전달돼요!",
                        process: ["1️⃣ AI가 친근한 카카오 채널 메시지를 써줘요", "2️⃣ 복사해서 카카오 채널 관리자 센터에 붙여넣기", "3️⃣ (자동 발행) business.kakao.com 채널 개설 + API 심사 후"],
                        tip: "⏰ 카카오 채널 자동 발행은 사업자 인증 + 3~7일 심사가 필요해요"
                      },
                      {
                        icon: "🟣", name: "페이플레이 블로그·언론보도", status: "연동 중 (곧 가능)", statusOk: true,
                        simple: "페이플레이 홈페이지에 글이 올라가요. 홈페이지 방문자들이 볼 수 있어요!",
                        process: ["1️⃣ AI가 블로그 글과 뉴스 형식 글을 써줘요", "2️⃣ '자동 발행' 클릭 시 페이플레이 홈페이지에 바로 게시", "3️⃣ 현재 홈페이지 API 연결 작업 진행 중이에요"],
                        tip: "🔜 곧 자동 발행이 가능해질 예정이에요!"
                      },
                    ].map(ch => (
                      <div key={ch.name} style={{ border: "1px solid #f0f0f0", borderRadius: 12, overflow: "hidden" }}>
                        <div style={{ padding: "12px 16px", background: ch.statusOk ? "#f0fdf4" : "#f7f8fc", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{ch.icon} {ch.name}</div>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: ch.statusOk ? "#d1fae5" : "#fee2e2", color: ch.statusOk ? "#065f46" : "#991b1b" }}>{ch.status}</span>
                        </div>
                        <div style={{ padding: "12px 16px" }}>
                          <div style={{ fontSize: 13, color: "#374151", marginBottom: 10, lineHeight: 1.6 }}>🗣️ <strong>쉽게 말하면:</strong> {ch.simple}</div>
                          <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 2 }}>
                            {ch.process.map((step, i) => <div key={i}>{step}</div>)}
                          </div>
                          <div style={{ marginTop: 8, fontSize: 12, color: "#6b7280", background: "#fffbeb", padding: "6px 10px", borderRadius: 8 }}>{ch.tip}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* 사용방법 더보기 */}
              <Card style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Label style={{ marginBottom: 0 }}>📖 자세한 사용 방법</Label>
                  <button onClick={() => setShowMoreGuide(v => !v)}
                    style={{ fontSize: 12, fontWeight: 700, color: "#1a73e8", background: "none", border: "none", cursor: "pointer" }}>
                    {showMoreGuide ? "접기 ▲" : "더보기 ▼"}
                  </button>
                </div>
                {showMoreGuide && (
                  <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 16 }}>
                    {[
                      {
                        step: "STEP 1", title: "✨ 콘텐츠 생성 탭으로 이동",
                        content: [
                          "왼쪽 사이드바에서 '✨ 생성'을 클릭하세요.",
                          "📌 콘텐츠 소스 선택: 주제를 직접 입력하거나, URL에서 추출하거나, 자료를 붙여넣을 수 있어요.",
                          "📌 주제 입력: '여름 매출 올리는 소상공인 마케팅 전략' 같이 구체적으로 쓸수록 좋아요.",
                          "📌 키워드: '여름, 할인, 이벤트' 처럼 포함되길 원하는 단어를 쉼표로 구분해 넣으세요.",
                          "📌 톤 & 매너: 친근하게(일반 고객용), 전문적으로(B2B), 감성적으로(스토리텔링) 중 선택.",
                        ]
                      },
                      {
                        step: "STEP 2", title: "📡 발행 채널 선택",
                        content: [
                          "오른쪽 '발행 채널' 카드에서 올릴 채널을 ON/OFF 하세요.",
                          "📌 ON 표시된 채널만 글이 생성됩니다.",
                          "📌 처음엔 '네이버 블로그 + 인스타그램 + 스레드' 3개만 켜놓고 해보세요.",
                          "📌 발행 주기와 시작일을 설정하면 날짜별로 예약 일정이 잡혀요.",
                        ]
                      },
                      {
                        step: "STEP 3", title: "✦ 자동화 시작 클릭",
                        content: [
                          "오른쪽 하단 '✦ 자동화 시작' 버튼을 누르세요.",
                          "📌 AI가 채널별로 글을 쓰는 동안 진행 상황이 실시간으로 표시돼요.",
                          "📌 보통 1편당 10~30초 정도 걸려요.",
                          "📌 글이 완성되면 자동으로 '발행 일정' 탭으로 이동해요.",
                        ]
                      },
                      {
                        step: "STEP 4", title: "📅 발행 일정 탭에서 내용 확인",
                        content: [
                          "왼쪽 목록에서 편 번호를 클릭하면 상세 내용이 오른쪽에 나타나요.",
                          "📌 상단 탭(네이버 블로그, 인스타그램...)을 클릭해 채널별 내용을 확인하세요.",
                          "📌 내용이 마음에 안 들면 텍스트를 직접 수정할 수 있어요.",
                          "📌 인스타그램 탭에는 해시태그가 분리되어 표시돼요.",
                        ]
                      },
                      {
                        step: "STEP 5", title: "📋 복사 → SNS에 붙여넣기",
                        content: [
                          "'📋 복사하기' 버튼을 누르면 내용이 클립보드에 복사돼요.",
                          "📌 네이버 블로그: blog.naver.com → 글쓰기 → 붙여넣기",
                          "📌 인스타그램: 앱 열기 → + 버튼 → 사진 선택 → 내용 붙여넣기",
                          "📌 스레드: 앱 열기 → 새 게시물 → 붙여넣기",
                          "📌 카카오: 카카오 채널 관리자 센터 → 메시지 발송 → 붙여넣기",
                        ]
                      },
                    ].map((s, i) => (
                      <div key={i} style={{ background: "#f7f8fc", borderRadius: 12, overflow: "hidden" }}>
                        <div style={{ background: "#111", color: "#fff", padding: "8px 16px", fontSize: 11, fontWeight: 800, letterSpacing: 1 }}>{s.step}</div>
                        <div style={{ padding: "12px 16px" }}>
                          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: "#111" }}>{s.title}</div>
                          {s.content.map((line, j) => (
                            <div key={j} style={{ fontSize: 13, color: line.startsWith("📌") ? "#6b7280" : "#374151", lineHeight: 1.8, paddingLeft: line.startsWith("📌") ? 8 : 0 }}>{line}</div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* 주의사항 */}
              <Card style={{ background: "#fffbeb", borderColor: "#fde68a" }}>
                <Label>⚠️ 현재 알려진 제한사항</Label>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13, color: "#78350f" }}>
                  <div>• <strong>생성 횟수 비용:</strong> Claude API 사용량만큼 과금됩니다. 생성 1회 ≈ $0.01~0.03</div>
                  <div>• <strong>히스토리 저장:</strong> 로컬에서는 저장되지만 배포 서버(Vercel)에서는 DB 설정 전까지 저장 안 됩니다</div>
                  <div>• <strong>자동 발행:</strong> 현재 대부분 채널은 '소재 보관함 저장' 모드입니다. 직접 복사해서 게시하세요</div>
                  <div>• <strong>관리자 진단:</strong> SFA_ADMIN_KEY = <code style={{ background: "#fef3c7", padding: "1px 4px", borderRadius: 4 }}>sfa-admin-nroad-2024</code></div>
                </div>
              </Card>

              {/* 바로가기 버튼 */}
              <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                <BigBtn onClick={() => setNav("create")} style={{ flex: 2 }}>✨ 지금 바로 콘텐츠 만들기</BigBtn>
                <BigBtn onClick={() => setNav("admin")} style={{ flex: 1, background: "#f7f8fc", color: "#111", border: "1.5px solid #e5e7eb" }}>🔐 시스템 진단</BigBtn>
              </div>
            </div>
          )}

          {/* ══ 생성 ══ */}
          {nav === "create" && !generating && (
            <>
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#111", letterSpacing: -0.5 }}>콘텐츠 자동화</div>
                <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 4 }}>최소 정보 입력 → 블로그부터 SNS까지 자동 생성·발행</div>
              </div>

              <div className="sfa-create-grid">
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
                    <Label>{sourceType === "URL" ? "URL 입력" : sourceType === "FILE" ? "자료 붙여넣기 (드래그앤드롭 가능)" : "주제 입력"}</Label>

                    {/* ── URL 모드 ── */}
                    {sourceType === "URL" && (
                      <>
                        <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                          <input style={{ flex: 1, border: "1.5px solid #e5e7eb", borderRadius: 8, padding: "10px 12px", fontSize: 13, background: "#fafbff", boxSizing: "border-box" }}
                            placeholder="https://..." value={sourceContent} onChange={e => setSourceContent(e.target.value)} />
                          <button onClick={handleSaveURL} style={{ padding: "0 12px", background: "#111", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>💾 저장</button>
                        </div>
                        {savedURLs.length > 0 && (
                          <div style={{ marginBottom: 4 }}>
                            <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 6 }}>저장된 URL</div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                              {savedURLs.map(u => (
                                <div key={u.id} style={{ display: "flex", alignItems: "center", background: "#eff6ff", borderRadius: 6, overflow: "hidden" }}>
                                  <button onClick={() => handleSelectURL(u)} style={{ padding: "4px 8px", background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "#1a73e8", fontWeight: 600 }}>{u.label.slice(0, 20)}</button>
                                  <button onClick={() => handleDeleteURL(u.id)} style={{ padding: "4px 6px", background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "#9ca3af" }}>×</button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {/* ── 자료 모드 (드래그앤드롭) ── */}
                    {sourceType === "FILE" && (
                      <>
                        <div
                          onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
                          onDragLeave={() => setIsDragging(false)}
                          onDrop={handleDrop}
                          style={{ position: "relative" }}>
                          <textarea
                            ref={fileDropRef}
                            style={{ width: "100%", border: `1.5px ${isDragging ? "dashed #1a73e8" : "solid #e5e7eb"}`, borderRadius: 8, padding: "10px 12px", fontSize: 13, background: isDragging ? "#eff6ff" : "#fafbff", boxSizing: "border-box", height: 120, resize: "vertical" }}
                            placeholder="📎 여기에 텍스트를 붙여넣거나, 파일을 드래그해서 놓으세요..." value={sourceContent} onChange={e => setSourceContent(e.target.value)} />
                          {isDragging && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", fontSize: 16, fontWeight: 700, color: "#1a73e8" }}>여기에 놓으세요 ✋</div>}
                        </div>
                        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                          <button onClick={handleSaveMaterial} style={{ padding: "6px 12px", background: "#111", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>💾 자료 저장</button>
                          {savedMaterials.length > 0 && (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, flex: 1 }}>
                              {savedMaterials.map(m => (
                                <div key={m.id} style={{ display: "flex", alignItems: "center", background: "#f7f8fc", borderRadius: 6, overflow: "hidden" }}>
                                  <button onClick={() => handleSelectMaterial(m)} style={{ padding: "4px 8px", background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "#374151", fontWeight: 600 }}>{m.label}</button>
                                  <button onClick={() => handleDeleteMaterial(m.id)} style={{ padding: "4px 6px", background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "#9ca3af" }}>×</button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    {/* ── 직접 입력 / 다각화 모드 ── */}
                    {(sourceType === "MANUAL" || sourceType === "DIVERSIFIED") && (
                      <>
                        <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                          <input style={{ flex: 1, border: "1.5px solid #e5e7eb", borderRadius: 8, padding: "10px 12px", fontSize: 13, background: "#fafbff", boxSizing: "border-box" }}
                            placeholder="예) 여름 매출 올리는 소상공인 마케팅 전략" value={topic} onChange={e => setTopic(e.target.value)} />
                          <button onClick={handleSaveTopic} disabled={!topic.trim()} style={{ padding: "0 12px", background: topic.trim() ? "#111" : "#e5e7eb", color: topic.trim() ? "#fff" : "#9ca3af", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: topic.trim() ? "pointer" : "not-allowed", whiteSpace: "nowrap" }}>💾 저장</button>
                        </div>
                        {savedTopics.length > 0 && (
                          <div style={{ marginBottom: 10 }}>
                            <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 6 }}>저장된 주제</div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                              {savedTopics.map(t => (
                                <div key={t.id} style={{ display: "flex", alignItems: "center", background: "#f7f8fc", borderRadius: 6, overflow: "hidden" }}>
                                  <button onClick={() => handleSelectTopic(t)} style={{ padding: "4px 8px", background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "#374151", fontWeight: 600, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.text}</button>
                                  <button onClick={() => handleDeleteTopic(t.id)} style={{ padding: "4px 6px", background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "#9ca3af" }}>×</button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        <div style={{ display: "flex", gap: 6 }}>
                          <input style={{ flex: 1, border: "1.5px solid #e5e7eb", borderRadius: 8, padding: "10px 12px", fontSize: 13, background: "#fafbff", boxSizing: "border-box" }}
                            placeholder="키워드 (쉼표 구분, 선택)" value={keywords} onChange={e => setKeywords(e.target.value)} />
                        </div>
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
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 8 }}>마감일 — 언제까지? (선택)</div>
                        <input type="date" style={{ width: "100%", border: "1.5px solid #e5e7eb", borderRadius: 8, padding: "10px 12px", fontSize: 13, background: scheduleDeadline ? "#fffbeb" : "#fafbff", boxSizing: "border-box" }}
                          value={scheduleDeadline} onChange={e => setScheduleDeadline(e.target.value)} min={startDate} />
                        {scheduleDeadline && (
                          <div style={{ marginTop: 6, padding: "6px 10px", background: "#fef3c7", borderRadius: 8, fontSize: 12, color: "#92400e", fontWeight: 600 }}>
                            ⏰ {startDate} ~ {scheduleDeadline} 사이에 {count}편 발행
                          </div>
                        )}
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
          {nav === "schedule" && (() => {
            const displayItems = dbItems.length > 0 ? dbItems : schedule
            return (
            <>
              <div style={{ marginBottom: 28, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#111", letterSpacing: -0.5 }}>발행 일정</div>
                  <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 4 }}>채널별 콘텐츠 검토 · 편집 · 복사 · 자동 발행</div>
                </div>
                <button onClick={loadHistory} style={{ padding: "8px 14px", background: "#f7f8fc", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  {dbLoading ? "⏳ 로딩..." : "🔄 새로고침"}
                </button>
              </div>

              {displayItems.length === 0 ? (
                <Card style={{ textAlign: "center", padding: 60 }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>◈</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "#9ca3af", marginBottom: 16 }}>생성된 일정이 없어요</div>
                  <button style={{ padding: "10px 20px", background: "#f7f8fc", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }} onClick={() => setNav("create")}>콘텐츠 생성하기 →</button>
                </Card>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 20 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {displayItems.map(item => {
                      const st = STATUS_STYLE[item.status as keyof typeof STATUS_STYLE] || STATUS_STYLE.draft
                      return (
                      <button key={item.id}
                        style={{ background: "#fff", border: `1.5px solid ${activeItem?.id === item.id ? "#111" : "#f0f0f0"}`, borderRadius: 12, padding: "14px 16px", cursor: "pointer", textAlign: "left" }}
                        onClick={() => { setActiveItem(item); setActiveChannel(item.channels[0] || "INSTAGRAM"); setPublishResults([]) }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af" }}>{item.index}편</span>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, color: st.color, background: st.bg }}>{st.label}</span>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#111", lineHeight: 1.4, marginBottom: 6 }}>{item.topic}</div>
                        <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 8 }}>📅 {fmtDate(item.date)} · {item.angle}</div>
                        <div style={{ display: "flex", gap: 4 }}>
                          {item.channels.map(ch => <div key={ch} style={{ width: 7, height: 7, borderRadius: "50%", background: CHANNEL_META[ch as TChannel]?.color || "#ccc" }} />)}
                        </div>
                      </button>
                    )})}
                  </div>

                  {activeItem && (
                    <Card style={{ padding: 0, overflow: "hidden" }}>
                      <div style={{ padding: "20px 24px", borderBottom: "1px solid #f0f0f0" }}>
                        <div style={{ fontSize: 17, fontWeight: 700, color: "#111", marginBottom: 4 }}>{activeItem.topic}</div>
                        <div style={{ fontSize: 13, color: "#9ca3af" }}>📅 {fmtDate(activeItem.date)} · {activeItem.angle}</div>
                      </div>
                      <div style={{ display: "flex", borderBottom: "1px solid #f0f0f0", padding: "0 24px", overflowX: "auto" }}>
                        {activeItem.channels.map(ch => {
                          const m = CHANNEL_META[ch as TChannel]
                          if (!m) return null
                          return (
                            <button key={ch}
                              style={{ padding: "12px 14px", border: "none", borderBottom: `2px solid ${activeChannel === ch ? m.color : "transparent"}`, background: "transparent", fontSize: 12, fontWeight: activeChannel === ch ? 700 : 500, color: activeChannel === ch ? m.color : "#9ca3af", cursor: "pointer", whiteSpace: "nowrap" }}
                              onClick={() => setActiveChannel(ch as TChannel)}>
                              {m.label}
                            </button>
                          )
                        })}
                      </div>
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
                              <button style={{ padding: "9px 16px", background: "#f7f8fc", color: "#111", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                                onClick={() => copy(activeItem.id + activeChannel, getChannelText(activeItem, activeChannel))}>
                                {copied === activeItem.id + activeChannel ? "✅ 복사됨" : "📋 복사하기"}
                              </button>
                              <button style={{ padding: "9px 20px", background: "#111", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
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
            )
          })()}

          {/* ══ 소재 보관함 ══ */}
          {nav === "storage" && (
            <>
              <div style={{ marginBottom: 28, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#111", letterSpacing: -0.5 }}>소재 보관함</div>
                  <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 4 }}>생성된 전체 소재 · 원클릭 복사 · 발행 일정으로 이동</div>
                </div>
                <button onClick={loadHistory} style={{ padding: "8px 14px", background: "#f7f8fc", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  {dbLoading ? "⏳" : "🔄 새로고침"}
                </button>
              </div>
              {(() => {
                const storageItems = dbItems.length > 0 ? dbItems : schedule
                return storageItems.length === 0 ? (
                <Card style={{ textAlign: "center", padding: 60 }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>○</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "#9ca3af" }}>저장된 소재가 없어요</div>
                </Card>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
                  {storageItems.map(item => (
                    <Card key={item.id} style={{ cursor: "pointer", padding: 18 }}
                      onClick={() => { setActiveItem(item); setActiveChannel(item.channels[0] || "INSTAGRAM"); setNav("schedule") }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, color: STATUS_STYLE[item.status as keyof typeof STATUS_STYLE]?.color || "#6b7280", background: STATUS_STYLE[item.status as keyof typeof STATUS_STYLE]?.bg || "#f3f4f6" }}>{STATUS_STYLE[item.status as keyof typeof STATUS_STYLE]?.label || item.status}</span>
                        <span style={{ fontSize: 11, color: "#9ca3af" }}>{fmtDate(item.date)}</span>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#111", lineHeight: 1.4, marginBottom: 12 }}>{item.topic}</div>
                      <div style={{ display: "flex", gap: 4 }}>
                        {item.channels.map(ch => <div key={ch} style={{ width: 7, height: 7, borderRadius: "50%", background: CHANNEL_META[ch as TChannel]?.color || "#ccc" }} />)}
                      </div>
                    </Card>
                  ))}
                </div>
              )
              })()}
            </>
          )}

          {/* ══ 설정 ══ */}
          {nav === "settings" && (
            <>
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#111", letterSpacing: -0.5 }}>브랜드 설정</div>
                <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 4 }}>최대 5개 브랜드 저장 · 활성 브랜드가 AI 글쓰기에 자동 반영됩니다</div>
              </div>

              {/* 브랜드 카드 그리드 */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14, marginBottom: 24 }}>
                {brandProfiles.map(profile => (
                  <div key={profile.id} style={{ background: "#fff", border: `2px solid ${activeBrandId === profile.id ? profile.color : "#f0f0f0"}`, borderRadius: 14, overflow: "hidden" }}>
                    <div style={{ height: 5, background: profile.color }} />
                    <div style={{ padding: "14px 16px" }}>
                      {activeBrandId === profile.id && (
                        <div style={{ display: "inline-block", background: profile.color, color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, marginBottom: 8 }}>✓ 현재 사용 중</div>
                      )}
                      <div style={{ fontWeight: 800, fontSize: 15, color: "#111", marginBottom: 8 }}>
                        {profile.name || <span style={{ color: "#ccc", fontWeight: 400, fontSize: 13 }}>이름 없음 (편집해서 추가)</span>}
                      </div>
                      {profile.keywords && <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 3 }}>🔑 {profile.keywords}</div>}
                      {profile.hashtags && <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 3 }}>🏷️ {profile.hashtags}</div>}
                      {profile.blogUrl && <div style={{ fontSize: 11, color: "#1a73e8", marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>🔗 {profile.blogUrl}</div>}
                      {profile.note && <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 3 }}>📝 {profile.note}</div>}

                      <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
                        {activeBrandId !== profile.id && (
                          <button onClick={() => switchBrand(profile.id)} style={{ flex: 1, padding: "7px 0", background: profile.color, color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>이걸로 사용</button>
                        )}
                        <button
                          onClick={() => setEditingBrandId(editingBrandId === profile.id ? null : profile.id)}
                          style={{ flex: activeBrandId !== profile.id ? 1 : 2, padding: "7px 0", background: editingBrandId === profile.id ? "#111" : "#f7f8fc", color: editingBrandId === profile.id ? "#fff" : "#374151", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                          {editingBrandId === profile.id ? "▲ 접기" : "✏️ 편집"}
                        </button>
                      </div>
                    </div>

                    {/* 인라인 편집 폼 */}
                    {editingBrandId === profile.id && (
                      <div style={{ borderTop: "1px solid #f0f0f0", padding: "14px 16px", background: "#fafbff", display: "flex", flexDirection: "column", gap: 10 }}>
                        {([
                          { label: "브랜드명", key: "name", placeholder: "예) 페이플레이" },
                          { label: "자주 쓰는 키워드", key: "keywords", placeholder: "소상공인, 창업, 마케팅" },
                          { label: "고정 해시태그", key: "hashtags", placeholder: "#소상공인 #마케팅" },
                          { label: "블로그/채널 링크", key: "blogUrl", placeholder: "https://blog.naver.com/..." },
                          { label: "메모", key: "note", placeholder: "이 브랜드 관련 메모" },
                        ] as { label: string; key: keyof BrandProfile; placeholder: string }[]).map(f => (
                          <div key={String(f.key)}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", marginBottom: 4 }}>{f.label}</div>
                            <input
                              style={{ width: "100%", border: "1.5px solid #e5e7eb", borderRadius: 8, padding: "8px 10px", fontSize: 13, background: "#fff", boxSizing: "border-box" }}
                              placeholder={f.placeholder}
                              value={String(profile[f.key] || "")}
                              onChange={e => updateBrandProfile({ ...profile, [f.key]: e.target.value })}
                            />
                          </div>
                        ))}
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", marginBottom: 4 }}>대표 컬러</div>
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <input type="color" style={{ width: 38, height: 38, border: "1.5px solid #e5e7eb", borderRadius: 8, cursor: "pointer", padding: 2 }}
                              value={profile.color}
                              onChange={e => updateBrandProfile({ ...profile, color: e.target.value })} />
                            <input style={{ flex: 1, border: "1.5px solid #e5e7eb", borderRadius: 8, padding: "8px 10px", fontSize: 13, background: "#fff", boxSizing: "border-box" }}
                              placeholder="#111111" value={profile.color}
                              onChange={e => updateBrandProfile({ ...profile, color: e.target.value })} />
                            <div style={{ width: 38, height: 38, borderRadius: 8, background: profile.color, border: "1.5px solid #e5e7eb", flexShrink: 0 }} />
                          </div>
                        </div>
                        <button onClick={() => setEditingBrandId(null)} style={{ padding: "10px", background: "#111", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>저장 완료 ✓</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <Card style={{ background: "#eff6ff", borderColor: "#bfdbfe", maxWidth: 540 }}>
                <Label>💡 브랜드 설정 활용 방법</Label>
                <div style={{ fontSize: 13, color: "#1e40af", lineHeight: 2 }}>
                  <div>• <strong>키워드</strong> — AI 글쓰기에 자동 반영 (쉼표로 구분)</div>
                  <div>• <strong>해시태그</strong> — 인스타·스레드 글에 자동 추가</div>
                  <div>• <strong>블로그 링크</strong> — 나중에 자동 발행 연동 시 사용</div>
                  <div>• <strong>5개 브랜드</strong> — 매장별·채널별로 저장해두고 전환해서 사용하세요</div>
                </div>
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

      {/* ── 우측 패널 (데스크톱 전용) ── */}
      <aside className="sfa-right-panel">

        {/* 최근 생성 목록 */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 12 }}>최근 생성</div>
          {dbItems.length === 0 ? (
            <div style={{ fontSize: 12, color: "#9ca3af", lineHeight: 1.6, padding: "8px 0" }}>
              아직 생성된 콘텐츠가 없어요.<br/>
              주제를 입력해 시작해보세요!
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {dbItems.slice(0, 5).map((item, i) => {
                const st = STATUS_STYLE[item.status as keyof typeof STATUS_STYLE] || STATUS_STYLE.draft
                return (
                  <button key={item.id}
                    style={{ padding: "10px 12px", background: "#f7f8fc", borderRadius: 10, border: "none", cursor: "pointer", textAlign: "left", width: "100%" }}
                    onClick={() => { setActiveItem(item); setActiveChannel(item.channels[0] || "INSTAGRAM"); setNav("schedule") }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 10, color: st.color, background: st.bg }}>{st.label}</span>
                      <span style={{ fontSize: 10, color: "#9ca3af" }}>{fmtDate(item.date)}</span>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#111", lineHeight: 1.4, marginBottom: 4 }}>{item.topic}</div>
                    <div style={{ display: "flex", gap: 3 }}>
                      {item.channels.slice(0, 5).map(ch => (
                        <div key={ch} style={{ width: 6, height: 6, borderRadius: "50%", background: CHANNEL_META[ch as TChannel]?.color || "#ccc" }} />
                      ))}
                      {item.channels.length > 5 && <span style={{ fontSize: 9, color: "#9ca3af" }}>+{item.channels.length - 5}</span>}
                    </div>
                  </button>
                )
              })}
              <button style={{ fontSize: 11, color: "#1a73e8", background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: "4px 0" }}
                onClick={() => { loadHistory(); setNav("storage") }}>
                전체 보기 →
              </button>
            </div>
          )}
        </div>

        {/* 공지사항 & 사용 팁 */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 12 }}>채널 현황 & 팁</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { icon: "🤖", title: "AI 자동 생성", desc: "주제만 입력하면 블로그·뉴스·인스타·스레드·카카오 5채널 동시 생성", ok: true },
              { icon: "🖼️", title: "이미지 생성", desc: "SVG 브랜드 카드 즉시 생성 가능 (/api/image)", ok: true },
              { icon: "📋", title: "복사 발행", desc: "채널탭에서 내용 복사 후 직접 게시 — 지금 바로 사용 가능", ok: true },
              { icon: "🟣", title: "페이플레이 발행", desc: "홈페이지 /api/posts/create 연결 시 자동 발행 활성화", ok: false },
              { icon: "🟡", title: "카카오 채널", desc: "카카오 비즈니스 채널 + API 심사 후 실발행 가능 (3~7일)", ok: false },
              { icon: "🔴", title: "Instagram / Threads", desc: "Meta 앱 심사 필요 — 현재 소재 보관함 저장 모드", ok: false },
            ].map(tip => (
              <div key={tip.title} style={{ padding: "10px 12px", background: tip.ok ? "#f0fdf4" : "#f7f8fc", borderRadius: 10, borderLeft: `3px solid ${tip.ok ? "#10b981" : "#e5e7eb"}` }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#111", marginBottom: 3 }}>
                  {tip.icon} {tip.title}
                  <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: tip.ok ? "#059669" : "#9ca3af" }}>{tip.ok ? "사용 가능" : "미연동"}</span>
                </div>
                <div style={{ fontSize: 11, color: "#6b7280", lineHeight: 1.5 }}>{tip.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 관리자 진단 바로가기 */}
        <div style={{ marginTop: "auto", paddingTop: 16, borderTop: "1px solid #f0f0f0" }}>
          <button style={{ width: "100%", padding: "10px", background: "#f7f8fc", border: "1.5px solid #e5e7eb", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer", color: "#374151" }}
            onClick={() => setNav("admin")}>
            🔐 관리자 진단
          </button>
        </div>

      </aside>
    </div>
  )
}
