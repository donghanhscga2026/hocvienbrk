import { z } from 'zod'

// Giữ loại khối cũ để bản nháp và website đã lưu vẫn đọc được.
export const kinds = ['container', 'heading', 'text', 'image', 'video', 'button', 'courses', 'course-hero', 'testimonials', 'posts', 'form', 'affiliate', 'html', 'imported-page', 'divider'] as const
export type Kind = typeof kinds[number]
export const labels: Record<Kind, string> = { container: 'Bố cục / cột', heading: 'Tiêu đề', text: 'Văn bản', image: 'Ảnh', video: 'Video', button: 'Nút', courses: 'Khóa học', 'course-hero': 'Khóa học chính', testimonials: 'Lời chứng thực', posts: 'Bài viết', form: 'Form tư vấn → CRM', affiliate: 'Nút affiliate', html: 'HTML / CSS', 'imported-page': 'Trang HTML / ZIP', divider: 'Đường phân cách' }
const color = z.string().regex(/^(#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})|transparent)$/i)
const safeLink = z.string().max(2000).refine(v => !v || /^https?:\/\/[^\s]+$/i.test(v) || /^\/(?!\/)[^\s\\]*$/.test(v) || /^#[\w-]+$/.test(v), 'Liên kết phải là HTTPS/HTTP, đường dẫn / hoặc #anchor.')
const fonts = z.enum(['inherit','sans-serif','serif','monospace'])
const styleSchema = z.object({ background: color.optional(), color: color.optional(), padding: z.number().min(0).max(240).optional(), gap: z.number().min(0).max(120).optional(), columns: z.number().int().min(1).max(6).optional(), fontSize: z.number().min(10).max(120).optional(), fontFamily: fonts.optional(), width: z.number().min(5).max(100).optional(), radius: z.number().min(0).max(100).optional(), maxWidth: z.number().min(200).max(2400).optional(), align: z.enum(['left', 'center', 'right']).optional(), minHeight: z.number().min(0).max(2000).optional() }).strict()
export type NodeStyle = z.infer<typeof styleSchema>
export interface WebsiteNode { id: string; kind: Kind; text: string; url: string; html: string; css: string; courseIds: number[]; style: NodeStyle; mobile: NodeStyle; children: WebsiteNode[] }
const nodeSchema: z.ZodType<WebsiteNode> = z.lazy(() => z.object({ id: z.string().regex(/^[\w-]{1,80}$/), kind: z.enum(kinds), text: z.string().max(20000), url: safeLink, html: z.string().max(100000), css: z.string().max(30000), courseIds: z.array(z.number().int().positive()).max(200), style: styleSchema, mobile: styleSchema, children: z.array(nodeSchema).max(200) }).strict())
export const documentSchema = z.object({ version: z.literal(1), name: z.string().trim().min(1).max(120), description: z.string().max(500), color, background: color, layout: z.object({ maxWidth: z.number().min(320).max(2400), padding: z.number().min(0).max(100), gap: z.number().min(0).max(120), fontFamily: fonts, showHeader: z.boolean(), showFooter: z.boolean() }).strict().default({ maxWidth: 1200, padding: 24, gap: 32, fontFamily: 'inherit', showHeader: true, showFooter: true }), pages: z.array(z.object({ id: z.string().regex(/^[\w-]{1,80}$/), title: z.string().trim().min(1).max(120), slug: z.string().regex(/^([a-z0-9]+(-[a-z0-9]+)*)?$/).max(80), nodes: z.array(nodeSchema).max(200) }).strict()).min(1).max(30) }).strict().superRefine((doc, ctx) => {
  const ids = new Set<string>(); const slugs = new Set<string>(); let count = 0
  const fail = (message: string) => ctx.addIssue({ code: 'custom', message })
  function walk(nodes: WebsiteNode[], depth: number) { if (depth > 8) { fail('Bố cục tối đa 8 cấp.'); return } for (const n of nodes) { count++; if(ids.has(n.id)) fail('ID thành phần bị trùng.'); ids.add(n.id); if(n.kind !== 'container' && n.children.length) fail('Chỉ bố cục mới chứa thành phần con.'); walk(n.children, depth + 1) } }
  for (const p of doc.pages) { if(ids.has(p.id)) fail('ID trang bị trùng.'); ids.add(p.id); if(slugs.has(p.slug)) fail('Đường dẫn trang bị trùng.'); slugs.add(p.slug); walk(p.nodes, 1) }
  if(!slugs.has('')) fail('Website cần một trang chủ có đường dẫn trống.')
  if(count > 500) fail('Website tối đa 500 thành phần.')
})
export type WebsiteDocument = z.infer<typeof documentSchema>
export function documentError(error: unknown) { return error instanceof z.ZodError ? error.issues[0]?.message || 'Thiết kế không hợp lệ.' : error instanceof Error ? error.message : 'Không thể xử lý thiết kế.' }
export function parseDocument(raw: unknown): WebsiteDocument {
  // Guard recursion before Zod evaluates the recursive schema, including imports.
  const fail = (message: string): never => { throw new z.ZodError([{ code: 'custom', path: [], message }]) }
  if (raw == null) fail('Thiếu thiết kế website.')
  if (new TextEncoder().encode(JSON.stringify(raw)).length > 600000) fail('Website vượt giới hạn 600 KB.')
  function depth(value: unknown, level = 0) { if(level > 32) fail('JSON lồng quá sâu.'); if(value && typeof value === 'object') for(const v of Object.values(value)) depth(v, level + 1) }
  depth(raw)
  return documentSchema.parse(raw)
}
export const uid = () => 'n-' + crypto.randomUUID()
export function makeNode(kind: Kind): WebsiteNode { return { id: uid(), kind, text: kind === 'heading' ? 'Tiêu đề của bạn' : kind === 'button' ? 'Tìm hiểu thêm' : kind === 'form' ? 'Đăng ký tư vấn' : kind === 'text' ? 'Viết câu chuyện, giá trị và lời giới thiệu của bạn tại đây.' : labels[kind], url: '', html: '<h2>Thiết kế theo cách của bạn</h2><p>Chèn HTML và CSS tại đây.</p>', css: 'body { font-family: sans-serif; padding: 24px; }', courseIds: [], style: kind === 'container' ? { padding: 24, gap: 20, columns: 1 } : {}, mobile: {}, children: [] } }
export function blankDocument(name = 'Website của tôi'): WebsiteDocument { return { version: 1, name, description: '', color: '#7c3aed', background: '#ffffff', layout: { maxWidth: 1200, padding: 24, gap: 32, fontFamily: 'inherit', showHeader: true, showFooter: true }, pages: [{ id: uid(), title: 'Trang chủ', slug: '', nodes: [] }] } }
export function walkNodes(nodes: WebsiteNode[]): WebsiteNode[] { return nodes.flatMap(n => [n, ...walkNodes(n.children)]) }
export function updateNode(nodes: WebsiteNode[], id: string, update: (node: WebsiteNode) => WebsiteNode): WebsiteNode[] { return nodes.map(n => n.id === id ? update(n) : { ...n, children: updateNode(n.children, id, update) }) }
export function removeNode(nodes: WebsiteNode[], id: string): WebsiteNode[] { return nodes.filter(n => n.id !== id).map(n => ({ ...n, children: removeNode(n.children, id) })) }
export function cloneNode(node: WebsiteNode): WebsiteNode { return { ...structuredClone(node), id: uid(), children: node.children.map(cloneNode) } }
export function moveNode(nodes: WebsiteNode[], id: string, parent: string | null, before?: string): WebsiteNode[] {
  const source = walkNodes(nodes).find(n => n.id === id)
  if(!source || id === before || (parent && walkNodes([source]).some(n => n.id === parent))) return nodes
  if(parent && !walkNodes(nodes).some(n => n.id === parent && n.kind === 'container')) return nodes
  const removed = removeNode(nodes, id)
  function insert(list: WebsiteNode[]) { const index = before ? list.findIndex(n => n.id === before) : -1; const result = [...list]; result.splice(index < 0 ? list.length : index, 0, source!); return result }
  return parent ? updateNode(removed, parent, n => ({ ...n, children: insert(n.children) })) : insert(removed)
}
