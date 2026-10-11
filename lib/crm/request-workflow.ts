import type { Prisma } from '@prisma/client'

export const PARTNER_SOURCE = 'Wi300: Đăng ký đối tác'
export const ACCOUNT_SUPPORT_SOURCE = 'Hỗ trợ tài khoản: Khách chưa đăng nhập'
export const FEEDBACK_SOURCE = 'Góp ý thành viên'
export const REQUEST_TOPICS = { PARTNER: 'Đăng ký đối tác', LEARNING: 'Bài học', CONSULTATION: 'Tư vấn', SUPPORT: 'Hỗ trợ', FEEDBACK: 'Góp ý', ACCOUNT: 'Hỗ trợ tài khoản' } as const
export const PARTNER_OUTCOMES = { PENDING: 'Chưa đánh giá', MORE_INFO: 'Cần bổ sung hồ sơ', ACCEPTED: 'Chấp thuận', DECLINED: 'Chưa phù hợp' } as const
export const REQUEST_ACTIONS = { UPDATE: 'Cập nhật xử lý', SEND_REPLY: 'Gửi phản hồi', REMIND: 'Nhắc người phụ trách', CUSTOMER_REPLY: 'Khách bổ sung thông tin', STUDENT_REOPENED: 'Khách mở lại yêu cầu' } as const
export type RequestTopic = keyof typeof REQUEST_TOPICS
export type RequestEvent = { action: string; changedBy: number; authorName?: string; changedAt: string; content?: string; status?: string; ownerId?: number | null; outcome?: keyof typeof PARTNER_OUTCOMES }
export function requestTopic(row: { source: string; category: string }): RequestTopic {
  if (row.source === PARTNER_SOURCE) return 'PARTNER'
  if (row.source === ACCOUNT_SUPPORT_SOURCE) return 'ACCOUNT'
  if (row.source === FEEDBACK_SOURCE) return 'FEEDBACK'
  return row.category === 'LEARNING' ? 'LEARNING' : row.category === 'SUPPORT' ? 'SUPPORT' : 'CONSULTATION'
}
export function topicScope(topic: RequestTopic): Prisma.CrmRequestWhereInput {
  if (topic === 'PARTNER') return { source: PARTNER_SOURCE }
  if (topic === 'ACCOUNT') return { source: ACCOUNT_SUPPORT_SOURCE }
  if (topic === 'FEEDBACK') return { source: FEEDBACK_SOURCE }
  return { category: topic, source: { notIn: [PARTNER_SOURCE, ACCOUNT_SUPPORT_SOURCE, FEEDBACK_SOURCE] } }
}
export function requestEvents(history: unknown): RequestEvent[] {
  return Array.isArray(history) ? history.filter((event): event is RequestEvent => event != null && typeof event === 'object' && typeof event.action === 'string' && typeof event.changedAt === 'string' && typeof event.changedBy === 'number') : []
}
export function partnerOutcome(history: unknown) {
  return requestEvents(history).filter(event => event.outcome).at(-1)?.outcome || 'PENDING'
}
export function publicRequestThread(history: unknown) {
  // Chiếu từng trường công khai; không trả các snapshot hay ghi chú nội bộ.
  return requestEvents(history).filter(event => ['SEND_REPLY', 'CUSTOMER_REPLY'].includes(event.action)).map(event => ({ action: event.action, changedAt: event.changedAt, content: event.content || '' }))
}
