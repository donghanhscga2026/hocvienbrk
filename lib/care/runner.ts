import { buildCareQueue, countCareToday, type CareRow } from './queue'
import { notifyUser } from './notify'
import { CARE_AUTO_RULES, careEventKey, vnDateString } from './rules'

/**
 * Lượt quét care tự động: chỉ gửi các luật phía học viên R1/R2/R3/R6
 * (R4 có nhịp nhắc riêng 72 giờ, R5 là nhiệm vụ của giảng viên trong CRM).
 * Bất biến chống quấy rầy: tối đa 1 nhắc care/ngày/học viên trên mọi luật,
 * tôn trọng trạng thái đã bỏ qua hôm nay và human takeover (người thật
 * đang xử lý) đã giải ở tầng hàng đợi.
 */

export async function sendCareReminder(row: CareRow, now = new Date(), messageOverride?: string): Promise<{ sent: boolean; reason: string }> {
  const eventKey = careEventKey(row.ruleId, row.userId, row.courseId, vnDateString(now))
  // R5 là nhiệm vụ phía giảng viên: thông báo đi cho giảng viên phụ trách khóa.
  const recipientId = row.ruleId === 'R5' ? row.teacherId : row.userId
  if (recipientId == null) return { sent: false, reason: 'no-recipient' }
  const result = await notifyUser({
    userId: recipientId,
    eventKey,
    kind: 'TASK_DUE',
    title: messageOverride && messageOverride.trim() ? messageOverride : row.message,
    courseId: row.courseId,
    enrollmentId: row.enrollmentId,
  })
  return { sent: result.created, reason: result.created ? 'ok' : 'duplicate' }
}

export interface CareRunResult {
  scanned: number
  matched: number
  sent: number
  wouldSend: number
  skippedCap: number
  dryRun: boolean
}

export async function runCareReminders(now = new Date(), options: { dryRun?: boolean } = {}): Promise<CareRunResult> {
  const dryRun = options.dryRun === true
  const queue = await buildCareQueue(null, now)
  const candidates = queue.rows.filter((row) => CARE_AUTO_RULES.includes(row.ruleId) && row.status === 'pending')
  let sent = 0
  let wouldSend = 0
  let skippedCap = 0
  const handledUsers = new Set<number>()
  for (const row of candidates) {
    if (handledUsers.has(row.userId)) { skippedCap++; continue }
    const alreadyToday = await countCareToday(row.userId, now)
    if (alreadyToday > 0) { skippedCap++; continue }
    if (dryRun) {
      wouldSend++
      handledUsers.add(row.userId)
      continue
    }
    const result = await sendCareReminder(row, now)
    if (result.sent) {
      sent++
      handledUsers.add(row.userId)
    }
  }
  return { scanned: queue.stats.total, matched: candidates.length, sent, wouldSend, skippedCap, dryRun }
}
