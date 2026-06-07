"use client"
import { useState, useEffect, useCallback, useRef } from "react"
import { CHANNEL_META, TChannel, TTone, TSourceType, TImageEngine, IScheduleItem } from "@/types"
import {
  type SavedTopic, type SavedURL, type SavedMaterial, type BrandProfile, type FixRequest, DEFAULT_BRANDS,
  getTopics, addTopic, deleteTopic,
  getURLs, addURL, deleteURL,
  getMaterials, addMaterial, deleteMaterial,
  getBrands, saveBrands, getActiveBrandId, setActiveBrandId, getActiveBrand,
  getFixRequests, addFixRequest, updateFixRequest, deleteFixRequest,
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

const SOURCE_OPTIONS: { id: TSourceType; label: string }[] = [
  { id: "MANUAL",      label: "주제" },
  { id: "DIVERSIFIED", label: "다각화" },
  { id: "URL",         label: "URL" },
  { id: "FILE",        label: "자료" },
]

const IMAGE_ENGINES: { id: TImageEngine; label: string; desc: string }[] = [
  { id: "custom", label: "기본 템플릿", desc: "SFA 브랜드 디자인" },
  { id: "canva",  label: "캔바 연동",   desc: "내 캔바 템플릿" },
]

const STATUS_STYLE = {
  draft:     { label: "임시저장", cls: "badge-gray" },
  scheduled: { label: "예약됨",   cls: "badge-orange" },
  published: { label: "게시완료", cls: "badge-green" },
  failed:    { label: "실패",     cls: "badge-red" },
}

const CHANNEL_GROUPS: { id: 1|2|3; label: string; channels: TChannel[] }[] = [
  { id: 1, label: "SNS",  channels: ["INSTAGRAM","THREADS","KAKAO_CHANNEL"] },
  { id: 2, label: "블로그", channels: ["BLOG_NAVER","NEWS_HOMEPAGE","PAYPLAY_BLOG","PAYPLAY_PRESS"] },
  { id: 3, label: "기타",  channels: ["DAANGN","BAND","FACEBOOK"] },
]

const CHANNEL_CONNECTED = new Set<TChannel>(["PAYPLAY_BLOG","PAYPLAY_PRESS"])

type TNav = "home" | "create" | "schedule" | "storage" | "settings" | "admin"

// ── SVG 아이콘 ────────────────────────────────
const IcoHome = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={18} height={18}>
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
)
const IcoCreate = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={18} height={18}>
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
  </svg>
)
const IcoCalendar = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={18} height={18}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
)
const IcoFolder = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={18} height={18}>
    <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
  </svg>
)
const IcoSettings = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" width={18} height={18}>
    <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
  </svg>
)
const IcoShield = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={18} height={18}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
)
const IcoChevLeft = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" width={13} height={13}>
    <polyline points="15 18 9 12 15 6"/>
  </svg>
)
const IcoChevRight = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" width={13} height={13}>
    <polyline points="9 18 15 12 9 6"/>
  </svg>
)
const IcoChevDown = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" width={13} height={13}>
    <polyline points="6 9 12 15 18 9"/>
  </svg>
)
const IcoX = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" width={10} height={10}>
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
)

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
function todayStr() { return new Date().toISOString().split("T")[0] }
function getChannelText(item: IScheduleItem, ch: TChannel): string {
  if (!item.content) return ""
  const c = item.content
  switch (ch) {
    case "BLOG_NAVER": case "PAYPLAY_BLOG":  return `${c.blog.title}\n\n${c.blog.body}\n\nSEO: ${c.blog.seoKeywords.join(", ")}`
    case "NEWS_HOMEPAGE": case "PAYPLAY_PRESS": return `${c.news.headline}\n${c.news.subheadline}\n\n${c.news.body}\n\n태그: ${c.news.tags.join(", ")}`
    case "INSTAGRAM": return `${c.instagram.caption}\n\n${c.instagram.hashtags.join(" ")}`
    case "THREADS":   return c.threads.post
    case "KAKAO_CHANNEL": return `${c.kakao.title}\n\n${c.kakao.body}`
    default: return c.blog.body
  }
}

// ── 메인 컴포넌트 ─────────────────────────────
export default function SFA() {
  const [nav, setNav] = useState<TNav>("home")

  // 생성 폼
  const [sourceType, setSourceType] = useState<TSourceType>("MANUAL")
  const [topic, setTopic] = useState("")
  const [sourceContent, setSourceContent] = useState("")
  const [tone, setTone] = useState<TTone>("friendly")
  const [count, setCount] = useState(4)
  const [freq, setFreq] = useState("weekly")
  const [startDate, setStartDate] = useState(todayStr())
  const [channels, setChannels] = useState<TChannel[]>(["INSTAGRAM","THREADS","KAKAO_CHANNEL","PAYPLAY_BLOG"])
  const [imageEngine, setImageEngine] = useState<TImageEngine>("custom")
  const [canvaKey, setCanvaKey] = useState("")

  // 키워드 3단
  const [brandKws, setBrandKws] = useState<string[]>([])
  const [mainKws, setMainKws]   = useState<string[]>([])
  const [subKws, setSubKws]     = useState<string[]>([])
  const [bKwIn, setBKwIn] = useState("")
  const [mKwIn, setMKwIn] = useState("")
  const [sKwIn, setSKwIn] = useState("")

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

  // DB
  const [dbItems, setDbItems] = useState<IScheduleItem[]>([])
  const [dbLoading, setDbLoading] = useState(false)

  // localStorage
  const [savedTopics, setSavedTopics]       = useState<SavedTopic[]>([])
  const [savedURLs, setSavedURLs]           = useState<SavedURL[]>([])
  const [savedMaterials, setSavedMaterials] = useState<SavedMaterial[]>([])
  const [brandProfiles, setBrandProfiles]   = useState<BrandProfile[]>(DEFAULT_BRANDS)
  const [activeBrandId, setActiveBrandIdState] = useState<string>("b1")

  // UI
  const [isDragging, setIsDragging]       = useState(false)
  const [showChannelGuide, setShowChannelGuide] = useState(false)
  const [showMoreGuide, setShowMoreGuide] = useState(false)
  const [scheduleDeadline, setScheduleDeadline] = useState("")
  const [editingBrandId, setEditingBrandId] = useState<string | null>(null)
  const fileDropRef = useRef<HTMLTextAreaElement>(null)

  // 발행 편집
  const [editedContent, setEditedContent]   = useState<Record<string, string>>({})
  const [showImageView, setShowImageView]   = useState<Record<string, boolean>>({})
  const [imageCache, setImageCache]         = useState<Record<string, string>>({})
  const [regenerating, setRegenerating]     = useState(false)
  const [draftSavedKey, setDraftSavedKey]   = useState<string | null>(null)
  const [scheduledDate, setScheduledDate]   = useState<Record<string, string>>({})
  const [showSchedulePanel, setShowSchedulePanel] = useState(false)

  // 수정 요청
  const [fixRequests, setFixRequests]   = useState<FixRequest[]>([])
  const [newFix, setNewFix]             = useState({ title: "", content: "", images: [] as string[] })
  const [isDraggingFix, setIsDraggingFix] = useState(false)
  const [editingFixId, setEditingFixId] = useState<string | null>(null)

  // ── 4단 레이아웃 상태 ──
  const [d2Open, setD2Open]   = useState(false)
  const [d2Tab, setD2Tab]     = useState<1|2|3>(1)
  const [rightOpen, setRightOpen] = useState(true)
  const [sections, setSections] = useState({ source: true, tone: false, schedule: false })
  const toggleSection = (k: keyof typeof sections) => setSections(p => ({ ...p, [k]: !p[k] }))

  // 주제 드롭다운
  const [topicDropOpen, setTopicDropOpen] = useState(false)
  const [topicSearch, setTopicSearch]     = useState("")
  const topicDropRef = useRef<HTMLDivElement>(null)

  // D2 auto-open
  useEffect(() => {
    if (nav === "create") setD2Open(true)
    else setD2Open(false)
  }, [nav])

  // 주제 드롭다운 외부 클릭 닫기
  useEffect(() => {
    if (!topicDropOpen) return
    const handler = (e: MouseEvent) => {
      if (topicDropRef.current && !topicDropRef.current.contains(e.target as Node)) {
        setTopicDropOpen(false); setTopicSearch("")
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [topicDropOpen])

  // localStorage 로드
  useEffect(() => {
    setSavedTopics(getTopics())
    setSavedURLs(getURLs())
    setSavedMaterials(getMaterials())
    setBrandProfiles(getBrands())
    setActiveBrandIdState(getActiveBrandId())
    const ab = getActiveBrand()
    if (ab) setBrand({ name: ab.name, color: ab.color, hashtags: ab.hashtags })
    setFixRequests(getFixRequests())
  }, [])

  const allKeywords = [...brandKws, ...mainKws, ...subKws].join(", ")

  const addKw = (tier: "brand"|"main"|"sub", val: string) => {
    const v = val.trim(); if (!v) return
    if (tier === "brand") { setBrandKws(p => [...p, v]); setBKwIn("") }
    else if (tier === "main") { setMainKws(p => [...p, v]); setMKwIn("") }
    else { setSubKws(p => [...p, v]); setSKwIn("") }
  }
  const delKw = (tier: "brand"|"main"|"sub", i: number) => {
    if (tier === "brand") setBrandKws(p => p.filter((_,j)=>j!==i))
    else if (tier === "main") setMainKws(p => p.filter((_,j)=>j!==i))
    else setSubKws(p => p.filter((_,j)=>j!==i))
  }

  const switchBrand = (id: string) => {
    setActiveBrandId(id); setActiveBrandIdState(id)
    const ab = getBrands().find(b => b.id === id)
    if (ab) setBrand({ name: ab.name, color: ab.color, hashtags: ab.hashtags })
  }
  const updateBrandProfile = (profile: BrandProfile) => {
    const updated = getBrands().map(b => b.id === profile.id ? profile : b)
    saveBrands(updated); setBrandProfiles(updated)
    if (profile.id === activeBrandId) setBrand({ name: profile.name, color: profile.color, hashtags: profile.hashtags })
  }

  const handleSaveTopic = () => {
    if (!topic.trim()) return
    addTopic(topic, allKeywords); setSavedTopics(getTopics())
  }
  const handleSelectTopic = (t: SavedTopic) => {
    setTopic(t.text)
    if (t.keywords) {
      const kws = t.keywords.split(",").map(k => k.trim()).filter(Boolean)
      setMainKws(kws)
    }
    setTopicDropOpen(false); setTopicSearch("")
  }
  const handleDeleteTopic = (id: string) => { deleteTopic(id); setSavedTopics(getTopics()) }

  const handleSaveURL = () => {
    if (!sourceContent.trim() || sourceType !== "URL") return
    addURL(sourceContent, sourceContent); setSavedURLs(getURLs())
  }
  const handleSelectURL = (u: SavedURL) => setSourceContent(u.url)
  const handleDeleteURL = (id: string) => { deleteURL(id); setSavedURLs(getURLs()) }

  const handleSaveMaterial = () => {
    if (!sourceContent.trim() || sourceType !== "FILE") return
    addMaterial(`자료 ${savedMaterials.length + 1}`, sourceContent); setSavedMaterials(getMaterials())
  }
  const handleSelectMaterial = (m: SavedMaterial) => setSourceContent(m.content)
  const handleDeleteMaterial = (id: string) => { deleteMaterial(id); setSavedMaterials(getMaterials()) }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false)
    const text = e.dataTransfer.getData("text/plain")
    const file = e.dataTransfer.files[0]
    if (text) { setSourceContent(text); return }
    if (file && file.type === "text/plain") file.text().then(t => setSourceContent(t))
    else if (file) setSourceContent(`[파일: ${file.name}] — 내용을 직접 붙여넣어 주세요.`)
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
        body: JSON.stringify({ topic, keywords: allKeywords, tone, count, sourceType, sourceContent, startDate, frequency: freq, channels }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      const results: IScheduleItem[] = data.results.map((r: any, i: number) => {
        setGenLogs(p => p.map((l, idx) => idx === i ? { ...l, step: "완료", done: true } : l))
        return {
          id: r.dbId || `${Date.now()}-${i}`, index: r.index || i + 1,
          topic: r.topic || topic, angle: r.angle || "일반",
          date: dates[i], status: "draft" as const, content: r.content, channels, dbId: r.dbId,
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
    setPublishing(true); setPublishResults([])
    const payload = { title: item.content.blog.title, body: item.content.blog.body, hashtags: item.content.instagram.hashtags }
    try {
      const res = await fetch("/api/publish", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channels: item.channels, payload, dbId: (item as any).dbId }),
      })
      const data = await res.json()
      setPublishResults(data.summary || [])
    } finally { setPublishing(false) }
  }

  const copy = (key: string, text: string) => {
    navigator.clipboard.writeText(text); setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const loadImage = async (itemId: string, t: string) => {
    if (imageCache[itemId]) return
    try {
      const res = await fetch("/api/image", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: t, brand: brand.name, color: brand.color }),
      })
      if (res.ok) {
        const svg = await res.text()
        const blob = new Blob([svg], { type: "image/svg+xml" })
        setImageCache(p => ({ ...p, [itemId]: URL.createObjectURL(blob) }))
      }
    } catch {}
  }

  const handleRegenerate = async (item: IScheduleItem, ch: TChannel) => {
    setRegenerating(true)
    try {
      const res = await fetch("/api/regenerate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: item.topic, channel: ch, tone, keywords: allKeywords, angle: item.angle }),
      })
      const data = await res.json()
      if (data.success && data.text) setEditedContent(p => ({ ...p, [`${item.id}-${ch}`]: data.text }))
    } catch {}
    setRegenerating(false)
  }

  const handleDraftSave = (itemId: string, ch: TChannel) => {
    const key = `${itemId}-${ch}`
    localStorage.setItem(`sfa_draft_${key}`, editedContent[key] || "")
    setDraftSavedKey(key); setTimeout(() => setDraftSavedKey(null), 2000)
  }

  const handleAddFix = () => {
    if (!newFix.title.trim()) return
    addFixRequest(newFix.title, newFix.content, newFix.images)
    setNewFix({ title: "", content: "", images: [] }); setFixRequests(getFixRequests())
  }

  const handleFixImageDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDraggingFix(false)
    const file = e.dataTransfer.files[0]
    if (!file || !file.type.startsWith("image/")) return
    const reader = new FileReader()
    reader.onload = ev => {
      if (ev.target?.result) setNewFix(p => ({ ...p, images: [...p.images, ev.target!.result as string] }))
    }
    reader.readAsDataURL(file)
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
      const data = await res.json(); setDiagResult(data.analysis)
    } finally { setDiagLoading(false) }
  }

  // ── 주제 칩 계산
  const MAX_CHIPS = 3
  const visibleTopics = savedTopics.slice(0, MAX_CHIPS)
  const remainCount   = Math.max(0, savedTopics.length - MAX_CHIPS)
  const filteredTopics = topicSearch
    ? savedTopics.filter(t => t.text.toLowerCase().includes(topicSearch.toLowerCase()))
    : savedTopics

  // ── 네비 아이템
  const navItems: { id: TNav; label: string; Icon: () => React.ReactElement }[] = [
    { id: "home",     label: "홈",         Icon: IcoHome },
    { id: "create",   label: "콘텐츠 생성", Icon: IcoCreate },
    { id: "schedule", label: "발행 일정",   Icon: IcoCalendar },
    { id: "storage",  label: "보관함",      Icon: IcoFolder },
    { id: "settings", label: "설정",        Icon: IcoSettings },
    { id: "admin",    label: "진단",        Icon: IcoShield },
  ]

  // ── 키워드 섹션 컴포넌트
  const KwSection = ({ tier, label, kws, inp, setInp, cls }: {
    tier: "brand"|"main"|"sub"; label: string; kws: string[]; inp: string
    setInp: (v:string)=>void; cls: string
  }) => (
    <div className="kw-section">
      <div className={`kw-label ${cls}`}>
        <span className={`kw-dot kw-dot-${tier}`} />
        {label}
      </div>
      {kws.length > 0 && (
        <div className="kw-chips">
          {kws.map((k,i) => (
            <span key={i} className={`kw-chip kw-chip-${tier}`}>
              {k}
              <button className="kw-chip-del" onClick={() => delKw(tier,i)}><IcoX /></button>
            </span>
          ))}
        </div>
      )}
      <div className="kw-add-row">
        <input className="kw-input" placeholder={
          tier === "brand" ? "페이플레이, 결제솔루션..." :
          tier === "main"  ? "소상공인 POS, 테이블오더..." : "창업, 스마트오더..."
        }
          value={inp} onChange={e => setInp(e.target.value)}
          onKeyDown={e => e.key === "Enter" && addKw(tier, inp)} />
        <button className="kw-add-btn"
          style={{
            background: tier === "brand" ? "var(--toss-blue)" : tier === "main" ? "var(--text-secondary)" : "var(--border)",
            color: tier === "sub" ? "var(--text-secondary)" : "#fff",
          }}
          onClick={() => addKw(tier, inp)}>+</button>
      </div>
    </div>
  )

  // ════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════
  return (
    <div className="sfa-shell">

      {/* ── D1: 아이콘 사이드바 ── */}
      <aside className="d1-sidebar">
        <button className="d1-logo" onClick={() => setNav("home")} title="SNS FLOW AUTO">SF</button>
        <nav className="d1-nav">
          {navItems.map(({ id, label, Icon }) => (
            <button key={id} className={`d1-nav-btn ${nav === id ? "active" : ""}`}
              onClick={() => setNav(id)} title={label}>
              <Icon />
            </button>
          ))}
        </nav>
      </aside>

      {/* ── D2: 채널 사이드바 (create 탭만) ── */}
      {d2Open && nav === "create" && (
        <aside className="d2-sidebar">
          <div className="d2-header">
            <span style={{ fontSize: 12, fontWeight: 800, color: "var(--text-primary)" }}>발행 채널</span>
            <button className="d2-close-btn" onClick={() => setD2Open(false)} title="닫기">
              <IcoChevLeft />
            </button>
          </div>

          <div className="d2-tabs">
            {CHANNEL_GROUPS.map(g => (
              <button key={g.id} className={`d2-tab ${d2Tab === g.id ? "active" : ""}`}
                onClick={() => setD2Tab(g.id)}>
                {g.label}
              </button>
            ))}
          </div>

          <div className="d2-channel-list">
            {CHANNEL_GROUPS.find(g => g.id === d2Tab)?.channels.map(ch => {
              const m = CHANNEL_META[ch]; const on = channels.includes(ch)
              const connected = CHANNEL_CONNECTED.has(ch)
              return (
                <button key={ch} className={`d2-ch-item ${on ? "on" : ""}`} onClick={() => toggleCh(ch)}>
                  <div className="status-dot" style={{
                    background: on ? m.color : "var(--border)",
                    opacity: connected ? 1 : 0.55,
                  }} />
                  <span className="d2-ch-name">{m.label}</span>
                  <div className={`d2-toggle ${on ? "on" : ""}`}
                    style={{ background: on ? m.color : undefined }}>
                    {on ? "ON" : ""}
                  </div>
                </button>
              )
            })}
          </div>

          <div className="d2-legend">
            <span>색상=연동</span>
            <span>회색=미연동</span>
          </div>
        </aside>
      )}

      {/* ── D3: 메인 콘텐츠 ── */}
      <main className="sfa-main">
        <div className="sfa-content">

          {/* ══ 홈 ══ */}
          {nav === "home" && (
            <div style={{ maxWidth: 820 }}>
              <div style={{ marginBottom: 28 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg, #1B64DA 0%, #3182F6 100%)", color: "#fff", fontSize: 15, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>SF</div>
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", letterSpacing: -0.5 }}>SNS FLOW AUTO</div>
                    <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2 }}>AI 기반 SNS 콘텐츠 자동화 플랫폼</div>
                  </div>
                </div>
                <div style={{ padding: "16px 20px", background: "var(--toss-blue-light)", borderRadius: "var(--radius-md)", fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.8, borderLeft: "3px solid var(--toss-blue)" }}>
                  주제 하나만 입력하면 <strong style={{ color: "var(--text-primary)" }}>블로그 · 뉴스 · 인스타그램 · 스레드 · 카카오</strong> 5개 채널용 콘텐츠를 Claude AI가 동시에 작성해요.
                </div>
              </div>

              <div className="stats-grid" style={{ marginBottom: 28 }}>
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

              <div className="card" style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 16 }}>시작하는 방법</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                  {[
                    { step: 1, title: "주제 입력",        desc: "생성 탭 → 주제·키워드·톤 설정 후\n자동화 시작 클릭", action: "create" as TNav },
                    { step: 2, title: "내용 확인 · 복사",  desc: "발행 일정 탭에서\n채널별 탭을 클릭하고 복사", action: "schedule" as TNav },
                    { step: 3, title: "SNS에 붙여넣기",    desc: "복사한 내용을 각 SNS에 직접 게시\n(연동 시 자동 발행 가능)", action: "storage" as TNav },
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

              <div className="card" style={{ background: "#FFFBEB", borderColor: "#FDE68A", marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#92400E", marginBottom: 8 }}>현재 알려진 제한사항</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 13, color: "#78350F" }}>
                  <div>· <strong>생성 비용:</strong> Claude API 사용량만큼 과금됩니다. 생성 1회 ≈ $0.01~0.03</div>
                  <div>· <strong>자동 발행:</strong> 현재 대부분 채널은 소재 보관함 저장 모드입니다. 직접 복사해서 게시하세요</div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setNav("create")} className="btn btn-primary btn-full" style={{ flex: 2 }}>지금 바로 콘텐츠 만들기</button>
                <button onClick={() => setNav("admin")} className="btn btn-secondary btn-full" style={{ flex: 1 }}>시스템 진단</button>
              </div>
            </div>
          )}

          {/* ══ 생성 탭 — 아코디언 ══ */}
          {nav === "create" && !generating && (
            <div className="create-wrap">
              <div className="create-header">
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)", letterSpacing: -0.3 }}>콘텐츠 자동화</div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>주제 입력 → AI가 멀티채널 콘텐츠 생성</div>
                </div>
                {!d2Open && (
                  <button className="btn btn-secondary btn-sm" onClick={() => setD2Open(true)} style={{ gap: 5 }}>
                    <IcoChevRight /> 채널 열기
                  </button>
                )}
              </div>

              {/* ── 아코디언 1: 소스 & 주제 ── */}
              <div className="accordion-card">
                <button className={`accordion-header ${sections.source ? "open" : ""}`}
                  onClick={() => toggleSection("source")}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div className="accordion-num"
                      style={{ background: sections.source ? "var(--toss-blue)" : "var(--border-light)", color: sections.source ? "#fff" : "var(--text-tertiary)" }}>1</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>소스 & 주제</div>
                      <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 1 }}>
                        {topic ? `"${topic.slice(0,20)}${topic.length>20?"…":""}"` : "주제 미입력"} · 저장 {savedTopics.length}개
                      </div>
                    </div>
                  </div>
                  <span style={{ color: "var(--text-tertiary)", display: "flex", transform: sections.source ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>
                    <IcoChevDown />
                  </span>
                </button>

                {sections.source && (
                  <div className="accordion-body">
                    {/* 소스 타입 탭 */}
                    <div style={{ display: "flex", gap: 3, marginBottom: 14, background: "var(--bg-card)", padding: 3, borderRadius: 8, width: "fit-content", border: "1px solid var(--border-light)" }}>
                      {SOURCE_OPTIONS.map(s => (
                        <button key={s.id}
                          style={{ padding: "6px 13px", borderRadius: 6, border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.15s", background: sourceType === s.id ? "var(--toss-blue)" : "transparent", color: sourceType === s.id ? "#fff" : "var(--text-secondary)" }}
                          onClick={() => setSourceType(s.id)}>
                          {s.label}
                        </button>
                      ))}
                    </div>

                    {/* 직접입력 / 다각화 */}
                    {(sourceType === "MANUAL" || sourceType === "DIVERSIFIED") && (
                      <>
                        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                          <input className="form-input" style={{ flex: 1, fontSize: 13 }}
                            placeholder="예) 여름 매출 올리는 소상공인 마케팅 전략"
                            value={topic} onChange={e => setTopic(e.target.value)} />
                          <button onClick={handleSaveTopic} disabled={!topic.trim()}
                            className="btn btn-secondary btn-sm">저장</button>
                        </div>

                        {/* 주제 칩 1줄 + 드롭다운 */}
                        {savedTopics.length > 0 && (
                          <div style={{ position: "relative", marginBottom: 16 }} ref={topicDropRef}>
                            <div className="topic-chip-row">
                              {visibleTopics.map(t => (
                                <div key={t.id}
                                  className={`topic-chip ${topic === t.text ? "selected" : ""}`}
                                  onClick={() => handleSelectTopic(t)}>
                                  {t.text.length > 12 ? t.text.slice(0,12)+"…" : t.text}
                                  <button className="topic-chip-del"
                                    onClick={e => { e.stopPropagation(); handleDeleteTopic(t.id) }}>
                                    <IcoX />
                                  </button>
                                </div>
                              ))}
                              <button className="topic-chip-more"
                                onClick={() => setTopicDropOpen(v => !v)}>
                                {remainCount > 0 ? `+${remainCount}개 검색` : "검색"} <IcoChevDown />
                              </button>
                            </div>

                            {topicDropOpen && (
                              <div className="topic-dropdown">
                                <div className="topic-dropdown-search">
                                  <input className="form-input" style={{ fontSize: 12, padding: "7px 10px" }}
                                    placeholder="주제 검색..." value={topicSearch}
                                    onChange={e => setTopicSearch(e.target.value)} autoFocus />
                                </div>
                                <div className="topic-dropdown-list">
                                  {filteredTopics.length === 0 ? (
                                    <div style={{ padding: 12, textAlign: "center", fontSize: 12, color: "var(--text-tertiary)" }}>검색 결과 없음</div>
                                  ) : filteredTopics.map(t => (
                                    <div key={t.id} className="topic-dropdown-item"
                                      onClick={() => handleSelectTopic(t)}>
                                      <span style={{ flex: 1 }}>{t.text}</span>
                                      <button onClick={e => { e.stopPropagation(); handleDeleteTopic(t.id) }}
                                        className="btn-danger-ghost" style={{ padding: "2px 5px", fontSize: 11 }}>×</button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* 키워드 3단 */}
                        <div style={{ borderTop: "1px solid var(--border-light)", paddingTop: 14 }}>
                          <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 12, letterSpacing: 0.5, textTransform: "uppercase" }}>키워드</div>
                          <KwSection tier="brand" label="브랜드" kws={brandKws} inp={bKwIn} setInp={setBKwIn} cls="kw-label-brand" />
                          <KwSection tier="main"  label="메인"   kws={mainKws}  inp={mKwIn} setInp={setMKwIn} cls="kw-label-main" />
                          <KwSection tier="sub"   label="서브"   kws={subKws}   inp={sKwIn} setInp={setSKwIn} cls="kw-label-sub" />
                        </div>
                      </>
                    )}

                    {/* URL 모드 */}
                    {sourceType === "URL" && (
                      <>
                        <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                          <input className="form-input" placeholder="https://..." value={sourceContent} onChange={e => setSourceContent(e.target.value)} style={{ flex: 1 }} />
                          <button onClick={handleSaveURL} className="btn btn-secondary btn-sm">저장</button>
                        </div>
                        {savedURLs.length > 0 && (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                            {savedURLs.map(u => (
                              <div key={u.id} style={{ display: "flex", alignItems: "center", background: "var(--toss-blue-light)", borderRadius: 6, overflow: "hidden" }}>
                                <button onClick={() => handleSelectURL(u)} style={{ padding: "4px 8px", background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "var(--toss-blue)", fontWeight: 600 }}>{u.label.slice(0,25)}</button>
                                <button onClick={() => handleDeleteURL(u.id)} className="btn-danger-ghost" style={{ padding: "2px 6px" }}>×</button>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}

                    {/* 자료 모드 */}
                    {sourceType === "FILE" && (
                      <>
                        <div onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
                          onDragLeave={() => setIsDragging(false)} onDrop={handleDrop}
                          style={{ position: "relative" }}>
                          <textarea ref={fileDropRef} className="form-input"
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
                  </div>
                )}
              </div>

              {/* ── 아코디언 2: 톤 & 이미지 ── */}
              <div className="accordion-card">
                <button className={`accordion-header ${sections.tone ? "open" : ""}`}
                  onClick={() => toggleSection("tone")}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div className="accordion-num"
                      style={{ background: sections.tone ? "var(--text-secondary)" : "var(--border-light)", color: sections.tone ? "#fff" : "var(--text-tertiary)" }}>2</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>톤 & 이미지</div>
                      <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 1 }}>
                        {TONE_OPTIONS.find(t => t.id === tone)?.label || "미선택"} · {imageEngine === "custom" ? "기본 템플릿" : "캔바"}
                      </div>
                    </div>
                  </div>
                  <span style={{ color: "var(--text-tertiary)", display: "flex", transform: sections.tone ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>
                    <IcoChevDown />
                  </span>
                </button>

                {sections.tone && (
                  <div className="accordion-body">
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--text-tertiary)", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.6 }}>톤 & 매너</div>
                      <div style={{ display: "flex", gap: 6 }}>
                        {TONE_OPTIONS.map(t => (
                          <button key={t.id}
                            style={{ flex: 1, padding: "10px 8px", border: `1.5px solid ${tone === t.id ? "var(--toss-blue)" : "var(--border)"}`, borderRadius: "var(--radius-sm)", background: tone === t.id ? "var(--toss-blue-light)" : "var(--bg-card)", cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}
                            onClick={() => setTone(t.id)}>
                            <div style={{ fontSize: 12.5, fontWeight: 700, color: tone === t.id ? "var(--toss-blue)" : "var(--text-primary)" }}>{t.label}</div>
                            <div style={{ fontSize: 10.5, color: "var(--text-tertiary)", marginTop: 2 }}>{t.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--text-tertiary)", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.6 }}>이미지 생성</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        {IMAGE_ENGINES.map(e => (
                          <button key={e.id}
                            style={{ padding: "10px 12px", border: `1.5px solid ${imageEngine === e.id ? "var(--toss-blue)" : "var(--border)"}`, borderRadius: "var(--radius-sm)", background: imageEngine === e.id ? "var(--toss-blue-light)" : "var(--bg-card)", cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}
                            onClick={() => setImageEngine(e.id)}>
                            <div style={{ fontSize: 12.5, fontWeight: 700, color: imageEngine === e.id ? "var(--toss-blue)" : "var(--text-primary)", marginBottom: 2 }}>{e.label}</div>
                            <div style={{ fontSize: 10.5, color: "var(--text-tertiary)" }}>{e.desc}</div>
                          </button>
                        ))}
                      </div>
                      {imageEngine === "canva" && (
                        <input className="form-input" style={{ marginTop: 8, fontSize: 12.5 }}
                          placeholder="캔바 API Key" value={canvaKey} onChange={e => setCanvaKey(e.target.value)} />
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* ── 아코디언 3: 일정 ── */}
              <div className="accordion-card">
                <button className={`accordion-header ${sections.schedule ? "open" : ""}`}
                  onClick={() => toggleSection("schedule")}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div className="accordion-num"
                      style={{ background: sections.schedule ? "var(--text-secondary)" : "var(--border-light)", color: sections.schedule ? "#fff" : "var(--text-tertiary)" }}>3</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>일정</div>
                      <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 1 }}>
                        {count}편 · {FREQ_OPTIONS.find(f => f.id === freq)?.label} · {startDate} 시작
                      </div>
                    </div>
                  </div>
                  <span style={{ color: "var(--text-tertiary)", display: "flex", transform: sections.schedule ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>
                    <IcoChevDown />
                  </span>
                </button>

                {sections.schedule && (
                  <div className="accordion-body">
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      <div>
                        <div className="form-label">수량</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <button className="btn btn-secondary" style={{ width: 30, height: 30, padding: 0, fontSize: 18 }} onClick={() => setCount(c => Math.max(1, c-1))}>−</button>
                          <span style={{ fontWeight: 700, fontSize: 15, minWidth: 32, textAlign: "center" }}>{count}편</span>
                          <button className="btn btn-secondary" style={{ width: 30, height: 30, padding: 0, fontSize: 18 }} onClick={() => setCount(c => Math.min(12, c+1))}>+</button>
                        </div>
                      </div>
                      <div>
                        <div className="form-label">발행 주기</div>
                        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                          {FREQ_OPTIONS.map(f => (
                            <button key={f.id}
                              style={{ padding: "6px 12px", borderRadius: "var(--radius-sm)", border: "none", background: freq === f.id ? "var(--toss-blue)" : "var(--bg)", color: freq === f.id ? "#fff" : "var(--text-secondary)", fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}
                              onClick={() => setFreq(f.id)}>{f.label}</button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="form-label">시작일</div>
                        <input type="date" className="form-input" value={startDate} onChange={e => setStartDate(e.target.value)} />
                      </div>
                      <div>
                        <div className="form-label">마감일 (선택)</div>
                        <input type="date" className="form-input"
                          style={scheduleDeadline ? { borderColor: "var(--warning)" } : undefined}
                          value={scheduleDeadline} onChange={e => setScheduleDeadline(e.target.value)} min={startDate} />
                      </div>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 12 }}>
                      {dates.map((d, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 3, background: "var(--toss-blue-light)", border: "1px solid #BFDBFE", borderRadius: 16, padding: "3px 8px", fontSize: 11, color: "var(--toss-blue)" }}>
                          <span style={{ fontWeight: 800, fontSize: 10, background: "var(--toss-blue)", color: "#fff", borderRadius: 8, width: 14, height: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>{i+1}</span>
                          {fmtDate(d)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 우측 패널 닫혔을 때 하단 시작 버튼 */}
              {!rightOpen && (
                <div style={{ marginTop: 8 }}>
                  <button className="btn btn-primary btn-full"
                    onClick={handleGenerate}
                    disabled={!topic.trim() && sourceType === "MANUAL"}>
                    ✦ 자동화 시작 — {count * channels.length}개 콘텐츠
                  </button>
                </div>
              )}
            </div>
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
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 600, textAlign: "left", color: "var(--text-primary)" }}>{topic || "주제"} {i+1}편</span>
                      <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{l.step}</span>
                      <span style={{ fontSize: 12 }}>{l.done ? "✓" : l.error ? "✗" : "…"}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ══ 발행 일정 ══ */}
          {nav === "schedule" && (() => {
            const displayItems = dbItems.length > 0 ? dbItems : schedule
            return (
              <>
                <div style={{ marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)", letterSpacing: -0.5 }}>발행 일정</div>
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
                            const m = CHANNEL_META[ch as TChannel]; if (!m) return null
                            const CHANNEL_AUTO: Record<string,boolean> = { PAYPLAY_BLOG: true, PAYPLAY_PRESS: true }
                            const canAuto = CHANNEL_AUTO[ch] ?? false
                            return (
                              <button key={ch}
                                style={{ padding: "10px 12px", border: "none", borderBottom: `2px solid ${activeChannel === ch ? m.color : "transparent"}`, background: "transparent", cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.15s", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}
                                onClick={() => setActiveChannel(ch as TChannel)}>
                                <span style={{ fontSize: 12, fontWeight: activeChannel === ch ? 700 : 500, color: activeChannel === ch ? m.color : "var(--text-tertiary)" }}>{m.label}</span>
                                <span style={{ fontSize: 9, fontWeight: 600, color: canAuto ? "var(--success)" : "var(--border)", lineHeight: 1 }}>{canAuto ? "자동 가능" : "복사 필요"}</span>
                              </button>
                            )
                          })}
                        </div>
                        <div style={{ padding: 22 }}>
                          {activeItem.content ? (() => {
                            const ck = `${activeItem.id}-${activeChannel}`
                            const currentText = editedContent[ck] ?? getChannelText(activeItem, activeChannel)
                            const isImageView = showImageView[ck]
                            const CHANNEL_AUTO: Record<string,boolean> = { INSTAGRAM: false, THREADS: false, KAKAO_CHANNEL: false, PAYPLAY_BLOG: true, PAYPLAY_PRESS: true, BLOG_NAVER: false, NEWS_HOMEPAGE: false }
                            const CHANNEL_NOTE: Record<string,string> = { INSTAGRAM: "Meta 심사 필요", THREADS: "Meta 심사 필요", KAKAO_CHANNEL: "채널 연동 필요", PAYPLAY_BLOG: "API 연결 확인", PAYPLAY_PRESS: "API 연결 확인", BLOG_NAVER: "직접 게시", NEWS_HOMEPAGE: "직접 게시" }
                            const canAuto = CHANNEL_AUTO[activeChannel] ?? false
                            return (
                              <>
                                <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
                                  <div style={{ display: "flex", background: "var(--bg)", borderRadius: "var(--radius-sm)", padding: 3, gap: 2 }}>
                                    <button onClick={() => setShowImageView(p => ({ ...p, [ck]: false }))}
                                      style={{ padding: "5px 12px", borderRadius: 6, border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.15s", background: !isImageView ? "white" : "transparent", color: !isImageView ? "var(--toss-blue)" : "var(--text-tertiary)", boxShadow: !isImageView ? "var(--shadow-sm)" : "none" }}>
                                      텍스트
                                    </button>
                                    <button onClick={() => { setShowImageView(p => ({ ...p, [ck]: true })); loadImage(activeItem.id, activeItem.topic) }}
                                      style={{ padding: "5px 12px", borderRadius: 6, border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.15s", background: isImageView ? "white" : "transparent", color: isImageView ? "var(--toss-blue)" : "var(--text-tertiary)", boxShadow: isImageView ? "var(--shadow-sm)" : "none" }}>
                                      이미지 카드
                                    </button>
                                  </div>
                                  <button onClick={() => handleRegenerate(activeItem, activeChannel)} disabled={regenerating}
                                    className="btn btn-secondary btn-sm">
                                    {regenerating ? "재작성 중..." : "재작성"}
                                  </button>
                                  <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
                                    <button onClick={() => handleDraftSave(activeItem.id, activeChannel)} className="btn btn-secondary btn-sm">
                                      {draftSavedKey === ck ? "저장됨 ✓" : "임시 저장"}
                                    </button>
                                    <button onClick={() => setShowSchedulePanel(v => !v)} className="btn btn-secondary btn-sm">예약 발행</button>
                                  </div>
                                </div>

                                <div style={{ marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                                  <div className="status-dot" style={{ background: canAuto ? "var(--success)" : "var(--border)" }} />
                                  <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                                    {canAuto ? "자동 발행 가능" : `자동 발행 불가 — ${CHANNEL_NOTE[activeChannel] || "복사 필요"}`}
                                  </span>
                                </div>

                                {showSchedulePanel && (
                                  <div style={{ padding: 14, background: "var(--bg)", borderRadius: "var(--radius-md)", marginBottom: 14, border: "1px solid var(--border-light)" }}>
                                    <div className="form-label">예약 발행 일시</div>
                                    <div style={{ display: "flex", gap: 8 }}>
                                      <input type="datetime-local" className="form-input" style={{ flex: 1 }}
                                        value={scheduledDate[activeItem.id] || ""}
                                        onChange={e => setScheduledDate(p => ({ ...p, [activeItem.id]: e.target.value }))} />
                                      <button className="btn btn-primary btn-sm"
                                        onClick={() => { localStorage.setItem(`sfa_sched_${activeItem.id}`, scheduledDate[activeItem.id] || ""); setShowSchedulePanel(false) }}>
                                        설정
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {isImageView ? (
                                  <div style={{ display: "flex", gap: 14, marginBottom: 14 }}>
                                    <div style={{ flexShrink: 0 }}>
                                      {imageCache[activeItem.id]
                                        ? <img src={imageCache[activeItem.id]} alt="브랜드 카드" style={{ width: 180, height: 180, borderRadius: "var(--radius-md)", objectFit: "cover", border: "1px solid var(--border-light)" }} />
                                        : <div style={{ width: 180, height: 180, background: "var(--bg)", borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "var(--text-tertiary)", border: "1px solid var(--border-light)" }}>이미지 생성 중...</div>
                                      }
                                    </div>
                                    <textarea className="form-input" style={{ flex: 1, minHeight: 180, lineHeight: 1.8 }}
                                      value={currentText} onChange={e => setEditedContent(p => ({ ...p, [ck]: e.target.value }))} />
                                  </div>
                                ) : (
                                  <textarea className="form-input" style={{ minHeight: 240, marginBottom: 14, lineHeight: 1.8 }}
                                    value={currentText} onChange={e => setEditedContent(p => ({ ...p, [ck]: e.target.value }))} />
                                )}

                                {activeChannel === "INSTAGRAM" && activeItem.content.instagram.hashtags.length > 0 && (
                                  <div style={{ marginBottom: 14 }}>
                                    <div className="section-label" style={{ marginBottom: 6 }}>해시태그</div>
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                                      {activeItem.content.instagram.hashtags.map(h => (
                                        <span key={h} style={{ background: "var(--toss-blue-light)", color: "var(--toss-blue)", borderRadius: 20, padding: "3px 10px", fontSize: 12, fontWeight: 600 }}>{h}</span>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                <div style={{ display: "flex", gap: 8, paddingTop: 14, borderTop: "1px solid var(--border-light)" }}>
                                  <button className="btn btn-secondary" onClick={() => copy(activeItem.id + activeChannel, currentText)}>
                                    {copied === activeItem.id + activeChannel ? "복사됨 ✓" : "복사하기"}
                                  </button>
                                  <button className="btn btn-primary" onClick={() => handlePublish(activeItem)}
                                    disabled={publishing || !canAuto}
                                    title={canAuto ? "자동 발행" : "API 연동 후 사용 가능"}>
                                    {publishing ? "발행 중..." : canAuto ? "자동 발행" : "발행 불가 (연동 필요)"}
                                  </button>
                                </div>

                                {publishResults.length > 0 && (
                                  <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 6 }}>
                                    {publishResults.map((r: any) => (
                                      <div key={r.channel} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, padding: "8px 12px", background: "var(--bg)", borderRadius: "var(--radius-sm)" }}>
                                        <div className="status-dot" style={{ background: r.success ? "var(--success)" : r.fallback ? "var(--warning)" : "var(--danger)" }} />
                                        <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{CHANNEL_META[r.channel as TChannel]?.label}</span>
                                        <span style={{ color: "var(--text-tertiary)", marginLeft: "auto", fontSize: 12 }}>
                                          {r.success ? "실제 발행 완료" : r.fallback ? "소재 저장됨 (미발행)" : `실패: ${r.error || "연동 필요"}`}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </>
                            )
                          })() : (
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
                  <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)", letterSpacing: -0.5 }}>소재 보관함</div>
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
                <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)", letterSpacing: -0.5 }}>브랜드 설정</div>
                <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>최대 5개 브랜드 저장 · 활성 브랜드가 AI 글쓰기에 자동 반영됩니다</div>
              </div>
              <div className="brand-grid" style={{ marginBottom: 24 }}>
                {brandProfiles.map(profile => (
                  <div key={profile.id} style={{ background: "var(--bg-card)", border: `2px solid ${activeBrandId === profile.id ? profile.color : "var(--border-light)"}`, borderRadius: "var(--radius-lg)", overflow: "hidden", transition: "border-color 0.15s", boxShadow: "var(--shadow-sm)" }}>
                    <div style={{ height: 4, background: profile.color }} />
                    <div style={{ padding: "14px 16px" }}>
                      {activeBrandId === profile.id && (
                        <div style={{ display: "inline-block", background: profile.color, color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, marginBottom: 8 }}>현재 사용 중</div>
                      )}
                      <div style={{ fontWeight: 800, fontSize: 15, color: "var(--text-primary)", marginBottom: 8 }}>
                        {profile.name || <span style={{ color: "var(--text-tertiary)", fontWeight: 400, fontSize: 13 }}>이름 없음</span>}
                      </div>
                      {profile.keywords && <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 3 }}>키워드: {profile.keywords}</div>}
                      {profile.hashtags && <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 3 }}>태그: {profile.hashtags}</div>}
                      <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
                        {activeBrandId !== profile.id && (
                          <button onClick={() => switchBrand(profile.id)} style={{ flex: 1, padding: "7px 0", background: profile.color, color: "#fff", border: "none", borderRadius: "var(--radius-sm)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>이걸로 사용</button>
                        )}
                        <button onClick={() => setEditingBrandId(editingBrandId === profile.id ? null : profile.id)}
                          style={{ flex: activeBrandId !== profile.id ? 1 : 2, padding: "7px 0", background: editingBrandId === profile.id ? "var(--text-primary)" : "var(--bg)", color: editingBrandId === profile.id ? "#fff" : "var(--text-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all 0.15s" }}>
                          {editingBrandId === profile.id ? "접기" : "편집"}
                        </button>
                      </div>
                    </div>
                    {editingBrandId === profile.id && (
                      <div style={{ borderTop: "1px solid var(--border-light)", padding: "14px 16px", background: "var(--bg)", display: "flex", flexDirection: "column", gap: 10 }}>
                        {([
                          { label: "브랜드명", key: "name", placeholder: "예) 페이플레이" },
                          { label: "키워드", key: "keywords", placeholder: "소상공인, 창업, 마케팅" },
                          { label: "해시태그", key: "hashtags", placeholder: "#소상공인 #마케팅" },
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
                              value={profile.color} onChange={e => updateBrandProfile({ ...profile, color: e.target.value })} />
                            <input className="form-input" placeholder="#111111" value={profile.color}
                              onChange={e => updateBrandProfile({ ...profile, color: e.target.value })} />
                          </div>
                        </div>
                        <button onClick={() => setEditingBrandId(null)} className="btn btn-primary btn-full">저장 완료</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ══ 진단 ══ */}
          {nav === "admin" && (
            <>
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)", letterSpacing: -0.5 }}>관리자 진단</div>
                <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>오류 발생 시 Claude가 자동 분석 · 해결 코드 생성 · 관리자 전용</div>
              </div>

              <div className="card" style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>수정 요청 게시판</div>
                <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>개선이 필요한 내용을 등록하면 Claude가 자동으로 처리해요.</div>

                <div style={{ background: "var(--bg)", borderRadius: "var(--radius-md)", padding: 16, marginBottom: 16 }}>
                  <div className="form-field">
                    <div className="form-label">제목</div>
                    <input className="form-input" placeholder="예) 발행 일정 탭에서 삭제 버튼 추가해주세요"
                      value={newFix.title} onChange={e => setNewFix(p => ({ ...p, title: e.target.value }))} />
                  </div>
                  <div className="form-field">
                    <div className="form-label">상세 내용</div>
                    <textarea className="form-input" style={{ minHeight: 80 }} placeholder="어떤 화면에서, 어떤 기능이 필요한지 자세히 적어주세요..."
                      value={newFix.content} onChange={e => setNewFix(p => ({ ...p, content: e.target.value }))} />
                  </div>
                  <div
                    onDragOver={e => { e.preventDefault(); setIsDraggingFix(true) }}
                    onDragLeave={() => setIsDraggingFix(false)}
                    onDrop={handleFixImageDrop}
                    style={{ border: `1.5px dashed ${isDraggingFix ? "var(--toss-blue)" : "var(--border)"}`, borderRadius: "var(--radius-sm)", padding: 12, textAlign: "center", cursor: "pointer", background: isDraggingFix ? "var(--toss-blue-light)" : "var(--bg-card)", marginBottom: 10, fontSize: 12, color: "var(--text-tertiary)" }}>
                    스크린샷을 여기에 드래그하거나
                    <label style={{ color: "var(--toss-blue)", fontWeight: 600, cursor: "pointer", marginLeft: 4 }}>
                      클릭해서 업로드
                      <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => {
                        const file = e.target.files?.[0]; if (!file) return
                        const reader = new FileReader()
                        reader.onload = ev => { if (ev.target?.result) setNewFix(p => ({ ...p, images: [...p.images, ev.target!.result as string] })) }
                        reader.readAsDataURL(file)
                      }} />
                    </label>
                  </div>
                  {newFix.images.length > 0 && (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                      {newFix.images.map((img, i) => (
                        <div key={i} style={{ position: "relative" }}>
                          <img src={img} alt="" style={{ width: 80, height: 80, objectFit: "cover", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }} />
                          <button onClick={() => setNewFix(p => ({ ...p, images: p.images.filter((_,j)=>j!==i) }))}
                            style={{ position: "absolute", top: -6, right: -6, width: 18, height: 18, borderRadius: "50%", background: "var(--danger)", color: "white", border: "none", fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <button onClick={handleAddFix} disabled={!newFix.title.trim()} className="btn btn-primary btn-sm">요청 등록</button>
                </div>

                {fixRequests.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "20px 0", fontSize: 13, color: "var(--text-tertiary)" }}>등록된 수정 요청이 없어요</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {fixRequests.map(req => (
                      <div key={req.id} style={{ background: "var(--bg-card)", border: "1px solid var(--border-light)", borderRadius: "var(--radius-md)", padding: 14, borderLeft: `3px solid ${req.status === "done" ? "var(--success)" : req.status === "in_progress" ? "var(--toss-blue)" : "var(--warning)"}` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", flex: 1 }}>{req.title}</div>
                          <div style={{ display: "flex", gap: 4, alignItems: "center", flexShrink: 0, marginLeft: 8 }}>
                            <span className={`badge ${req.status === "done" ? "badge-green" : req.status === "in_progress" ? "badge-blue" : "badge-orange"}`}>
                              {req.status === "done" ? "처리 완료" : req.status === "in_progress" ? "처리 중" : "대기 중"}
                            </span>
                            <button onClick={() => { updateFixRequest({ ...req, status: req.status === "pending" ? "in_progress" : req.status === "in_progress" ? "done" : "pending" }); setFixRequests(getFixRequests()) }}
                              className="btn-ghost" style={{ fontSize: 11, padding: "3px 6px" }}>상태 변경</button>
                            <button onClick={() => { deleteFixRequest(req.id); setFixRequests(getFixRequests()) }}
                              className="btn-danger-ghost" style={{ fontSize: 11, padding: "3px 6px" }}>삭제</button>
                          </div>
                        </div>
                        {req.content && <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 6 }}>{req.content}</div>}
                        <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 6 }}>{new Date(req.createdAt).toLocaleString("ko-KR")}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="card" style={{ maxWidth: 600 }}>
                <div className="form-field">
                  <div className="form-label">관리자 키</div>
                  <input type="password" className="form-input" placeholder="SFA 관리자 키" value={adminKey} onChange={e => setAdminKey(e.target.value)} />
                </div>
                <div className="form-field">
                  <div className="form-label">오류 내용</div>
                  <textarea className="form-input" style={{ minHeight: 120 }}
                    placeholder="오류 메시지, 스택 트레이스 등 붙여넣기..." value={diagError} onChange={e => setDiagError(e.target.value)} />
                </div>
                <button className="btn btn-primary btn-full" onClick={handleDiag} disabled={diagLoading || !diagError || !adminKey}>
                  {diagLoading ? "분석 중..." : "Claude 진단 요청"}
                </button>
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

      {/* ── 우측 요약 패널 (create 탭만) ── */}
      {nav === "create" && !generating && (
        <aside className={`right-panel-wrap ${rightOpen ? "expanded" : "collapsed"}`}>
          <div className="right-panel-toggle-col">
            <button className="right-panel-toggle" onClick={() => setRightOpen(v => !v)}
              title={rightOpen ? "요약 닫기" : "요약 열기"}>
              {rightOpen ? <IcoChevRight /> : <IcoChevLeft />}
            </button>
          </div>

          {rightOpen && (
            <div className="right-panel-content">
              <div className="section-label">자동화 요약</div>

              <div className="sum-box">
                {([
                  ["소스", { MANUAL: "직접 입력", DIVERSIFIED: "주제 다각화", URL: "URL 추출", FILE: "자료 기반" }[sourceType]],
                  ["주제", topic || "—"],
                  ["키워드", [...brandKws,...mainKws,...subKws].length > 0 ? `${[...brandKws,...mainKws,...subKws].length}개` : "—"],
                  ["채널", `${channels.length}개 ON`],
                  ["수량", `${count}편`],
                  ["주기", { daily: "매일", weekly: "매주", biweekly: "격주", monthly: "매월" }[freq]],
                ] as [string, string][]).map(([k, v]) => (
                  <div key={k} className="sum-row">
                    <span className="sum-k">{k}</span>
                    <span className="sum-v" style={{ maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "right" }}>{v}</span>
                  </div>
                ))}
                <div className="sum-divider" />
                <div className="sum-row">
                  <span className="sum-k">총 생성</span>
                  <span className="sum-v total">{count * channels.length}개</span>
                </div>
              </div>

              {/* 채널 미리보기 */}
              <div>
                <div className="section-label">선택된 채널</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {channels.length === 0 ? (
                    <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>채널을 선택해 주세요</span>
                  ) : channels.map(ch => {
                    const m = CHANNEL_META[ch]
                    return (
                      <div key={ch} style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 8px", background: "var(--bg)", borderRadius: 6, border: `1px solid ${m.color}30` }}>
                        <div className="status-dot" style={{ background: m.color }} />
                        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)" }}>{m.label}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div style={{ marginTop: "auto" }}>
                <button className="btn btn-primary btn-full"
                  onClick={handleGenerate}
                  disabled={!topic.trim() && sourceType === "MANUAL"}
                  style={{ fontSize: 14, fontWeight: 800 }}>
                  ✦ 자동화 시작
                </button>
                {!d2Open && (
                  <button className="btn btn-secondary btn-full" style={{ marginTop: 8 }}
                    onClick={() => setD2Open(true)}>
                    채널 편집
                  </button>
                )}
              </div>
            </div>
          )}
        </aside>
      )}

    </div>
  )
}
