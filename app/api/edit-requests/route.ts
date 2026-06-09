// 수정일: 2026-06-08
// 수정 요청은 localStorage 기반으로 동작 (DB 미연동 시에도 정상 동작)
import { NextRequest, NextResponse } from "next/server"

// 이 엔드포인트는 클라이언트 사이드 localStorage를 대체하는 서버 측 버전
// 현재는 클라이언트에서 localStorage를 사용하므로 빈 응답 반환
export async function GET() {
  return NextResponse.json({ success: true, items: [] })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    // 실제 DB 연동 시 여기서 저장 처리
    return NextResponse.json({ success: true, item: { ...body, id: Date.now().toString(), createdAt: new Date().toISOString() } })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, ...data } = await req.json()
    return NextResponse.json({ success: true, item: { id, ...data } })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
