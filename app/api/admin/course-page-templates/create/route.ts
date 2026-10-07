import { gunzipSync } from 'node:zlib'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { createStoredCoursePageTemplate } from '@/app/actions/course-page-template-actions'

export const runtime = 'nodejs'
export const maxDuration = 60
const MAX_BODY = 4 * 1024 * 1024
const MAX_JSON = 16 * 1024 * 1024

export async function POST(request: NextRequest) {
  const denied = await requireAdmin()
  if (denied) return denied
  try {
    // Kiểm tra cả dữ liệu nén và sau giải nén trước khi phân tích JSON.
    const buffer = Buffer.from(await request.arrayBuffer())
    if (buffer.length > MAX_BODY) return NextResponse.json({ success: false, error: 'Dữ liệu gửi vượt quá 4 MB.' }, { status: 413 })
    const contentType = request.headers.get('content-type') || ''
    if (!contentType.includes('application/gzip') && !contentType.includes('application/json')) {
      return NextResponse.json({ success: false, error: 'Định dạng dữ liệu không được hỗ trợ.' }, { status: 415 })
    }
    let decoded: Buffer
    try {
      decoded = contentType.includes('application/gzip') ? gunzipSync(buffer, { maxOutputLength: MAX_JSON }) : buffer
    } catch {
      return NextResponse.json({ success: false, error: 'Dữ liệu nén không hợp lệ hoặc vượt giới hạn 16 MB.' }, { status: 400 })
    }
    const input = JSON.parse(decoded.toString('utf8'))
    if (!input || typeof input.name !== 'string' || (input.description != null && typeof input.description !== 'string') ||
        !input.analysis || !Array.isArray(input.analysis.sections) ||
        !Array.isArray(input.selectedSectionIds) || !input.selectedSectionIds.every((id: unknown) => typeof id === 'string')) {
      return NextResponse.json({ success: false, error: 'Dữ liệu tạo mẫu không hợp lệ.' }, { status: 400 })
    }
    // Dùng lại bước lưu hiện có, bao gồm kiểm tra quyền quản trị.
    const result = await createStoredCoursePageTemplate(input)
    return NextResponse.json(result, { status: result.success ? 200 : 400 })
  } catch (error) {
    console.error('[CoursePageTemplate] Create API error:', error)
    return NextResponse.json({ success: false, error: error instanceof SyntaxError ? 'Dữ liệu JSON không hợp lệ.' : 'Không thể lưu mẫu. Hãy kiểm tra thư viện trước khi tạo lại.' }, { status: error instanceof SyntaxError ? 400 : 500 })
  }
}
