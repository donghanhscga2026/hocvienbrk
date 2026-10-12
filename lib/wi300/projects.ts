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
export const projectContent = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().min(3).max(300),
  introduction: z.string().trim().max(10000),
  logo: url,
  website: url,
  courseIds: z.array(z.number().int().positive()).max(100).refine(ids => new Set(ids).size === ids.length, 'Khóa học bị trùng.'),
  offerings: z.array(z.object({ kind: z.enum(['PRODUCT', 'SERVICE']), name: z.string().trim().min(2).max(150), description: z.string().trim().max(500), url: url.refine(value => !!value, 'Vui lòng nhập đường dẫn.') }).strict()).max(30),
}).strict()
export const projectControls = z.object({ ownerId: z.number().int().min(0).nullable(), published: z.boolean(), featured: z.boolean(), order: z.number().int().min(0).max(999) }).strict()
export const projectRecord = projectContent.extend({ ...projectControls.shape, revision: z.number().int().min(0) }).strict()
export type WiProject = z.infer<typeof projectRecord> & { slug: string }
export const projectDefaults: WiProject[] = [
  ['wi-art', 'WiArt', 'Nghệ thuật và sáng tạo', '/wi300/businesses/wi-art.webp'],
  ['wi-mentor', 'Wi.Mentor', 'Cố vấn và đồng hành', '/wi300/businesses/wi-mentor.webp'],
  ['wi-tech', 'Wi.Tech', 'Công nghệ và giải pháp số', '/wi300/businesses/wi-tech.png'],
  ['wi-grow', 'Wi.Grow', 'Phát triển cùng doanh nghiệp', '/wi300/businesses/wi-grow.png'],
  ['wi-finance', 'Wi.Finance', 'Tài chính và dòng tiền', '/wi300/businesses/wi-finance.webp'],
  ['wi-marketing', 'Wi.Marketing', 'Marketing và kết nối khách hàng', '/wi300/businesses/wi-marketing.webp'],
  ['wi-can', 'WiCan', 'Kết nối trong hệ sinh thái Wi', ''],
].map(([slug, name, description, logo], order) => ({ slug, name, description, logo, introduction: '', website: '', ownerId: null, published: true, featured: true, order, revision: 0, courseIds: [], offerings: [] }))
export function mergeProjects(rows: { key: string; value: unknown }[]): WiProject[] {
  const saved = new Map(rows.map(row => [row.key, row.value]))
  return projectDefaults.map(project => {
    const value = saved.get(PROJECT_PREFIX + project.slug)
    if (value === undefined) return { ...project }
    // Dữ liệu hỏng không được biến thành một dự án công khai bằng fallback.
    return { slug: project.slug, ...projectRecord.parse(value) }
  }).sort((a, b) => a.order - b.order || a.slug.localeCompare(b.slug))
}
export function publicProject(project: WiProject) {
  const { ownerId, revision, ...publicData } = project
  void ownerId; void revision
  return publicData
}
export type PublicWiProject = ReturnType<typeof publicProject>
