import { z } from 'zod'

export const productGroups = ['COURSE', 'DIGITAL', 'SERVICE'] as const
export type ProductGroup = typeof productGroups[number]
export function productGroup(value: unknown): ProductGroup {
  return value === 'DIGITAL' || value === 'SERVICE' ? value : 'COURSE'
}
export const groupInfo = {
  COURSE: { label: 'Khóa học', singular: 'khóa học', catalog: '/khoa-hoc', manager: '/tools/courses', description: 'Chương trình học, bài giảng và học viên.' },
  DIGITAL: { label: 'Sản phẩm số', singular: 'sản phẩm số', catalog: '/san-pham', manager: '/tools/products', description: 'App, Ebook, Template và tài nguyên sử dụng ngay.' },
  SERVICE: { label: 'Dịch vụ', singular: 'dịch vụ', catalog: '/dich-vu', manager: '/tools/services', description: 'Coaching, tư vấn và đồng hành cùng chuyên gia.' },
} as const
export const offeringKinds = { APP: 'App', EBOOK: 'Ebook', TEMPLATE: 'Template', RESOURCE: 'Tài nguyên', COACHING: 'Coaching', CONSULTING: 'Tư vấn', OTHER: 'Khác' } as const
const safeUrl = z.string().trim().max(2000).refine(value => !value || (value.startsWith('/') && !value.startsWith('//') && !/[\\\s]/.test(value)) || (() => { try { return new URL(value).protocol === 'https:' } catch { return false } })(), 'Dùng đường dẫn nội bộ hoặc URL https hợp lệ.')
export const offeringDetailsSchema = z.object({
  kind: z.enum(['APP', 'EBOOK', 'TEMPLATE', 'RESOURCE', 'COACHING', 'CONSULTING', 'OTHER']).default('OTHER'),
  accessUrl: safeUrl.default(''),
  accessDays: z.number().int().min(0).max(36500).default(0),
  instructions: z.string().trim().max(5000).default(''),
  sessions: z.number().int().min(1).max(1000).default(1),
  durationMin: z.number().int().min(5).max(1440).default(60),
  mode: z.enum(['ONLINE', 'OFFLINE', 'HYBRID']).default('ONLINE'),
  bookingCode: z.string().trim().max(100).regex(/^[a-zA-Z0-9_-]*$/).default(''),
}).strict()
export type OfferingDetails = z.infer<typeof offeringDetailsSchema>
export const emptyOfferingDetails: OfferingDetails = offeringDetailsSchema.parse({})
export function parseOfferingDetails(value: unknown): OfferingDetails {
  return offeringDetailsSchema.parse(value)
}
// Không đưa đường dẫn tài nguyên hoặc hướng dẫn sau mua vào danh mục công khai.
export function publicOfferingDetails(details: OfferingDetails) {
  const { kind, accessDays, sessions, durationMin, mode } = details
  return { kind, accessDays, sessions, durationMin, mode }
}
export function offeringHref(group: unknown, slug: string) {
  return groupInfo[productGroup(group)].catalog + '/' + encodeURIComponent(slug)
}
export function offeringAccess(enrollment: { status: string; activatedAt?: Date | null; payment?: { verifiedAt: Date | null } | null } | null, accessDays: number, now = Date.now()) {
  if (!enrollment || !['ACTIVE', 'COMPLETED'].includes(enrollment.status)) return false
  const activated = enrollment.activatedAt || enrollment.payment?.verifiedAt
  // Giữ quyền cũ nếu bản ghi lịch sử chưa có thời điểm kích hoạt đáng tin cậy.
  return !accessDays || !activated || now < new Date(activated).getTime() + accessDays * 86400000
}
