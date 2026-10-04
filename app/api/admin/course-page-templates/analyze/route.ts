import { NextRequest, NextResponse } from 'next/server'
import { gunzipSync } from 'node:zlib'
import { requireAdmin } from '@/lib/api-auth'
import { analyzeWebsiteHtml } from '@/lib/course-page/importer/html-analyzer'
import { fetchRemoteHtml } from '@/lib/course-page/importer/fetch-html'
import { mirrorAnalysisImages } from '@/lib/course-page/importer/image-mirror'

const MAX_HTML_BYTES = 5 * 1024 * 1024

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const denied = await requireAdmin()
  if (denied) return denied

  try {
    const contentType = request.headers.get('content-type') || ''

    if (contentType.includes('application/gzip')) {
      const compressed = Buffer.from(await request.arrayBuffer())
      let htmlBuffer: Buffer
      try {
        htmlBuffer = gunzipSync(compressed)
      } catch {
        return NextResponse.json({ error: 'File HTML nén không hợp lệ' }, { status: 400 })
      }

      if (htmlBuffer.byteLength > MAX_HTML_BYTES) {
        return NextResponse.json({ error: 'Nội dung HTML sau giải nén vượt quá giới hạn 5MB' }, { status: 400 })
      }

      const html = htmlBuffer.toString('utf8')
      const encodedSourceUrl = request.headers.get('x-source-url') || ''
      let sourceUrl: string | undefined
      if (encodedSourceUrl) {
        try { sourceUrl = decodeURIComponent(encodedSourceUrl) } catch { sourceUrl = undefined }
      }

      const rawAnalysis = analyzeWebsiteHtml({ html, sourceType: 'html', sourceUrl })
      const analysis = await mirrorAnalysisImages(rawAnalysis, {
        dataOnly: true,
        failOnEmbeddedData: true,
      })
      return NextResponse.json({ success: true, analysis })
    }

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const file = formData.get('file')
      const sourceUrl = String(formData.get('sourceUrl') || '').trim() || undefined

      if (!(file instanceof File)) {
        return NextResponse.json({ error: 'Vui lòng chọn file HTML' }, { status: 400 })
      }
      if (file.size > MAX_HTML_BYTES) {
        return NextResponse.json({ error: 'File HTML vượt quá giới hạn 5MB' }, { status: 400 })
      }
      if (!file.name.toLowerCase().endsWith('.html') && !file.name.toLowerCase().endsWith('.htm') && file.type && !file.type.includes('html')) {
        return NextResponse.json({ error: 'Chỉ hỗ trợ file .html hoặc .htm' }, { status: 400 })
      }

      const html = await file.text()
      const rawAnalysis = analyzeWebsiteHtml({ html, sourceType: 'html', sourceUrl })
      const analysis = await mirrorAnalysisImages(rawAnalysis, {
        dataOnly: true,
        failOnEmbeddedData: true,
      })
      return NextResponse.json({ success: true, analysis })
    }

    const body = await request.json().catch(() => ({}))
    const url = typeof body?.url === 'string' ? body.url.trim() : ''
    const html = typeof body?.html === 'string' ? body.html : ''

    if (url) {
      const remote = await fetchRemoteHtml(url)
      const rawAnalysis = analyzeWebsiteHtml({
        html: remote.html,
        sourceType: 'url',
        sourceUrl: url,
        finalUrl: remote.finalUrl,
      })
      const analysis = await mirrorAnalysisImages(rawAnalysis, {
        dataOnly: true,
        failOnEmbeddedData: true,
      })
      return NextResponse.json({ success: true, analysis })
    }

    if (html) {
      if (Buffer.byteLength(html, 'utf8') > MAX_HTML_BYTES) {
        return NextResponse.json({ error: 'Nội dung HTML vượt quá giới hạn 5MB' }, { status: 400 })
      }
      const rawAnalysis = analyzeWebsiteHtml({ html, sourceType: 'html' })
      const analysis = await mirrorAnalysisImages(rawAnalysis, {
        dataOnly: true,
        failOnEmbeddedData: true,
      })
      return NextResponse.json({ success: true, analysis })
    }

    return NextResponse.json({ error: 'Vui lòng nhập URL hoặc tải file HTML' }, { status: 400 })
  } catch (error: any) {
    console.error('[CoursePageTemplate] Analyze error:', error)
    return NextResponse.json(
      { error: error?.message || 'Không thể phân tích website nguồn' },
      { status: 400 },
    )
  }
}
