import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'

export const runtime = 'nodejs'
/** Kho nhập cũ đã đóng; không đọc file, URL hay ghi Storage. */
export async function POST() {
  const denied = await requireAdmin()
  if (denied) return denied
  return NextResponse.json({ error: 'Đã ngừng nhập mẫu HTML/ZIP/URL. Mở khóa học → Trang bán khóa học → Sửa code.' }, { status: 410 })
}
