import { z } from 'zod'
export const serviceModels = {
  SESSIONS: 'Theo buổi / lịch hẹn',
  PROJECT: 'Theo dự án / bàn giao',
  QUANTITY: 'Theo yêu cầu / số lượng',
  RECURRING: 'Định kỳ',
  HYBRID: 'Kết hợp / tùy chỉnh',
} as const
export const serviceSchema = z
  .object({
    saleMode: z.enum(['QUOTE', 'PACKAGE']).default('PACKAGE'),
    category: z.string().trim().max(120).default(''),
    model: z.enum(['SESSIONS', 'PROJECT', 'QUANTITY', 'RECURRING', 'HYBRID']),
    blocks: z
      .array(z.enum(['SESSIONS', 'PROJECT', 'QUANTITY', 'RECURRING']))
      .max(4)
      .default([]),
    scope: z.string().trim().max(3000).default(''),
    deliverables: z.string().trim().max(2000).default(''),
    inputs: z.string().trim().max(2000).default(''),
    startCondition: z.string().trim().max(1000).default(''),
    turnaround: z.string().trim().max(200).default(''),
    warranty: z.string().trim().max(200).default(''),
    revisions: z.number().int().min(0).max(1000).default(0),
    quantity: z.number().int().min(1).max(1000000).default(1),
    unit: z.string().trim().max(120).default(''),
    cycle: z.string().trim().max(120).default('Hằng tháng'),
    term: z.string().trim().max(200).default(''),
    responseTime: z.string().trim().max(200).default(''),
    exclusions: z.string().trim().max(2000).default(''),
    extraSessions: z.boolean().default(false),
    fields: z
      .array(
        z.object({
          label: z.string().trim().min(1).max(120),
          value: z.string().trim().max(1000),
          public: z.boolean().default(true),
        }),
      )
      .max(20)
      .default([]),
    questions: z
      .array(
        z
          .object({
            id: z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/),
            label: z.string().trim().min(1).max(200),
            type: z.enum(['TEXT', 'SELECT', 'LINK']),
            required: z.boolean().default(false),
            options: z.array(z.string().trim().min(1).max(120)).max(20).default([]),
          })
          .refine((q) => q.type !== 'SELECT' || q.options.length > 0, 'Thêm lựa chọn cho câu hỏi.'),
      )
      .max(20)
      .refine(
        (items) => new Set(items.map((item) => item.id)).size === items.length,
        'Mỗi câu hỏi cần mã riêng.',
      )
      .default([]),
  })
  .strict()
  .refine(
    (config) => config.model !== 'HYBRID' || config.blocks.length > 0,
    'Chọn ít nhất một phần cho gói kết hợp.',
  )
export type ServiceConfig = z.infer<typeof serviceSchema>
export function isQuoteService(details: { service?: ServiceConfig }) { return details.service?.saleMode === 'QUOTE' }
export function effectiveService(details: { kind: string; service?: ServiceConfig }): ServiceConfig {
  return (
    details.service ||
    serviceSchema.parse({ model: details.kind === 'IMPLEMENTATION' ? 'PROJECT' : 'SESSIONS' })
  )
}
export function serviceHasSessions(details: { kind: string; service?: ServiceConfig }) {
  if (isQuoteService(details)) return false
  const config = effectiveService(details)
  return (
    config.model === 'SESSIONS' ||
    config.extraSessions ||
    (config.model === 'HYBRID' && config.blocks.includes('SESSIONS'))
  )
}
export function serviceFacts(config: ServiceConfig) {
  if (config.saleMode === 'QUOTE') return [['Đăng ký', 'Trao đổi theo nhu cầu'], ...(config.category ? [['Loại dịch vụ',config.category]] : []), ['Giá','Liên hệ báo giá']]
  const has = (model: keyof typeof serviceModels) =>
    config.model === model || (config.model === 'HYBRID' && config.blocks.includes(model as 'PROJECT'))
  return [
    ['Cách cung cấp', serviceModels[config.model]],
    ...(config.category ? [['Loại dịch vụ', config.category]] : []),
    ...(config.scope ? [['Phạm vi', config.scope]] : []),
    ...(config.deliverables ? [['Bàn giao', config.deliverables]] : []),
    ...(has('PROJECT') || has('QUANTITY')
      ? [
          ['Thời gian thực hiện', config.turnaround],
          ['Chỉnh sửa', `${config.revisions} vòng`],
        ]
      : []),
    ...(has('QUANTITY') || has('RECURRING') ? [['Khối lượng', `${config.quantity} ${config.unit}`]] : []),
    ...(has('RECURRING')
      ? [
          ['Chu kỳ', config.cycle],
          ['Thời hạn gói', config.term],
          ['Phản hồi', config.responseTime],
        ]
      : []),
    ...(config.warranty ? [['Bảo hành', config.warranty]] : []),
    ...(config.exclusions ? [['Ngoài phạm vi', config.exclusions]] : []),
    ...config.fields.filter((field) => field.public).map((field) => [field.label, field.value]),
  ].filter(([, value]) => value)
}
