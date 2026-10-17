import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { gunzipSync } from 'node:zlib'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { courseEditorActor, assertCourseEditor } from '@/lib/course-page/permissions'
import { readLibraryTemplate } from '@/lib/course-page/template-library'
import { sourceFromHtml } from '@/lib/course-page/template-source'
import { stageTemplate } from '@/lib/course-page/stage-template'
import { COURSE_TEMPLATE_LIBRARY, createCoursePageFromTemplate } from '@/lib/course-page/templates'
import { checkRateLimit } from '@/lib/rate-limit'
import { zipSelectedBlockKeys } from '@/lib/course-page/importer/source-url'
import { CrmError } from '@/lib/crm/service'
import { compileCourseCode, CourseCodeError } from '@/lib/course-page/course-code'

const json = (value: unknown, status = 200) => NextResponse.json(value, { status, headers: { 'Cache-Control': 'private, no-store' } })
function failure(error: unknown) { return json({ error: error instanceof z.ZodError ? error.issues[0]?.message : error instanceof CrmError || error instanceof CourseCodeError ? error.message : 'Không xử lý được giao diện. Nội dung đang sửa được giữ lại.' }, error instanceof CrmError || error instanceof CourseCodeError ? error.status : 400) }
export const maxDuration = 60
export async function GET(request: Request) {
  try {
    const actor = await courseEditorActor(), params = new URL(request.url).searchParams
    const course = params.get('course')
    if (course) {
      await assertCourseEditor(prisma, actor, { slug: course })
      const page = await prisma.coursePage.findUnique({ where: { slug: course }, select: { id: true, updatedAt: true } })
      return json({ revision: { id: page?.id ?? null, updatedAt: page?.updatedAt.toISOString() ?? null } })
    }
    if (params.has('page')) {
      const id = params.get('page')!
      await assertCourseEditor(prisma, actor, { pageId: id })
      const page = await prisma.coursePage.findUnique({ where: { id }, include: { sections: { orderBy: { sortOrder: 'asc' } } } })
      const revision = { id: page?.id ?? null, updatedAt: page?.updatedAt.toISOString() ?? null }
      const section = page?.sections.find(item => item.variant === 'zip-source-v1')
      const content = section?.content as { exactSource?: { html?: string; url?: string }; selectedBlockKeys?: unknown } | undefined
      if (content?.exactSource?.html) return json({ revision, source: sourceFromHtml(content.exactSource.html, zipSelectedBlockKeys(content.selectedBlockKeys)) })
      if (content?.exactSource?.url && actor.role !== 'ADMIN') {
        const url = new URL(content.exactSource.url), storage = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || '')
        if (url.origin !== storage.origin || url.search || url.hash || !/^\/storage\/v1\/object\/public\/uploads\/course-template-sources\/[a-z0-9_-]+\.html$/i.test(url.pathname)) throw new CrmError('Nguồn mẫu cũ không hợp lệ.')
        const response = await fetch(url, { signal: AbortSignal.timeout(15000), redirect: 'error', credentials: 'omit', cache: 'no-store' })
        if (!response.ok || !response.body) throw new CrmError('Không đọc được nguồn mẫu cũ.', 502)
        const chunks: Uint8Array[] = []; let bytes = 0; const reader = response.body.getReader()
        while (true) { const next = await reader.read(); if (next.done) break; bytes += next.value.length; if (bytes > 8 * 1024 * 1024) { await reader.cancel(); throw new CrmError('Nguồn mẫu cũ vượt 8 MB.') }; chunks.push(next.value) }
        return json({ revision, source: sourceFromHtml(Buffer.concat(chunks).toString('utf8'), zipSelectedBlockKeys(content.selectedBlockKeys)) })
      }
      // Tương thích nguồn mẫu cũ, chỉ admin được truy cập công cụ nhập cũ.
      if (section && actor.role === 'ADMIN') {
        const response = await (await import('@/app/api/admin/course-page-templates/workspace/route')).GET(request)
        if (!response.ok) return response
        return json({ ...await response.json(), revision })
      }
      return json({ renderPage: true, name: page?.name, revision })
    }
    const id = params.get('id')
    if (id) return json(await readLibraryTemplate(prisma, actor, id, params.get('edit') === '1'))
    return json({ templates: [], admin: actor.role === 'ADMIN' })
  } catch (error) { return failure(error) }
}
const inputSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('save-course-code'), slug: z.string().min(1).max(200), name: z.string().min(1).max(200), html: z.string().min(1).max(1024 * 1024), revision: z.object({ id: z.string().nullable(), updatedAt: z.string().datetime().nullable() }).strict() }).strict(),
  z.object({ action: z.literal('apply'), id: z.string(), system: z.boolean(), slug: z.string().min(1).max(200), name: z.string().min(1).max(200) }).strict(),
])
export async function POST(request: Request) {
  try {
    const actor = await courseEditorActor()
    if (request.headers.get('origin') !== new URL(request.url).origin) throw new CrmError('Nguồn yêu cầu không hợp lệ.', 403)
    if (!/application\/(json|gzip)/.test(request.headers.get('content-type') || '')) throw new CrmError('Yêu cầu phải là JSON hoặc gzip.', 415)
    if (!(await checkRateLimit('course-template-library:' + actor.id, { max: 20, windowMs: 60000 })).allowed) throw new CrmError('Bạn thao tác quá nhanh. Vui lòng thử lại sau một phút.', 429)
    const chunks: Uint8Array[] = [], reader = request.body?.getReader(); let size = 0
    if (!reader) throw new CrmError('Thiếu nội dung.')
    while (true) { const next = await reader.read(); if (next.done) break; size += next.value.length; if (size > 4 * 1024 * 1024) { await reader.cancel(); throw new CrmError('Dữ liệu gửi vượt 4 MB.', 413) }; chunks.push(next.value) }
    const bytes = Buffer.concat(chunks)
    const text = request.headers.get('content-type')?.includes('gzip') ? gunzipSync(bytes, { maxOutputLength: 10 * 1024 * 1024 }).toString('utf8') : bytes.toString('utf8')
    const raw = JSON.parse(text)
    if (!['save-course-code', 'apply'].includes(raw?.action)) throw new CrmError('Đã ngừng nhập và lưu mẫu riêng. Hãy mở khóa học để chỉnh giao diện bằng code.', 410)
    const input = inputSchema.parse(raw)
    if (input.action === 'save-course-code') {
      await assertCourseEditor(prisma, actor, { slug: input.slug })
      const compiled = compileCourseCode(input.html)
      const snapshot = { theme: { importedLayout: true }, navigation: { shortName: input.name, ctaText: 'Đăng ký khóa học', sticky: false }, checkoutConfig: { enabled: true, provider: 'vietqr', currency: 'VND' }, sections: [{ sectionKey: 'course-code', type: 'rich_content', variant: 'zip-source-v1', enabled: true, sortOrder: 0, visibility: 'all', content: { exactSource: { html: compiled.html, entryPath: 'index.html' } } }] }
      const page = await stageTemplate(prisma, actor, input.slug, input.name, snapshot, 'course-code', { revision: input.revision, codeOnly: true })
      revalidatePath('/tools/courses')
      return json({ success: true, revision: { id: page.id, updatedAt: page.updatedAt.toISOString() }, warnings: compiled.warnings })
    }
    if (!input.system) throw new CrmError('Chỉ có thể chọn mẫu có sẵn. Giao diện riêng được lưu trực tiếp trong khóa học.', 410)
    await assertCourseEditor(prisma, actor, { slug: input.slug })
    const builtin = COURSE_TEMPLATE_LIBRARY.find(item => item.key === input.id)
    if (!builtin) throw new CrmError('Mẫu không hợp lệ.', 404)
    const snapshot = createCoursePageFromTemplate(builtin.key, input.slug)
    const page = await stageTemplate(prisma, actor, input.slug, input.name, snapshot, input.id)
    revalidatePath('/tools/courses')
    return json({ page, success: true })
  } catch (error) { return failure(error) }
}
