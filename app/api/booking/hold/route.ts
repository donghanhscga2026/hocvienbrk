import { NextResponse } from 'next/server'
import { holdSlot } from '@/lib/booking/service'
import { bookingErrorResponse } from '@/lib/booking/http'

export const dynamic = 'force-dynamic'

/** Giữ chỗ một khung giờ trong 10 phút để khách điền thông tin (bước 1). */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Dữ liệu không hợp lệ.' }, { status: 400 })
    }
    const data = body as Record<string, unknown>
    const result = await holdSlot({
      code: String(data.code || ''),
      dateVN: String(data.dateVN || ''),
      startMin: Math.trunc(Number(data.startMin)),
      source: typeof data.source === 'string' ? data.source : undefined,
      tags: typeof data.tags === 'string' ? data.tags : undefined,
    })
    return NextResponse.json(result)
  } catch (error) {
    return bookingErrorResponse(error)
  }
}
