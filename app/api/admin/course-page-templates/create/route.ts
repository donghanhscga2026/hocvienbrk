import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'

export const runtime = 'nodejs'
export async function POST() {
  const denied = await requireAdmin()
  if (denied) return denied
  return NextResponse.json({ success: false, error: 'Đã ngừng tạo mẫu trong thư viện. Hãy dán code trực tiếp trong khóa học.' }, { status: 410 })
}
