import { gunzipSync } from 'node:zlib'
import { NextResponse } from 'next/server'
import { ownedProfile } from '@/lib/website/server'
import { websiteFailure } from '@/lib/website/http'
import { prepareStandaloneHtml } from '@/lib/course-page/importer/prepare-html'
import { saveUploadedFile } from '@/lib/image-utils'

export const runtime = 'nodejs'
export const maxDuration = 60
export async function POST(request: Request) {
  try {
    const profile = await ownedProfile()
    const origin = new URL(request.url)
    const expectedOrigin = request.headers.get('host') ? `${origin.protocol}//${request.headers.get('host')}` : origin.origin
    if (request.headers.get('origin') !== expectedOrigin) return NextResponse.json({ error: 'Nguồn yêu cầu không hợp lệ.' }, { status: 403 })
    const reader = request.body?.getReader()
    if (!reader) return NextResponse.json({ error: 'Thiếu file HTML.' }, { status: 400 })
    const chunks: Uint8Array[] = []; let size = 0
    try {
      while (true) {
        const chunk = await reader.read(); if (chunk.done) break
        size += chunk.value.byteLength
        if (size > 4 * 1024 * 1024) { await reader.cancel(); return NextResponse.json({ error: 'Dữ liệu gửi vượt quá 4 MB.' }, { status: 413 }) }
        chunks.push(chunk.value)
      }
    } finally { reader.releaseLock() }
    const buffer = Buffer.concat(chunks)
    const type = request.headers.get('content-type') || ''
    if (!['application/gzip', 'text/html'].some(t => type.includes(t))) return NextResponse.json({ error: 'Định dạng không được hỗ trợ.' }, { status: 415 })
    let html: string
    try { html = (type.includes('application/gzip') ? gunzipSync(buffer, { maxOutputLength: 8 * 1024 * 1024 }) : buffer).toString('utf8') }
    catch { return NextResponse.json({ error: 'HTML nén không hợp lệ hoặc vượt quá 8 MB.' }, { status: 400 }) }
    let prepared: Awaited<ReturnType<typeof prepareStandaloneHtml>>
    try { prepared = await prepareStandaloneHtml(html) }
    catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'HTML không hợp lệ.' }, { status: 400 }) }
    const url = await saveUploadedFile(Buffer.from(prepared.html), `page-${profile.id}-${crypto.randomUUID()}.html`, 'course-template-sources', 'text/html; charset=utf-8')
    return NextResponse.json({ url, warnings: [...prepared.warnings.map(w => w.replace('nút đăng ký dùng quy trình khóa học MFC', 'nút đăng ký cần nối với khóa học hoặc Form tư vấn của Page')), 'Form tự viết không gửi dữ liệu. Chọn khóa học hoặc thêm khối Form tư vấn để nhận đăng ký.'] })
  } catch (error) { return websiteFailure(error) }
}
