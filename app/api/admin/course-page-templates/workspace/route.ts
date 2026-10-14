import { randomUUID } from 'node:crypto'
import { gunzipSync } from 'node:zlib'
import { z, ZodError } from 'zod'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { supabase } from '@/lib/supabase'
import { domainContext } from '@/lib/website/domain-context'
import { CrmError } from '@/lib/crm/service'
import { crmResponse } from '@/lib/crm/http'
import { compileTemplateSource, templateSourceSchema, sourceFromHtml } from '@/lib/course-page/template-source'
import { analyzeWebsiteHtml } from '@/lib/course-page/importer/html-analyzer'
import { compactExactAnalysis } from '@/lib/course-page/importer/compact-analysis'
import { isImportedRegistrationSection } from '@/lib/course-page/importer/registration'
import { fetchRemoteHtml } from '@/lib/course-page/importer/fetch-html'
import { prepareStandaloneHtml } from '@/lib/course-page/importer/prepare-html'
import { parse, serialize } from 'parse5'
import { zipSelectedBlockKeys } from '@/lib/course-page/importer/source-url'
import { buildEditableTemplateSnapshot } from '@/app/actions/course-page-template-actions'

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
    if (!response.ok || !response.body) throw new CrmError('Không tải được mã mẫu đã lưu.', 502)
    const reader = response.body.getReader(), chunks: Uint8Array[] = []; let size = 0
    while (true) { const next = await reader.read(); if (next.done) break; size += next.value.length; if (size > 9 * 1024 * 1024) { await reader.cancel(); throw new CrmError('Nguồn mẫu quá lớn.') }; chunks.push(next.value) }
    return Buffer.concat(chunks).toString('utf8')
  } finally { clearTimeout(timer) }
}
export async function GET(request: Request) {
  try {
    await admin()
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
    if (analysis?.editorSourceUrl) source = templateSourceSchema.parse(JSON.parse(await readSource(analysis.editorSourceUrl, 'json')))
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
const inputSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('import-url'), url: z.string().url().startsWith('https://') }).strict(),
  z.object({ action: z.literal('prepare-html'), html: z.string().max(8 * 1024 * 1024) }).strict(),
  z.object({ action: z.literal('save'), id: z.string().max(100).optional(), expectedUpdatedAt: z.string().datetime().optional(), name: z.string().trim().min(1).max(150), description: z.string().trim().max(1000).default(''), sourceType: z.enum(['html', 'zip', 'url']).default('html'), source: templateSourceSchema }).strict(),
])
async function body(request: Request) {
  const url = new URL(request.url), host = request.headers.get('host') || url.host
  if (request.headers.get('origin') !== `${url.protocol}//${host}`) throw new CrmError('Nguồn yêu cầu không hợp lệ.', 403)
  const contentType = request.headers.get('content-type') || ''
  if (!/application\/(json|gzip)/.test(contentType)) throw new CrmError('Yêu cầu phải là JSON hoặc gzip.', 415)
  const reader = request.body?.getReader(); if (!reader) throw new CrmError('Thiếu nội dung.')
  const chunks: Uint8Array[] = []; let size = 0
  while (true) { const next = await reader.read(); if (next.done) break; size += next.value.length; if (size > 4 * 1024 * 1024) { await reader.cancel(); throw new CrmError('Dữ liệu gửi vượt 4 MB.', 413) }; chunks.push(next.value) }
  const bytes = Buffer.concat(chunks)
  let decoded
  try { decoded = contentType.includes('gzip') ? gunzipSync(bytes, { maxOutputLength: 10 * 1024 * 1024 }) : bytes }
  catch { throw new CrmError('File gzip không hợp lệ hoặc vượt giới hạn.', 400) }
  return inputSchema.parse(JSON.parse(decoded.toString('utf8')))
}
async function upload(name: string, text: string, contentType: string) {
  const path = `course-template-sources/${name}`
  const { error } = await supabase.storage.from('uploads').upload(path, Buffer.from(text), { contentType, upsert: false, cacheControl: '31536000' })
  if (error) throw new CrmError('Không lưu được file mẫu vào kho dữ liệu. Mã đang sửa được giữ lại.', 502)
  return supabase.storage.from('uploads').getPublicUrl(path).data.publicUrl
}
export async function POST(request: Request) {
  try {
    await admin()
    const input = await body(request)
    if (input.action === 'prepare-html') {
      let prepared
      try { prepared = await prepareStandaloneHtml(input.html) }
      catch (error) { throw new CrmError(error instanceof Error ? error.message : 'Không đọc được HTML.') }
      const original = parse(input.html) as any, compiled = parse(prepared.html) as any
      let compiledStyle: any, head: any
      const visit = (node: any, fn: (node: any) => void) => { fn(node); for (const child of [...node.childNodes || []]) visit(child, fn) }
      visit(compiled, node => { if (node.tagName === 'style' && node.attrs?.some((attr: any) => attr.name === 'data-mfc-compiled-tailwind')) compiledStyle = node })
      visit(original, node => {
        if (node.tagName === 'head') head = node
        if (node.tagName !== 'script') return
        const src = node.attrs?.find((attr: any) => attr.name === 'src')?.value || ''
        const text = (node.childNodes || []).map((child: any) => child.value || '').join('')
        if (/cdn\.tailwindcss\.com/.test(src) || /tailwind\s*\.\s*config\s*=/.test(text)) node.parentNode.childNodes = node.parentNode.childNodes.filter((child: any) => child !== node)
      })
      if (compiledStyle) { compiledStyle.parentNode = head; head.childNodes.push(compiledStyle) }
      return crmResponse({ source: sourceFromHtml('<!doctype html>' + serialize(original)), warnings: ['Tailwind CDN đã chuyển thành CSS. Bạn có thể sửa CSS trực tiếp; nếu thêm lớp Tailwind mới, biên dịch CSS và nhập lại.'] })
    }
    if (input.action === 'import-url') {
      const remote = await fetchRemoteHtml(input.url)
      return crmResponse({ source: { ...sourceFromHtml(remote.html), baseUrl: remote.finalUrl }, warnings: ['CSS/ảnh ngoài vẫn dùng URL nguồn. Nếu cần đủ file JavaScript, hãy nhập ZIP mã nguồn.'] })
    }
    if (input.id && !input.expectedUpdatedAt) throw new CrmError('Thiếu phiên bản mẫu. Hãy tải lại.', 409)
    if (input.id) {
      const current = await prisma.coursePageTemplate.findUnique({ where: { id: input.id }, select: { updatedAt: true } })
      if (!current || current.updatedAt.toISOString() !== input.expectedUpdatedAt) throw new CrmError('Mẫu đã thay đổi. Hãy tải lại hoặc lưu thành mẫu mới.', 409)
    }
    let compiled
    try { compiled = compileTemplateSource(input.source) }
    catch (error) { throw new CrmError(error instanceof Error ? error.message : 'Mã nguồn không hợp lệ.') }
    const analysis = analyzeWebsiteHtml({ html: compiled.analysisHtml, sourceType: input.sourceType })
    const ids = analysis.sections.filter(section => !isImportedRegistrationSection(section)).map(section => section.id)
    if (!ids.length) throw new CrmError('Mẫu chưa có nội dung ngoài form đăng ký.')
    const revision = randomUUID()
    const [htmlUrl, editorSourceUrl] = await Promise.all([upload(`${revision}.html`, compiled.html, 'text/html; charset=utf-8'), upload(`${revision}.json`, JSON.stringify(input.source), 'application/json')])
    analysis.exactSource = { url: htmlUrl, entryPath: input.source.entryPath, fileCount: input.source.files.length }
    const compact = compactExactAnalysis({ ...analysis, sourceType: input.sourceType === 'url' ? 'html' : input.sourceType }), snapshot = await buildEditableTemplateSnapshot(input.name, compact, ids)
    const data = { name: input.name, description: input.description || null, sourceType: input.sourceType, sourceUrl: htmlUrl, thumbnailUrl: null, snapshot: JSON.parse(JSON.stringify(snapshot)), analysis: JSON.parse(JSON.stringify({ ...compact, editorSourceUrl, sections: compact.sections.map(section => ({ ...section, enabled: ids.includes(section.id) })) })) }
    const template = await prisma.$transaction(async tx => {
      if (!input.id) return tx.coursePageTemplate.create({ data: { ...data, key: `custom-editor-${revision}` } })
      const changed = await tx.coursePageTemplate.updateMany({ where: { id: input.id, updatedAt: new Date(input.expectedUpdatedAt!) }, data })
      if (changed.count !== 1) throw new CrmError('Mẫu đã thay đổi ở cửa sổ khác. Hãy tải lại hoặc lưu thành mẫu mới.', 409)
      return tx.coursePageTemplate.findUniqueOrThrow({ where: { id: input.id } })
    })
    return crmResponse({ template: { id: template.id, name: template.name, description: template.description, sourceType: template.sourceType, updatedAt: template.updatedAt }, warnings: compiled.warnings })
  } catch (error) { return failure(error) }
}
