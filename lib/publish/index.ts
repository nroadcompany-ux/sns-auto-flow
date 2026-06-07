import { TChannel } from "@/types"

interface IPublishPayload {
  channel: TChannel
  title?: string
  body: string
  imageUrl?: string
  hashtags?: string[]
}

async function publishInstagram(p: IPublishPayload) {
  const token = process.env.META_ACCESS_TOKEN
  if (!token) throw new Error("Meta 토큰 미설정")
  const caption = `${p.body}\n\n${p.hashtags?.join(" ") || ""}`
  const r = await fetch("https://graph.instagram.com/v18.0/me/media", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image_url: p.imageUrl, caption, access_token: token }),
  })
  if (!r.ok) throw new Error(`Instagram 미디어 생성 실패 ${r.status}`)
  const media = await r.json()
  if (media.error) throw new Error(media.error.message)
  const pub = await fetch("https://graph.instagram.com/v18.0/me/media_publish", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: media.id, access_token: token }),
  })
  if (!pub.ok) throw new Error(`Instagram 발행 실패 ${pub.status}`)
  return { success: true }
}

async function publishThreads(p: IPublishPayload) {
  const token = process.env.META_ACCESS_TOKEN
  if (!token) throw new Error("Meta 토큰 미설정")
  const r = await fetch("https://graph.threads.net/v1.0/me/threads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ media_type: p.imageUrl ? "IMAGE" : "TEXT", text: p.body, image_url: p.imageUrl, access_token: token }),
  })
  if (!r.ok) throw new Error(`Threads 미디어 생성 실패 ${r.status}`)
  const media = await r.json()
  if (media.error) throw new Error(media.error.message)
  const pub = await fetch("https://graph.threads.net/v1.0/me/threads_publish", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: media.id, access_token: token }),
  })
  if (!pub.ok) throw new Error(`Threads 발행 실패 ${pub.status}`)
  return { success: true }
}

async function publishKakao(p: IPublishPayload) {
  const key = process.env.KAKAO_CLIENT_ID
  if (!key) throw new Error("카카오 키 미설정")
  const res = await fetch("https://kapi.kakao.com/v2/api/talk/memo/default/send", {
    method: "POST",
    headers: { Authorization: `KakaoAK ${key}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      template_object: JSON.stringify({
        object_type: "feed",
        content: {
          title: p.title || "",
          description: p.body,
          image_url: p.imageUrl || "",
          link: { web_url: process.env.PAYPLAY_API_URL || "" },
        },
      }),
    }),
  })
  if (!res.ok) throw new Error(`카카오 발행 실패 ${res.status}`)
  const data = await res.json()
  if (data.result_code !== 0) throw new Error(`카카오 오류: ${data.msg || res.status}`)
  return { success: true }
}

async function publishPayplay(p: IPublishPayload, board: "blog" | "press") {
  const { PAYPLAY_API_URL, PAYPLAY_API_SECRET } = process.env
  if (!PAYPLAY_API_URL) throw new Error("페이플레이 URL 미설정")
  const res = await fetch(`${PAYPLAY_API_URL}/api/posts/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-secret": PAYPLAY_API_SECRET || "" },
    body: JSON.stringify({ board, title: p.title, body: p.body, imageUrl: p.imageUrl, tags: p.hashtags }),
  })
  if (!res.ok) {
    const msg = await res.text().catch(() => "")
    throw new Error(`페이플레이 발행 실패 ${res.status}${msg ? `: ${msg.slice(0, 80)}` : ""}`)
  }
  return { success: true }
}

export async function publish(payload: IPublishPayload) {
  try {
    switch (payload.channel) {
      case "INSTAGRAM":     return { ...(await publishInstagram(payload)), channel: payload.channel }
      case "THREADS":       return { ...(await publishThreads(payload)), channel: payload.channel }
      case "KAKAO_CHANNEL": return { ...(await publishKakao(payload)), channel: payload.channel }
      case "PAYPLAY_BLOG":  return { ...(await publishPayplay(payload, "blog")), channel: payload.channel }
      case "PAYPLAY_PRESS": return { ...(await publishPayplay(payload, "press")), channel: payload.channel }
      default:
        return { success: false, channel: payload.channel, fallback: true, reason: "API 미연동 — 소재 보관함 저장됨" }
    }
  } catch (e: any) {
    return { success: false, channel: payload.channel, fallback: true, error: e.message }
  }
}
