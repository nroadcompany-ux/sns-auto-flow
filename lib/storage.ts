// ── SNS FLOW AUTO — localStorage 유틸리티 ──
// 모든 저장/불러오기는 여기서 처리합니다.

export type SavedTopic    = { id: string; text: string; keywords: string; createdAt: string }
export type SavedURL      = { id: string; url: string; label: string; createdAt: string }
export type SavedMaterial = { id: string; label: string; content: string; createdAt: string }
export type BrandProfile  = {
  id: string
  name: string       // 브랜드명
  color: string      // 대표 컬러 (HEX)
  hashtags: string   // 고정 해시태그 (공백 구분)
  keywords: string   // 자주 쓰는 키워드 (쉼표 구분)
  blogUrl: string    // 블로그/채널 대표 링크
  note: string       // 메모
}

export const DEFAULT_BRANDS: BrandProfile[] = [
  { id: "b1", name: "브랜드 1", color: "#1a73e8", hashtags: "", keywords: "", blogUrl: "", note: "" },
  { id: "b2", name: "브랜드 2", color: "#059669", hashtags: "", keywords: "", blogUrl: "", note: "" },
  { id: "b3", name: "브랜드 3", color: "#d97706", hashtags: "", keywords: "", blogUrl: "", note: "" },
  { id: "b4", name: "브랜드 4", color: "#7c3aed", hashtags: "", keywords: "", blogUrl: "", note: "" },
  { id: "b5", name: "브랜드 5", color: "#e11d48", hashtags: "", keywords: "", blogUrl: "", note: "" },
]

export type FixRequest = {
  id: string
  title: string
  content: string
  images: string[]
  status: "pending" | "in_progress" | "done"
  createdAt: string
  response: string
}

const KEYS = {
  topics:      "sfa_saved_topics",
  urls:        "sfa_saved_urls",
  materials:   "sfa_saved_materials",
  brands:      "sfa_brand_profiles",
  activeBrand: "sfa_active_brand_id",
  fixRequests: "sfa_fix_requests",
}

function getLS<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}
function setLS<T>(key: string, value: T): void {
  if (typeof window === "undefined") return
  localStorage.setItem(key, JSON.stringify(value))
}

// ── 주제 ──────────────────────────────────
export function getTopics(): SavedTopic[] { return getLS(KEYS.topics, []) }
export function addTopic(text: string, keywords: string): SavedTopic {
  const item: SavedTopic = { id: Date.now().toString(), text: text.trim(), keywords: keywords.trim(), createdAt: new Date().toISOString() }
  setLS(KEYS.topics, [item, ...getTopics().slice(0, 19)])
  return item
}
export function deleteTopic(id: string) { setLS(KEYS.topics, getTopics().filter(t => t.id !== id)) }

// ── URL ──────────────────────────────────
export function getURLs(): SavedURL[] { return getLS(KEYS.urls, []) }
export function addURL(url: string, label: string): SavedURL {
  const item: SavedURL = { id: Date.now().toString(), url: url.trim(), label: label.trim() || url.slice(0, 30), createdAt: new Date().toISOString() }
  setLS(KEYS.urls, [item, ...getURLs().slice(0, 9)])
  return item
}
export function deleteURL(id: string) { setLS(KEYS.urls, getURLs().filter(u => u.id !== id)) }

// ── 자료 ──────────────────────────────────
export function getMaterials(): SavedMaterial[] { return getLS(KEYS.materials, []) }
export function addMaterial(label: string, content: string): SavedMaterial {
  const item: SavedMaterial = { id: Date.now().toString(), label: label.trim() || `자료 ${getMaterials().length + 1}`, content, createdAt: new Date().toISOString() }
  setLS(KEYS.materials, [item, ...getMaterials().slice(0, 9)])
  return item
}
export function deleteMaterial(id: string) { setLS(KEYS.materials, getMaterials().filter(m => m.id !== id)) }

// ── 수정 요청 ──────────────────────────────
export function getFixRequests(): FixRequest[] { return getLS(KEYS.fixRequests, []) }
export function addFixRequest(title: string, content: string, images: string[]): FixRequest {
  const item: FixRequest = { id: Date.now().toString(), title: title.trim(), content: content.trim(), images, status: "pending", createdAt: new Date().toISOString(), response: "" }
  setLS(KEYS.fixRequests, [item, ...getFixRequests()])
  return item
}
export function updateFixRequest(req: FixRequest) {
  setLS(KEYS.fixRequests, getFixRequests().map(r => r.id === req.id ? req : r))
}
export function deleteFixRequest(id: string) { setLS(KEYS.fixRequests, getFixRequests().filter(r => r.id !== id)) }

// ── 브랜드 프로필 ──────────────────────────
export function getBrands(): BrandProfile[] { return getLS(KEYS.brands, DEFAULT_BRANDS) }
export function saveBrands(brands: BrandProfile[]) { setLS(KEYS.brands, brands) }
export function getActiveBrandId(): string { return getLS(KEYS.activeBrand, "b1") }
export function setActiveBrandId(id: string) { setLS(KEYS.activeBrand, id) }
export function getActiveBrand(): BrandProfile {
  const brands = getBrands()
  const id = getActiveBrandId()
  return brands.find(b => b.id === id) || brands[0] || DEFAULT_BRANDS[0]
}
