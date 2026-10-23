import { z } from 'zod'

// Mỗi dự án có khóa riêng; không ghi đè cấu hình website hoặc hồ sơ cá nhân.
export const PROJECT_PREFIX = 'wi300:project:v1:'
export function safeProjectUrl(value: string) {
  if (!value) return true
  if (/[\\\s\u0000-\u001f]/.test(value)) return false
  if (/^\/(?!\/)/.test(value)) return true
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password } catch { return false }
}
const url = z.string().trim().max(1000).refine(safeProjectUrl, 'Dùng đường dẫn nội bộ hoặc https://, không chứa khoảng trắng.')
export const PROJECT_CATEGORIES = ['TECH', 'FINANCE', 'MARKETING', 'EDUCATION', 'ART', 'HEALTH', 'BUSINESS', 'OTHER'] as const
export const projectCategoryLabels: Record<(typeof PROJECT_CATEGORIES)[number], string> = { TECH: 'Công nghệ', FINANCE: 'Tài chính', MARKETING: 'Marketing', EDUCATION: 'Giáo dục', ART: 'Nghệ thuật', HEALTH: 'Sức khỏe', BUSINESS: 'Kinh doanh', OTHER: 'Khác' }
export const projectContent = z.object({
  category: z.enum(PROJECT_CATEGORIES).optional(),
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().min(3).max(300),
  introduction: z.string().trim().max(10000),
  logo: url,
  website: url,
  courseIds: z.array(z.number().int().positive()).max(100).refine(ids => new Set(ids).size === ids.length, 'Khóa học bị trùng.'),
  offerings: z.array(z.object({ kind: z.enum(['PRODUCT', 'SERVICE']), name: z.string().trim().min(2).max(150), description: z.string().trim().max(500), url: url.refine(value => !!value, 'Vui lòng nhập đường dẫn.') }).strict()).max(30),
}).strict()
export const projectControls = z.object({ ownerId: z.number().int().min(0).nullable(), published: z.boolean(), featured: z.boolean(), showOnHomepage: z.boolean().default(true), order: z.number().int().min(0).max(999) }).strict()
export const projectMembers = z.array(z.object({ userId: z.number().int().min(0), title: z.string().trim().max(100), visible: z.boolean(), canManage: z.boolean() }).strict()).max(50).refine(items => new Set(items.map(item => item.userId)).size === items.length, 'Thành viên bị trùng.')
export function canManageProject(project: WiProject, id: number, admin = false) {
  return admin || project.ownerId === id || !!project.members?.some(member => member.userId === id && member.canManage)
}
export const projectSlug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Đường dẫn chỉ dùng chữ thường không dấu, số và dấu gạch ngang.').min(2).max(80).refine(value => !['quan-ly', 'chu-du-an', 'noi-dung'].includes(value), 'Đường dẫn này dành cho hệ thống.')
export const projectRecord = projectContent.extend({ ...projectControls.shape, members: projectMembers.optional(), revision: z.number().int().min(0), deleted: z.boolean().optional() }).strict()
export type WiProject = z.infer<typeof projectRecord> & { slug: string }
export const projectDefaults: WiProject[] = [
  ['wi-art', 'WiArt', 'Nghệ thuật và sáng tạo', '/wi300/businesses/wi-art.webp'],
  ['wi-mentor', 'Wi.Mentor', 'Cố vấn và đồng hành', '/wi300/businesses/wi-mentor.webp'],
  ['wi-tech', 'Wi.Tech', 'Công nghệ và giải pháp số', '/wi300/businesses/wi-tech.png'],
  ['wi-grow', 'Wi.Grow', 'Phát triển cùng doanh nghiệp', '/wi300/businesses/wi-grow.png'],
  ['wi-finance', 'Wi.Finance', 'Tài chính và dòng tiền', '/wi300/businesses/wi-finance.webp'],
  ['wi-marketing', 'Wi.Marketing', 'Marketing và kết nối khách hàng', '/wi300/businesses/wi-marketing.webp'],
  ['wi-can', 'WiCan', 'Kết nối trong hệ sinh thái Wi', ''],
].map(([slug, name, description, logo], order) => ({ slug, name, description, logo, category: projectContent.shape.category.parse(({ 'wi-art': 'ART', 'wi-mentor': 'EDUCATION', 'wi-tech': 'TECH', 'wi-grow': 'BUSINESS', 'wi-finance': 'FINANCE', 'wi-marketing': 'MARKETING' } as Record<string, string>)[slug] || 'OTHER'), introduction: '', website: '', ownerId: null, published: true, featured: true, showOnHomepage: true, order, revision: 0, courseIds: [], offerings: [] }))
export function mergeProjects(rows: { key: string; value: unknown }[]): WiProject[] {
  const saved = new Map(rows.map(row => [row.key, row.value]))
  const projects = new Map<string, WiProject>(projectDefaults.map(project => [project.slug, { ...project, courseIds: [...project.courseIds], offerings: project.offerings.map(item => ({ ...item })), members: project.members?.map(member => ({ ...member })) }]))
  for (const [key, value] of saved) {
    const slug = projectSlug.parse(key.slice(PROJECT_PREFIX.length))
    // Giữ dấu xóa để dự án mặc định không tự xuất hiện lại khi tải trang.
    const record = projectRecord.parse(value)
    if (record.deleted) projects.delete(slug)
    else projects.set(slug, { slug, ...record, category: record.category ?? projectDefaults.find(project => project.slug === slug)?.category ?? 'OTHER' })
  }
  return [...projects.values()].sort((a, b) => a.order - b.order || a.slug.localeCompare(b.slug))
}
export function publicProject(project: WiProject) {
  const { ownerId, revision, deleted, members, ...publicData } = project
  void ownerId; void revision; void deleted; void members
  return publicData
}
export type PublicWiProject = ReturnType<typeof publicProject>
