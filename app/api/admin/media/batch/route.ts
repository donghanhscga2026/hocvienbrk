import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { requireAdmin } from '@/lib/api-auth'
import { mediaBatchInput, processMediaBatch } from '@/lib/media-trash'

export async function POST(request: Request) {
  const denied = await requireAdmin(); if (denied) return denied
  const parsed = mediaBatchInput.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Chọn từ 1 đến 20 file khác nhau; thao tác không hợp lệ.' }, { status: 400 })
  const { execute, action, confirm } = parsed.data
  if (execute && !(action === 'trash' ? confirm === 'TRASH' || confirm === 'DELETE' : action === 'restore' ? confirm === 'RESTORE' : confirm === 'DELETE')) return NextResponse.json({ error: 'Cần xác nhận thao tác.' }, { status: 400 })
  try {
    const session = await auth()
    return NextResponse.json(await processMediaBatch(parsed.data, session!.user!.id), { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('[Media batch]', error instanceof Error ? error.message : 'Unknown error')
    return NextResponse.json({ error: 'Chưa hoàn tất thao tác. Hãy tải lại danh sách để kiểm tra kết quả trước khi thử lại.' }, { status: 503 })
  }
}
