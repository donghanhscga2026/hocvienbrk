import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { ZodError } from 'zod'
import { CrmError } from './service'

export function crmResponse(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'private, no-store' } })
}
export function crmFailure(error: unknown) {
  if (error instanceof CrmError) return crmResponse({ error: error.message }, error.status)
  if (error instanceof ZodError) return crmResponse({ error: error.issues[0]?.message || 'Dữ liệu không hợp lệ.' }, 400)
  if (error instanceof SyntaxError) return crmResponse({ error: 'JSON không hợp lệ.' }, 400)
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (['P2002', 'P2034', 'P2025'].includes(error.code)) return crmResponse({ error: 'Dữ liệu đã thay đổi hoặc trùng. Hãy xem trước / tải lại.' }, 409)
    if (['P2021', 'P2022'].includes(error.code)) return crmResponse({ error: 'CRM chưa được khởi tạo đầy đủ. Cần áp dụng migration đợt 1 và đợt 2.' }, 503)
  }
  console.error('[CRM phase 2]', error instanceof Error ? error.name : 'Unknown error')
  return crmResponse({ error: 'Không thể xử lý CRM lúc này.' }, 500)
}
export async function crmBody(request: Request, limit: number) {
  // Next may use an internal hostname in request.url. Host is the browser-facing
  // authority; browsers cannot replace it with the caller's Origin.
  const url = new URL(request.url)
  const expectedOrigin = request.headers.get('host') ? `${url.protocol}//${request.headers.get('host')}` : url.origin
  if (request.headers.get('origin') !== expectedOrigin) throw new CrmError('Nguồn yêu cầu không hợp lệ.', 403)
  if (!request.headers.get('content-type')?.includes('application/json')) throw new CrmError('Yêu cầu phải là JSON.', 415)
  // Stream to a hard byte limit; do not buffer an arbitrarily large upload first.
  const reader = request.body?.getReader()
  if (!reader) throw new CrmError('Thiếu nội dung.')
  const decoder = new TextDecoder(); let size = 0; let raw = ''
  try {
    while (true) {
      const chunk = await reader.read(); if (chunk.done) break
      size += chunk.value.length
      if (size > limit) { await reader.cancel(); throw new CrmError('Nội dung vượt giới hạn.', 413) }
      raw += decoder.decode(chunk.value, { stream: true })
    }
    raw += decoder.decode()
  } finally { reader.releaseLock() }
  return JSON.parse(raw)
}
