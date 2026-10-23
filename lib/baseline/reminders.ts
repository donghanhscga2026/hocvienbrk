/**
 * Luật nhắc ghi Điểm A / Điểm B — logic thuần, test độc lập.
 * - Chưa có Điểm A và đã ghi danh từ 3 ngày trở lên → nhắc ghi Điểm A.
 * - Đã có Điểm A từ 14 ngày trở lên mà chưa có Điểm B → nhắc ghi Điểm B
 *   (đủ thời gian để thấy thay đổi thật, tránh nhắc quá sớm).
 * Mỗi loại nhắc tối đa 1 lần/tháng cho mỗi ghi danh — khóa chống trùng
 * nằm ở eventKey của AppNotification (duy nhất toàn hệ thống).
 */

export interface ReminderFacts {
    enrollmentId: number
    enrolledDaysAgo: number
    hasA: boolean
    aRecordedDaysAgo: number | null
    hasB: boolean
}

export type ReminderKind = 'A' | 'B'

export function decideReminders(facts: ReminderFacts): ReminderKind[] {
    const kinds: ReminderKind[] = []
    if (!facts.hasA && facts.enrolledDaysAgo >= 3) kinds.push('A')
    if (facts.hasA && !facts.hasB && facts.aRecordedDaysAgo !== null && facts.aRecordedDaysAgo >= 14) kinds.push('B')
    return kinds
}

export function reminderEventKey(enrollmentId: number, kind: ReminderKind, now: Date): string {
    const bucket = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
    return `baseline-reminder:${enrollmentId}:${kind}:${bucket}`
}

export function reminderTitle(kind: ReminderKind, courseName: string): string {
    return kind === 'A'
        ? `Hãy ghi Điểm A (điểm bắt đầu) cho khóa ${courseName} để sau này đo được tiến bộ của bạn`
        : `Đã đến lúc ghi Điểm B cho khóa ${courseName} để nhìn thấy sự thay đổi của bạn`
}
