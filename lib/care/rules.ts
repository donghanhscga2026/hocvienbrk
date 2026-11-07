/**
 * Care Engine GĐ1 — 6 luật phát hiện học viên cần chăm, viết dạng hàm
 * thuần (chỉ nhận facts đã nạp sẵn, không chạm DB) theo đúng mẫu
 * lib/baseline/reminders.ts để test độc lập bằng scripts/test-care-rules.cjs.
 *
 * - R1: đã kích hoạt ≥48 giờ, chưa bắt đầu học (0 tiến độ bài học).
 * - R2: khóa học theo ngày — chuỗi nộp bài ≥3 ngày, hôm nay chưa nộp và
 *   giờ Việt Nam đã ≥20:00 (nhắc giữ chuỗi trước khi hết ngày).
 * - R3: im lặng ≥7 ngày nhưng vẫn còn hoạt động trong vòng 30 ngày.
 * - R4: thanh toán PENDING ≥24 giờ và chưa được nhắc trong 72 giờ.
 * - R5: yêu cầu CRM đang mở (NEW) ≥24 giờ chưa có người xử lý.
 * - R6: khóa cần ghi Điểm A (mốc nền của baseline) mà học viên chưa ghi.
 *
 * Điểm rủi ro: điểm gốc theo luật (R5 95, R2 88, R4 82, R3 74, R1 66,
 * R6 40) cộng dồn nhẹ theo độ trễ, trần 99 — hàng đợi xếp điểm cao trước.
 */

export type CareRuleId = 'R1' | 'R2' | 'R3' | 'R4' | 'R5' | 'R6'

export const CARE_RULE_IDS: CareRuleId[] = ['R1', 'R2', 'R3', 'R4', 'R5', 'R6']

export const CARE_RULE_META: Record<CareRuleId, { name: string; baseScore: number }> = {
  R1: { name: 'Chưa bắt đầu học', baseScore: 66 },
  R2: { name: 'Giữ chuỗi bài ngày', baseScore: 88 },
  R3: { name: 'Im lặng bất thường', baseScore: 74 },
  R4: { name: 'Thanh toán còn chờ', baseScore: 82 },
  R5: { name: 'Yêu cầu hỗ trợ quá hạn', baseScore: 95 },
  R6: { name: 'Chưa ghi Điểm A', baseScore: 40 },
}

/** Luật được lượt quét sáng tự động gửi nhắc (R4 có nhịp riêng 72 giờ, R5 là việc của giảng viên). */
export const CARE_AUTO_RULES: CareRuleId[] = ['R1', 'R2', 'R3', 'R6']

export interface CareFacts {
  enrollmentStatus: string
  /** Số giờ kể từ lúc ghi danh được kích hoạt (activatedAt, dự phòng createdAt). */
  hoursSinceActivation: number | null
  /** Số ngày kể từ lúc ghi danh (làm tròn xuống). */
  enrolledDaysAgo: number
  progressCount: number
  isDailyCourse: boolean
  /** Giờ hiện tại theo Asia/Ho_Chi_Minh (0–23). */
  vnHour: number
  submittedToday: boolean
  /** Số ngày liên tiếp ngay trước hôm nay đã nộp bài ngày (chuỗi đang giữ). */
  dailyStreak: number
  /** Số ngày kể từ hoạt động học gần nhất; null = chưa từng có hoạt động. */
  daysSinceLastActivity: number | null
  /** Số giờ thanh toán PENDING đã chờ; null = không có thanh toán đang chờ. */
  pendingPaymentHours: number | null
  /** Số giờ kể từ lần nhắc thanh toán (R4) gần nhất; null = chưa từng nhắc. */
  hoursSinceLastPaymentReminder: number | null
  /** Số giờ yêu cầu CRM mở lâu nhất chưa xử lý; null = không có yêu cầu mở. */
  openRequestHours: number | null
  hasBaselineA: boolean
}

export interface CareSignal {
  ruleId: CareRuleId
  score: number
  /** Dữ kiện hiển thị kèm tín hiệu (số ngày chờ, chuỗi, số giờ…). */
  facts: Record<string, number>
}

const cap = (score: number) => Math.min(99, Math.max(1, Math.round(score)))

export function decideCareSignals(facts: CareFacts): CareSignal[] {
  const signals: CareSignal[] = []
  const active = facts.enrollmentStatus === 'ACTIVE'

  if (active && facts.hoursSinceActivation !== null && facts.hoursSinceActivation >= 48 && facts.progressCount === 0) {
    const extraDays = Math.floor((facts.hoursSinceActivation - 48) / 24)
    signals.push({ ruleId: 'R1', score: cap(CARE_RULE_META.R1.baseScore + Math.min(10, extraDays)), facts: { days: Math.floor(facts.hoursSinceActivation / 24) } })
  }

  if (active && facts.isDailyCourse && facts.dailyStreak >= 3 && !facts.submittedToday && facts.vnHour >= 20) {
    signals.push({ ruleId: 'R2', score: cap(CARE_RULE_META.R2.baseScore + Math.min(10, facts.dailyStreak - 3)), facts: { streak: facts.dailyStreak } })
  }

  if (active && facts.progressCount > 0 && facts.daysSinceLastActivity !== null && facts.daysSinceLastActivity >= 7 && facts.daysSinceLastActivity <= 30) {
    signals.push({ ruleId: 'R3', score: cap(CARE_RULE_META.R3.baseScore + Math.min(15, facts.daysSinceLastActivity - 7)), facts: { silentDays: facts.daysSinceLastActivity } })
  }

  if (facts.pendingPaymentHours !== null && facts.pendingPaymentHours >= 24
    && (facts.hoursSinceLastPaymentReminder === null || facts.hoursSinceLastPaymentReminder >= 72)) {
    const extraDays = Math.floor((facts.pendingPaymentHours - 24) / 24)
    signals.push({ ruleId: 'R4', score: cap(CARE_RULE_META.R4.baseScore + Math.min(12, extraDays)), facts: { hours: Math.floor(facts.pendingPaymentHours) } })
  }

  if (facts.openRequestHours !== null && facts.openRequestHours >= 24) {
    const extraHalfDays = Math.floor((facts.openRequestHours - 24) / 12)
    signals.push({ ruleId: 'R5', score: cap(CARE_RULE_META.R5.baseScore + Math.min(4, extraHalfDays)), facts: { hours: Math.floor(facts.openRequestHours) } })
  }

  if (active && !facts.hasBaselineA && facts.enrolledDaysAgo >= 3) {
    signals.push({ ruleId: 'R6', score: cap(CARE_RULE_META.R6.baseScore + Math.min(5, Math.floor(facts.enrolledDaysAgo / 7))), facts: { days: facts.enrolledDaysAgo } })
  }

  return signals.sort((a, b) => b.score - a.score)
}

/**
 * Chuỗi ngày liên tiếp ngay trước "ngày hiện tại" đã hoàn thành bài ngày.
 * completedDayOrders: danh sách "Ngày thứ mấy" (order) đã nộp xong;
 * currentDayOrder: hôm nay là Ngày thứ mấy của học viên.
 */
export function computeDailyStreak(completedDayOrders: number[], currentDayOrder: number): number {
  const done = new Set(completedDayOrders)
  let streak = 0
  for (let order = currentDayOrder - 1; order >= 1; order--) {
    if (!done.has(order)) break
    streak++
  }
  return streak
}

/** Ngày theo giờ Việt Nam dạng YYYY-MM-DD (nhãn ngày, không quy đổi thêm). */
export function vnDateString(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date)
  const get = (type: string) => parts.find((p) => p.type === type)?.value || ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

/** Giờ hiện tại theo giờ Việt Nam (0–23). */
export function vnHour(date: Date): number {
  const hour = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh', hour: 'numeric', hourCycle: 'h23',
  }).format(date)
  return Number(hour) % 24
}

/** Mốc 00:00 giờ Việt Nam của 1 nhãn ngày VN, đổi ra thời điểm UTC tương ứng. */
export function vnDayStartUtc(vnDate: string): Date {
  return new Date(`${vnDate}T00:00:00+07:00`)
}

/** Khóa chống trùng của thông báo nhắc care: duy nhất theo luật/người/khóa/ngày VN. */
export function careEventKey(ruleId: CareRuleId, userId: number, courseId: number, vnDate: string): string {
  return `care:${ruleId}:${userId}:${courseId}:${vnDate}`
}

/** Khóa định danh 1 lần "bỏ qua hôm nay" — lưu trong detail của ActivityLog CARE_SKIP. */
export function careSkipKey(userId: number, courseId: number, ruleId: CareRuleId, vnDate: string): string {
  return `care-skip:${userId}:${courseId}:${ruleId}:${vnDate}`
}
