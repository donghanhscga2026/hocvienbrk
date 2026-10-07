import { detectTemplateControls } from '@/lib/course-page/importer/detect-controls'
import { NextRequest, NextResponse } from 'next/server'
import { gunzipSync } from 'node:zlib'
import { requireAdmin } from '@/lib/api-auth'
import { analyzeWebsiteHtml } from '@/lib/course-page/importer/html-analyzer'
import { fetchRemoteHtml } from '@/lib/course-page/importer/fetch-html'
import { mirrorAnalysisImages } from '@/lib/course-page/importer/image-mirror'
import { prepareStandaloneHtml } from '@/lib/course-page/importer/prepare-html'
import { saveUploadedFile } from '@/lib/image-utils'

const MAX_HTML_BYTES = 8 * 1024 * 1024

export const runtime = 'nodejs'

// HTML mặc định dùng cùng sandbox và cầu nối đăng ký như ZIP.
async function analyzeStandalone(html: string, sourceUrl?: string, filename = 'website.html') {
  const prepared = await prepareStandaloneHtml(html, sourceUrl)
  const analysis = analyzeWebsiteHtml({ html: prepared.analysisHtml, sourceType: 'html', sourceUrl })
  const safeName = filename.replace(/\.html?$/i, '').replace(/[^a-z0-9_-]+/gi, '-').slice(0, 60) || 'website'
  const url = await saveUploadedFile(Buffer.from(prepared.html, 'utf8'),
    `${safeName}-${Date.now().toString(36)}.html`, 'course-template-sources', 'text/html; charset=utf-8')
  analysis.controls = prepared.controls
  analysis.exactSource = { url, entryPath: filename }
  analysis.warnings = [...new Set([...analysis.warnings, ...prepared.warnings,
    'HTML giữ nguyên trang: bố cục không bị chia khung; form nguồn được thay bằng đăng ký khóa học MFC.',
  ])]
  return analysis
}

export async function POST(request: NextRequest) {
  const denied = await requireAdmin()
  if (denied) return denied

  try {
    const contentType = request.headers.get('content-type') || ''

    if (contentType.includes('application/gzip')) {
      const compressed = Buffer.from(await request.arrayBuffer())
      let htmlBuffer: Buffer
      try {
        htmlBuffer = gunzipSync(compressed, { maxOutputLength: MAX_HTML_BYTES })
      } catch {
        return NextResponse.json({ error: 'File HTML nén không hợp lệ' }, { status: 400 })
      }

      if (htmlBuffer.byteLength > MAX_HTML_BYTES) {
        return NextResponse.json({ error: 'Nội dung HTML sau giải nén vượt quá giới hạn 8MB' }, { status: 400 })
      }

      const html = htmlBuffer.toString('utf8')
      const encodedSourceUrl = request.headers.get('x-source-url') || ''
      let sourceUrl: string | undefined
      if (encodedSourceUrl) {
        try { sourceUrl = decodeURIComponent(encodedSourceUrl) } catch { sourceUrl = undefined }
      }

      const requestedSourceType = request.headers.get('x-source-type') === 'zip' ? 'zip' : 'html'
      const zipFileName = (() => {
        const value = request.headers.get('x-zip-filename') || ''
        try { return decodeURIComponent(value) } catch { return value }
      })()
      const zipEntry = (() => {
        const value = request.headers.get('x-zip-entry') || ''
        try { return decodeURIComponent(value) } catch { return value }
      })()
      const zipFileCount = Number(request.headers.get('x-zip-file-count') || 0) || undefined
      const zipInlinedAssetCount = Number(request.headers.get('x-zip-inlined-count') || 0) || undefined

      if (requestedSourceType === 'html') {
        const headerName = request.headers.get('x-html-filename') || 'website.html'
        let filename = 'website.html'
        try { filename = decodeURIComponent(headerName) } catch {}
        return NextResponse.json({ success: true, analysis: await analyzeStandalone(html, sourceUrl, filename) })
      }
      const rawAnalysis = analyzeWebsiteHtml({ html, sourceType: requestedSourceType, sourceUrl })
      const analysis = await mirrorAnalysisImages(rawAnalysis, {
        dataOnly: true,
        failOnEmbeddedData: true,
      })

      if (requestedSourceType === 'zip') {
        const detected = detectTemplateControls(html)
        analysis.controls = detected.controls
        const safeName = (zipFileName || 'website')
          .replace(/\.zip$/i, '')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9_-]+/gi, '-')
          .replace(/^-+|-+$/g, '')
          .slice(0, 60) || 'website'
        const sourceFilename = `${safeName}-${Date.now().toString(36)}.html`
        const exactUrl = await saveUploadedFile(
          Buffer.from(detected.html),
          sourceFilename,
          'course-template-sources',
          'text/html; charset=utf-8',
        )
        analysis.exactSource = {
          url: exactUrl,
          zipFileName: zipFileName || undefined,
          entryPath: zipEntry || undefined,
          fileCount: zipFileCount,
          inlinedAssetCount: zipInlinedAssetCount,
        }
        analysis.warnings = Array.from(new Set([
          ...analysis.warnings,
          'ZIP Exact Mode: giao diện gốc được lưu nguyên trang trong sandbox; form nguồn sẽ chuyển sang luồng đăng ký MFC.',
        ]))
      }

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
        return NextResponse.json({ error: 'File HTML vượt quá giới hạn 8MB' }, { status: 400 })
      }
      if (!file.name.toLowerCase().endsWith('.html') && !file.name.toLowerCase().endsWith('.htm') && file.type && !file.type.includes('html')) {
        return NextResponse.json({ error: 'Chỉ hỗ trợ file .html hoặc .htm' }, { status: 400 })
      }

      const html = await file.text()
      const analysis = await analyzeStandalone(html, sourceUrl, file.name)
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
        return NextResponse.json({ error: 'Nội dung HTML vượt quá giới hạn 8MB' }, { status: 400 })
      }
      const analysis = await analyzeStandalone(html)
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
