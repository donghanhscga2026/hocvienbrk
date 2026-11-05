import { z } from 'zod'

const money = z.number().int().min(1000).max(1000000000)
export const quoteDraftSchema = z.object({
  title: z.string().trim().min(1).max(200),
  scope: z.string().trim().min(1).max(6000),
  total: money,
  terms: z.string().trim().max(3000).default(''),
  installments: z.array(z.object({ label: z.string().trim().min(1).max(120), amount: money }).strict()).min(1).max(6),
}).strict().refine(value => value.installments.reduce((sum, part) => sum + part.amount, 0) === value.total, 'Tổng các đợt phải bằng tổng báo giá.')
export const quoteSchema = z.object({
  requestId: z.uuid(), version: z.number().int().nonnegative(),
  status: z.enum(['DRAFT', 'SENT', 'ACCEPTED', 'CANCELLED']),
  courseId: z.number().int().positive(), slug: z.string(), ownerId: z.number().int().nonnegative(), buyerId: z.number().int().nonnegative(),
  title: z.string(), scope: z.string(), total: z.number(), terms: z.string(),
  customerName: z.string(), ownerName: z.string(),
  affiliateId: z.number().int().nonnegative().nullable(), refCode: z.string().nullable(), gratitudeId: z.number().int().nonnegative().nullable(),
  bank: z.object({ id: z.number().int(), accountNumber: z.string(), accountHolder: z.string(), bankName: z.string() }).nullable(),
  installments: z.array(z.object({ label: z.string(), amount: z.number(), code: z.string(), orderId: z.number().int().nullable(), paidAt: z.string().nullable(), reportedAt: z.string().nullable() })),
  updatedAt: z.string(), acceptedAt: z.string().nullable(),
})
export type ServiceQuote = z.infer<typeof quoteSchema>
export const quoteStatusLabels = { DRAFT: 'Bản nháp', SENT: 'Chờ khách xác nhận', ACCEPTED: 'Đã xác nhận', CANCELLED: 'Đã hủy' }
export const quoteMoney = (amount: number) => amount.toLocaleString('vi-VN') + 'đ'
export const quoteKey = (id: string) => 'catalog:service-quote:' + id
