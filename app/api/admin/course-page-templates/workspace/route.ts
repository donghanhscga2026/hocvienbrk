import { ZodError } from 'zod'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { domainContext } from '@/lib/website/domain-context'
import { CrmError } from '@/lib/crm/service'
import { crmResponse } from '@/lib/crm/http'
import { templateSourceSchema, sourceFromHtml } from '@/lib/course-page/template-source'
import { isImportedRegistrationSection } from '@/lib/course-page/importer/registration'
import { zipSelectedBlockKeys } from '@/lib/course-page/importer/source-url'
import { isMissingTemplateSource } from '@/lib/course-page/missing-template-source'

export const runtime = 'nodejs'
export const maxDuration = 60
async function admin() {
  if (await domainContext()) throw new CrmError('Quản lý mẫu tại hệ thống chính.', 403)
  const session = await auth(), id = session?.user?.id == null ? NaN : Number(session.user.id)
  if (!Number.isSafeInteger(id) || id < 0) throw new CrmError('Vui lòng đăng nhập.', 401)
  const actor = await prisma.user.findUnique({ where: { id }, select: { role: true } })
  if (actor?.role !== 'ADMIN') throw new CrmError('Quản lý mẫu hiện dành cho quản trị viên.', 403)
}
function failure(error: unknown) {
  if (error instanceof CrmError) return crmResponse({ error: error.message }, error.status)
  if (error instanceof ZodError) return crmResponse({ error: error.issues[0]?.message || 'Mã nguồn không hợp lệ.' }, 400)
  if (error instanceof SyntaxError) return crmResponse({ error: 'Nội dung JSON không hợp lệ.' }, 400)
  console.error('[TemplateWorkspace]', error instanceof Error ? error.name : 'Unknown')
  return crmResponse({ error: 'Không xử lý được mẫu. Bản mã đang sửa được giữ lại; hãy thử lại.' }, 500)
}
// Đọc đúng nguồn do importer lưu, không cho GET trở thành proxy tùy ý.
async function readSource(url: string, extension: 'json' | 'html') {
  const parsed = new URL(url), storage = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '')
  if (parsed.origin !== storage.origin || parsed.search || parsed.hash || parsed.username || parsed.password || !new RegExp(`^/storage/v1/object/public/uploads/course-template-sources/[a-z0-9_-]+\\.${extension}$`, 'i').test(parsed.pathname)) throw new CrmError('Nguồn mẫu đã lưu không hợp lệ.')
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 15000)
  try {
    const response = await fetch(parsed, { signal: controller.signal, redirect: 'error', cache: 'no-store', credentials: 'omit' })
    if (await isMissingTemplateSource(response)) throw new CrmError('Mã nguồn mẫu cũ không còn tồn tại.', 410)
    if (!response.ok || !response.body) throw new CrmError('Không tải được mã mẫu đã lưu.', 502)
    const reader = response.body.getReader(), chunks: Uint8Array[] = []; let size = 0
    while (true) { const next = await reader.read(); if (next.done) break; size += next.value.length; if (size > 9 * 1024 * 1024) { await reader.cancel(); throw new CrmError('Nguồn mẫu quá lớn.') }; chunks.push(next.value) }
    return Buffer.concat(chunks).toString('utf8')
  } finally { clearTimeout(timer) }
}
export async function GET(request: Request) {
  try {
    await admin()
    const pageId = new URL(request.url).searchParams.get('page')
    if (pageId) {
      const page = await prisma.coursePage.findUnique({ where: { id: pageId }, include: { sections: { orderBy: { sortOrder: 'asc' } } } })
      if (!page) throw new CrmError('Không tìm thấy trang khóa học.', 404)
      const exact = page.sections.find(section => section.variant === 'zip-source-v1')
      const content = exact?.content as { exactSource?: { url?: string; html?: string }; selectedBlockKeys?: unknown } | undefined
      // Đọc bản HTML bất biến đã áp dụng cho khóa, không lấy mẫu thư viện có thể đã đổi.
      if (content?.exactSource?.html) {
        return crmResponse({ template: { name: page.name + ' – Bản sao', description: 'Mã trang hiện tại của khóa học', sourceType: 'html' }, source: sourceFromHtml(content.exactSource.html, zipSelectedBlockKeys(content.selectedBlockKeys)) })
      }
      if (content?.exactSource?.url) {
        const source = sourceFromHtml(await readSource(content.exactSource.url, 'html'), zipSelectedBlockKeys(content.selectedBlockKeys))
        return crmResponse({ template: { name: page.name + ' – Bản sao', description: 'Mã trang hiện tại của khóa học', sourceType: 'html' }, source })
      }
      return crmResponse({ renderPage: true, name: page.name })
    }
    const id = new URL(request.url).searchParams.get('id')
    if (!id) {
      const templates = await prisma.coursePageTemplate.findMany({ orderBy: { updatedAt: 'desc' }, take: 100, select: { id: true, key: true, name: true, description: true, sourceType: true, updatedAt: true } })
      return crmResponse({ templates })
    }
    const template = await prisma.coursePageTemplate.findUnique({ where: { id } })
    if (!template) throw new CrmError('Không tìm thấy mẫu.', 404)
    if (new URL(request.url).searchParams.get('preview') === '1') return crmResponse({ snapshot: template.snapshot, name: template.name })
    const analysis = template.analysis as any
    let source
    if (analysis?.editorSource) source = templateSourceSchema.parse(analysis.editorSource)
    else if (analysis?.editorSourceUrl) source = templateSourceSchema.parse(JSON.parse(await readSource(analysis.editorSourceUrl, 'json')))
    else if (analysis?.exactSource?.html) {
      const snapshot = template.snapshot as any
      const exact = snapshot?.sections?.find((section: any) => section.variant === 'zip-source-v1')
      source = sourceFromHtml(analysis.exactSource.html, zipSelectedBlockKeys(exact?.content?.selectedBlockKeys))
    }
    else if (analysis?.exactSource?.url) {
      const snapshot = template.snapshot as any
      const exact = snapshot?.sections?.find((section: any) => section.variant === 'zip-source-v1')
      source = sourceFromHtml(await readSource(analysis.exactSource.url, 'html'), zipSelectedBlockKeys(exact?.content?.selectedBlockKeys))
    }
    else {
      const sections = (analysis?.sections || []).filter((section: any) => section.enabled !== false && !isImportedRegistrationSection(section))
      source = sourceFromHtml(`<!doctype html><html><head><meta charset="utf-8"><style>${sections.map((section: any) => section.fidelity?.css || '').join('\n')}</style></head><body>${sections.map((section: any) => section.fidelity?.html || '').join('\n')}</body></html>`)
      if (!sections.length) throw new CrmError('Mẫu cũ không có mã nguồn. Hãy nhập lại HTML/ZIP để chỉnh code.')
    }
    return crmResponse({ template: { id: template.id, name: template.name, description: template.description || '', sourceType: template.sourceType, updatedAt: template.updatedAt }, source })
  } catch (error) { return failure(error) }
}
/** Chỉ giữ GET để đọc mã của trang cũ; mọi đường lưu kho cũ đều đóng. */
export async function POST() {
  try {
    await admin()
    return crmResponse({ error: 'Đã ngừng lưu kho mẫu cũ. Hãy chỉnh code trực tiếp trong khóa học.' }, 410)
  } catch (error) { return failure(error) }
}
