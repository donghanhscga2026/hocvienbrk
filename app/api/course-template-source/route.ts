import { NextRequest, NextResponse } from 'next/server'
import { resolveZipStorageSource } from '@/lib/course-page/importer/source-url'
import { upgradeZipBridge } from '@/lib/course-page/importer/zip-browser'

export const runtime = 'nodejs'
const MAX_HTML_BYTES = 8 * 1024 * 1024

// Keep uploaded scripts isolated even when this URL is opened outside an iframe.
const SOURCE_CSP = "sandbox allow-scripts; default-src 'none'; img-src data: blob: https:; style-src 'unsafe-inline' https:; font-src data: https:; script-src 'unsafe-inline'; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'self'"

export async function GET(request: NextRequest) {
  const source = resolveZipStorageSource(
    request.nextUrl.searchParams.get('source') || '',
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '',
  )
  if (!source) return NextResponse.json({ error: 'Nguồn mẫu ZIP không hợp lệ.' }, { status: 400 })

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15000)
  try {
    const response = await fetch(source, {
      signal: controller.signal,
      redirect: 'error',
      cache: 'no-store',
      credentials: 'omit',
    })
    if (!response.ok || !response.body) {
      return NextResponse.json({ error: 'Không tải được nguồn mẫu ZIP.' }, {
        status: response.status === 404 ? 404 : 502,
      })
    }
    if (Number(response.headers.get('content-length')) > MAX_HTML_BYTES) {
      controller.abort()
      return NextResponse.json({ error: 'Nguồn mẫu ZIP vượt quá giới hạn 8MB.' }, { status: 413 })
    }

    const reader = response.body.getReader()
    const chunks: Uint8Array[] = []
    let size = 0
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > MAX_HTML_BYTES) {
        controller.abort()
        return NextResponse.json({ error: 'Nguồn mẫu ZIP vượt quá giới hạn 8MB.' }, { status: 413 })
      }
      chunks.push(value)
    }

    // Storage deliberately returns HTML as text/plain. Serve only the bounded body,
    // with our own isolated HTML policy; never forward upstream cookies or headers.
    return new NextResponse(upgradeZipBridge(Buffer.concat(chunks).toString('utf8')), {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Security-Policy': SOURCE_CSP,
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'no-referrer',
        'Cache-Control': 'public, max-age=300',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Không tải được nguồn mẫu ZIP. Vui lòng thử lại.' }, { status: 502 })
  } finally {
    clearTimeout(timer)
  }
}
