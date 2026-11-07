/**
 * Care Engine GĐ2 — luật thuần của hẹn giờ theo dõi (không chạm DB,
 * test độc lập bằng scripts/test-care-followups.cjs).
 *
 * Nguyên tắc của demo đã duyệt: hẹn chỉ gửi khi học viên THẬT SỰ chưa
 * phản hồi. Bất kỳ hoạt động nào của học viên sau thời điểm đặt hẹn —
 * nộp/học bài mới, bình luận bài học, gửi yêu cầu CRM mới, hoặc đã nhận
 * 1 nhắc care khác — đều làm hẹn tự hủy để không ai bị nhắc thừa.
 * Mọi mốc thời gian ở đây là epoch milliseconds (thời điểm vật lý từ
 * new Date()), so sánh trực tiếp, không quy đổi múi giờ.
 */

export interface FollowUpFacts {
  /** Thời điểm đặt hẹn (epoch ms). */
  createdAt: number
  /** Thời điểm hẹn sẽ gửi nếu học viên không phản hồi (epoch ms). */
  dueAt: number
  /** Hoạt động học tập gần nhất của học viên trong khóa (epoch ms), null = chưa có. */
  lastProgressAt: number | null
  /** Bình luận bài học gần nhất của học viên (epoch ms), null = chưa có. */
  lastCommentAt: number | null
  /** Yêu cầu CRM gần nhất của học viên trong khóa (epoch ms), null = chưa có. */
  lastRequestAt: number | null
  /** Lần gần nhất học viên nhận nhắc care khác (epoch ms), null = chưa có. */
  lastCareReminderAt: number | null
}

export type FollowUpCancelReason = 'progress' | 'comment' | 'request' | 'care-reminder'

export type FollowUpDecision =
  | { decision: 'wait' }
  | { decision: 'send' }
  | { decision: 'cancel-auto'; reason: FollowUpCancelReason }

export const FOLLOW_UP_REASON_LABEL: Record<FollowUpCancelReason, string> = {
  progress: 'Học viên đã học/nộp bài lại sau khi đặt hẹn',
  comment: 'Học viên đã bình luận bài học sau khi đặt hẹn',
  request: 'Học viên đã gửi yêu cầu hỗ trợ mới sau khi đặt hẹn',
  'care-reminder': 'Học viên đã nhận nhắc chăm sóc khác sau khi đặt hẹn',
}

/** Hoạt động chỉ tính khi xảy ra SAU thời điểm đặt hẹn (nghiêm ngặt: > createdAt). */
function actedAfter(facts: FollowUpFacts, at: number | null): boolean {
  return at !== null && at > facts.createdAt
}

export function decideFollowUp(facts: FollowUpFacts, now: number): FollowUpDecision {
  if (now < facts.dueAt) return { decision: 'wait' }
  // Thứ tự ưu tiên lý do: hoạt động học tập trực tiếp > phản hồi > nhắc khác.
  if (actedAfter(facts, facts.lastProgressAt)) return { decision: 'cancel-auto', reason: 'progress' }
  if (actedAfter(facts, facts.lastCommentAt)) return { decision: 'cancel-auto', reason: 'comment' }
  if (actedAfter(facts, facts.lastRequestAt)) return { decision: 'cancel-auto', reason: 'request' }
  if (actedAfter(facts, facts.lastCareReminderAt)) return { decision: 'cancel-auto', reason: 'care-reminder' }
  return { decision: 'send' }
}

/** Các mốc hẹn hỗ trợ ở UI: sau 1 / 3 / 7 ngày. */
export const FOLLOW_UP_DAY_OPTIONS = [1, 3, 7] as const

export function followUpDueAt(from: Date, days: number): Date {
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000)
}
