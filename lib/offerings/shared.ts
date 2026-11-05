import { z } from 'zod'
import { serviceSchema, serviceFacts, serviceHasSessions, effectiveService, isQuoteService } from './service'

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
export const offeringKinds = { COMBO: 'Combo', APP: 'App', EBOOK: 'Ebook', TEMPLATE: 'Template', RESOURCE: 'Bộ tài nguyên', COACHING: 'Coaching', CONSULTING: 'Tư vấn', IMPLEMENTATION: 'Hỗ trợ triển khai', OTHER: 'Khác' } as const
const safeUrl = z.string().trim().max(2000).refine(value => !value || (value.startsWith('/') && !value.startsWith('//') && !/[\\\s]/.test(value)) || (() => { try { return new URL(value).protocol === 'https:' } catch { return false } })(), 'Dùng đường dẫn nội bộ hoặc URL https hợp lệ.')
export const workspaceLayouts = { AUTO: 'Tự chọn theo loại', LIBRARY: 'Thư viện tài nguyên', APP: 'Không gian App', SESSIONS: 'Dịch vụ theo buổi', DELIVERY: 'Triển khai & Bàn giao' } as const
export const workspaceModules = { resources: 'Tài nguyên', instructions: 'Hướng dẫn / Chuẩn bị', bookings: 'Lịch hẹn', conversation: 'Trao đổi & Hỗ trợ', delivery: 'Tiến độ & Bàn giao' } as const
export const deliveryStateSchema = z.object({ version: z.number().int().min(0).default(0), phase: z.enum(['NEW', 'IN_PROGRESS', 'REVIEW', 'COMPLETED']).default('NEW'), note: z.string().trim().max(4000).default(''), requirements: z.string().trim().max(5000).default(''), history: z.array(z.object({ at: z.string().datetime(), phase: z.enum(['NEW', 'IN_PROGRESS', 'REVIEW', 'COMPLETED']), actorId: z.number().int().min(0) })).max(30).default([]), files: z.array(z.object({ title: z.string().trim().min(1).max(200), url: safeUrl.refine(Boolean, 'Nhập liên kết bàn giao.') })).max(30).default([]) }).strict()
export const deliveryLabels = { ONLINE: 'Trực tuyến', DOWNLOAD: 'Tải về', BOTH: 'Trực tuyến / tải về' }
export const deliveryPhaseLabels = { NEW: 'Tiếp nhận', IN_PROGRESS: 'Đang thực hiện', REVIEW: 'Chờ khách duyệt', COMPLETED: 'Đã bàn giao' }
export const offeringDetailsSchema = z.object({
  service: serviceSchema.optional(),
  kind: z.enum(['COMBO', 'APP', 'EBOOK', 'TEMPLATE', 'RESOURCE', 'COACHING', 'CONSULTING', 'IMPLEMENTATION', 'OTHER']).default('OTHER'),
  bundleItems: z.array(z.object({ courseId: z.number().int().positive(), gift: z.boolean().default(false) })).max(50).default([]).refine(items => new Set(items.map(item => item.courseId)).size === items.length, 'Mỗi món chỉ được chọn một lần.'),
  accessUrl: safeUrl.default(''),
  accessDays: z.number().int().min(0).max(36500).default(0),
  instructions: z.string().trim().max(5000).default(''),
  sessions: z.number().int().min(1).max(1000).default(1),
  durationMin: z.number().int().min(5).max(1440).default(60),
  mode: z.enum(['ONLINE', 'OFFLINE', 'HYBRID']).default('ONLINE'),
  bookingCode: z.string().trim().max(100).regex(/^[a-zA-Z0-9_-]*$/).default(''),
  salesLayout: z.enum(['DEFAULT', 'TEMPLATE']).default('DEFAULT'),
  workspaceLayout: z.enum(['AUTO', 'LIBRARY', 'APP', 'SESSIONS', 'DELIVERY']).default('AUTO'),
  modules: z.array(z.enum(['resources', 'instructions', 'bookings', 'conversation', 'delivery'])).max(5).default(['resources', 'instructions', 'bookings', 'conversation', 'delivery']).transform(items => [...new Set(items)]),
  format: z.string().trim().max(160).default(''),
  platform: z.string().trim().max(160).default(''),
  language: z.string().trim().max(80).default(''),
  delivery: z.enum(['ONLINE', 'DOWNLOAD', 'BOTH']).default('ONLINE'),
  audience: z.enum(['INDIVIDUAL', 'GROUP']).default('INDIVIDUAL'),
  benefits: z.array(z.string().trim().max(240)).max(6).default([]).transform(items => items.filter(Boolean)),
  agenda: z.array(z.object({ title: z.string().trim().min(1).max(160), description: z.string().trim().max(2000) })).max(30).default([]),
  resources: z.array(z.object({ title: z.string().trim().min(1).max(200), kind: z.enum(['EBOOK', 'APP', 'TEMPLATE', 'GUIDE', 'RESOURCE', 'PROMPT', 'VIDEO']), viewer: z.enum(['LINK', 'PDF']).default('LINK'), url: safeUrl.refine(value => !!value, 'Nhập đường dẫn tài nguyên.'), instructions: z.string().trim().max(5000).default(''), guideUrl: safeUrl.default(''), description: z.string().trim().max(1000).optional(), iconUrl: safeUrl.optional(), openMode: z.enum(['EMBED', 'NEW_TAB']).optional(), guides: z.array(z.object({ title: z.string().trim().min(1).max(200), kind: z.enum(['TEXT', 'VIDEO', 'DOCS', 'PDF']), content: z.string().trim().max(5000).default(''), url: safeUrl.default('') }).refine(item => item.kind === 'TEXT' ? !!item.content : !!item.url, 'Nhập nội dung hoặc liên kết hướng dẫn.')).max(30).optional() })).max(100).default([]),
}).strict()
export type OfferingDetails = z.infer<typeof offeringDetailsSchema>
export const emptyOfferingDetails: OfferingDetails = offeringDetailsSchema.parse({})
export function parseOfferingDetails(value: unknown): OfferingDetails {
  return offeringDetailsSchema.parse(value)
}
// Không đưa đường dẫn tài nguyên hoặc hướng dẫn sau mua vào danh mục công khai.
export function publicOfferingDetails(details: OfferingDetails) {
  const { kind, accessDays, sessions, durationMin, mode, format, platform, language, delivery, audience } = details
  const service = details.service ? { ...details.service, fields: details.service.fields.filter(field => field.public), questions: isQuoteService(details) ? details.service.questions : [], inputs: '', startCondition: '' } : undefined
  return { kind, accessDays, sessions, durationMin, mode, format, platform, language, delivery, audience, service }
}
export const modeLabels = { ONLINE: 'Online', OFFLINE: 'Trực tiếp', HYBRID: 'Online & trực tiếp' }
export const resourceLabels = { EBOOK: 'Ebook', APP: 'Công cụ / App', TEMPLATE: 'Template', GUIDE: 'Hướng dẫn', RESOURCE: 'Tài nguyên', PROMPT: 'Prompt', VIDEO: 'Video' }
export function offeringWorkspaceHref(group: unknown, slug: string) { return offeringHref(group, slug) + '/su-dung' }
export function resolvedWorkspace(group: string, details: OfferingDetails) { return details.workspaceLayout !== 'AUTO' ? details.workspaceLayout : group === 'SERVICE' ? effectiveService(details).model === 'SESSIONS' ? 'SESSIONS' : 'DELIVERY' : details.kind === 'APP' ? 'APP' : 'LIBRARY' }
export function offeringFacts(group: string, details: ReturnType<typeof publicOfferingDetails>) {
  if (details.kind === 'COMBO') return [['Bao gồm', details.format || 'Các món trong gói'], ['Thời hạn', 'Theo từng món'], ['Kích hoạt', 'Sau khi combo được kích hoạt']]
  return group === 'SERVICE'
    ? [...(details.service ? serviceFacts(details.service) : []), ...(serviceHasSessions(details) ? details.service && details.service.model !== 'SESSIONS' ? [['Buổi tư vấn / hướng dẫn đi kèm', `${details.sessions} buổi · ${details.durationMin} phút/buổi`]] : [['Hình thức', modeLabels[details.mode]], ['Đồng hành', details.audience === 'GROUP' ? 'Theo nhóm' : '1:1'], ['Thời lượng', `${details.sessions} buổi · ${details.durationMin} phút/buổi`]] : [])]
    : [['Bao gồm', details.format || offeringKinds[details.kind]], ['Truy cập', deliveryLabels[details.delivery]], ['Thời hạn', details.accessDays ? `${details.accessDays} ngày từ khi kích hoạt` : 'Không giới hạn'], ...(details.platform ? [['Nền tảng', details.platform]] : []), ...(details.language ? [['Ngôn ngữ', details.language]] : [])]
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
