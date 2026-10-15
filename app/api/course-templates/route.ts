import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { gunzipSync } from 'node:zlib'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { courseEditorActor, assertCourseEditor } from '@/lib/course-page/permissions'
import { listLibrary, readLibraryPolicy, writeLibraryPolicy, readLibraryTemplate, saveLibraryTemplate, deleteLibraryTemplate } from '@/lib/course-page/template-library'
import { templateSourceSchema, compileTemplateSource, sourceFromHtml } from '@/lib/course-page/template-source'
import { stageTemplate } from '@/lib/course-page/stage-template'
import { COURSE_TEMPLATE_LIBRARY, createCoursePageFromTemplate } from '@/lib/course-page/templates'
import { checkRateLimit } from '@/lib/rate-limit'
import { CrmError } from '@/lib/crm/service'

const json = (value: unknown, status = 200) => NextResponse.json(value, { status, headers: { 'Cache-Control': 'private, no-store' } })
function failure(error: unknown) { return json({ error: error instanceof z.ZodError ? error.issues[0]?.message : error instanceof CrmError ? error.message : 'Không xử lý được mẫu. Nội dung đang sửa được giữ lại.' }, error instanceof CrmError ? error.status : 400) }
export const maxDuration = 60
export async function GET(request: Request) {
  try {
    const actor = await courseEditorActor(), params = new URL(request.url).searchParams
    if (params.has('page')) {
      const id = params.get('page')!
      await assertCourseEditor(prisma, actor, { pageId: id })
      const page = await prisma.coursePage.findUnique({ where: { id }, include: { sections: { orderBy: { sortOrder: 'asc' } } } })
      const section = page?.sections.find(item => item.variant === 'zip-source-v1')
      const content = section?.content as { exactSource?: { html?: string; url?: string } } | undefined
      if (content?.exactSource?.html) return json({ template: { name: page!.name + ' – Bản sao', description: '', sourceType: 'html', scope: 'private', published: false }, source: sourceFromHtml(content.exactSource.html) })
      if (content?.exactSource?.url && actor.role !== 'ADMIN') {
        const url = new URL(content.exactSource.url), storage = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || '')
        if (url.origin !== storage.origin || url.search || url.hash || !/^\/storage\/v1\/object\/public\/uploads\/course-template-sources\/[a-z0-9_-]+\.html$/i.test(url.pathname)) throw new CrmError('Nguồn mẫu cũ không hợp lệ.')
        const response = await fetch(url, { signal: AbortSignal.timeout(15000), redirect: 'error', credentials: 'omit', cache: 'no-store' })
        if (!response.ok || !response.body) throw new CrmError('Không đọc được nguồn mẫu cũ.', 502)
        const chunks: Uint8Array[] = []; let bytes = 0; const reader = response.body.getReader()
        while (true) { const next = await reader.read(); if (next.done) break; bytes += next.value.length; if (bytes > 8 * 1024 * 1024) { await reader.cancel(); throw new CrmError('Nguồn mẫu cũ vượt 8 MB.') }; chunks.push(next.value) }
        return json({ template: { name: page!.name + ' – Bản sao', description: '', sourceType: 'html', scope: 'private', published: false }, source: sourceFromHtml(Buffer.concat(chunks).toString('utf8')) })
      }
      // Tương thích nguồn mẫu cũ, chỉ admin được truy cập công cụ nhập cũ.
      if (section && actor.role === 'ADMIN') return (await import('@/app/api/admin/course-page-templates/workspace/route')).GET(request)
      return json({ renderPage: true, name: page?.name })
    }
    const id = params.get('id')
    if (id) return json(await readLibraryTemplate(prisma, actor, id, params.get('edit') === '1'))
    const [templates, policy] = await Promise.all([listLibrary(prisma, actor), readLibraryPolicy(prisma)])
    return json({ templates, policy, admin: actor.role === 'ADMIN' })
  } catch (error) { return failure(error) }
}
const inputSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('save'), id: z.string().optional(), expectedUpdatedAt: z.string().optional(), name: z.string().trim().min(1).max(150), description: z.string().max(1000).default(''), scope: z.enum(['private', 'shared']).default('private'), published: z.boolean().default(false), sourceType: z.enum(['html', 'zip', 'url']).default('html'), source: templateSourceSchema }).strict(),
  z.object({ action: z.literal('delete'), id: z.string() }).strict(),
  z.object({ action: z.literal('apply'), id: z.string(), system: z.boolean(), slug: z.string().min(1).max(200), name: z.string().min(1).max(200) }).strict(),
  z.object({ action: z.literal('policy'), policy: z.unknown() }).strict(),
  z.object({ action: z.literal('prepare-html'), html: z.string().max(8 * 1024 * 1024) }).strict(),
  z.object({ action: z.literal('import-url'), url: z.string().url().startsWith('https://') }).strict(),
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
    const input = inputSchema.parse(JSON.parse(text))
    if (input.action === 'policy') return json({ policy: await writeLibraryPolicy(prisma, actor, input.policy) })
    if (input.action === 'delete') { await deleteLibraryTemplate(prisma, actor, input.id); return json({ success: true }) }
    if (input.action === 'prepare-html' || input.action === 'import-url') {
      if (actor.role !== 'ADMIN') throw new CrmError('Nhập URL và biên dịch Tailwind CDN chỉ dành cho admin. Mẫu cá nhân dùng HTML/CSS đã đóng gói.', 403)
      const legacy = await import('@/app/api/admin/course-page-templates/workspace/route')
      return legacy.POST(new Request(request.url, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: new URL(request.url).origin }, body: JSON.stringify(input) }))
    }
    if (input.action === 'save') {
      const template = await saveLibraryTemplate(prisma, actor, input)
      return json({ template, warnings: [] })
    }
    await assertCourseEditor(prisma, actor, { slug: input.slug })
    let snapshot: any
    if (input.system) {
      const builtin = COURSE_TEMPLATE_LIBRARY.find(item => item.key === input.id)
      if (!builtin) throw new CrmError('Mẫu không hợp lệ.', 404)
      snapshot = createCoursePageFromTemplate(builtin.key, input.slug)
    } else {
      const { source } = await readLibraryTemplate(prisma, actor, input.id)
      const compiled = compileTemplateSource(source)
      snapshot = { theme: { primaryColor: '#236c1e', secondaryColor: '#b51a18', backgroundColor: '#fffaf0', textColor: '#203126', importedLayout: true }, navigation: { shortName: input.name, ctaText: 'Đăng ký khóa học', sticky: false }, seo: {}, checkoutConfig: { enabled: true, provider: 'vietqr', currency: 'VND' }, sections: [{ sectionKey: 'template-source', type: 'rich_content', variant: 'zip-source-v1', enabled: true, sortOrder: 0, visibility: 'all', content: { exactSource: { html: compiled.html, entryPath: source.entryPath } } }] }
    }
    const page = await stageTemplate(prisma, actor, input.slug, input.name, snapshot, input.system ? input.id : 'library:' + input.id)
    revalidatePath('/tools/courses')
    return json({ page, success: true })
  } catch (error) { return failure(error) }
}
