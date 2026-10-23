/**
 * Logic thuần cho đặt lịch hẹn coach 1:1 — không chạm DB, test độc lập
 * bằng scripts/test-booking.cjs (khuôn mẫu của lib/baseline/growth.ts).
 *
 * Quy ước giờ (đọc kỹ trước khi sửa — mục 13 AGENTS.md):
 * - Asia/Saigon là UTC+7 cố định, không có giờ mùa (DST) → quy đổi giờ
 *   Việt Nam <-> UTC bằng cộng/trừ 7 giờ đúng MỘT lần, không cộng dồn.
 * - "Ngày Việt Nam" là chuỗi 'yyyy-mm-dd' tính theo giờ Việt Nam.
 * - Khung giờ trong ngày tính bằng phút từ 00:00 giờ Việt Nam (startMin).
 * - startsAt/endsAt của Booking là thời điểm vật lý (Date UTC thật).
 */

export const VN_OFFSET_MIN = 7 * 60
const MIN_MS = 60_000

/** Ngày Việt Nam (yyyy-mm-dd) của một thời điểm vật lý. */
export function vnDateString(at: Date): string {
  const shifted = new Date(at.getTime() + VN_OFFSET_MIN * MIN_MS)
  return shifted.toISOString().slice(0, 10)
}

/** Thứ trong tuần (0 = Chủ nhật ... 6 = Thứ bảy) của một ngày Việt Nam. */
export function vnWeekday(dateVN: string): number {
  const [y, m, d] = dateVN.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

/** Thời điểm vật lý (UTC) tương ứng phút startMin của ngày Việt Nam dateVN. */
export function slotStartUtc(dateVN: string, startMin: number): Date {
  const [y, m, d] = dateVN.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d) + (startMin - VN_OFFSET_MIN) * MIN_MS)
}

/** Cộng số ngày vào một ngày Việt Nam, trả ngày Việt Nam mới. */
export function addDaysVN(dateVN: string, days: number): string {
  const [y, m, d] = dateVN.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d) + days * 24 * 60 * MIN_MS).toISOString().slice(0, 10)
}

/** 'HH:MM' từ phút trong ngày. */
export function formatMin(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** Buổi của một slot theo giờ bắt đầu: sáng < 12h, chiều 12–18h, tối > 18h (như Bookify). */
export function slotPeriod(startMin: number): 'SANG' | 'CHIEU' | 'TOI' {
  if (startMin < 12 * 60) return 'SANG'
  if (startMin < 18 * 60) return 'CHIEU'
  return 'TOI'
}

/** Hai khoảng [aStart, aEnd) và [bStart, bEnd) có chồng nhau không. Chạm biên không tính là chồng. */
export function intervalsOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd
}

export interface TimeWindow {
  startMin: number
  endMin: number
}

export interface AvailabilityRuleLike {
  weekday: number
  startMin: number
  endMin: number
}

export interface AvailabilityExceptionLike {
  dateVN: string
  isOff: boolean
  startMin: number | null
  endMin: number | null
}

/**
 * Cửa sổ làm việc của một ngày cụ thể.
 * - Có ngoại lệ cho ngày đó: ngoại lệ THAY THẾ hẳn lịch tuần.
 *   isOff = true → nghỉ cả ngày (không cửa sổ nào).
 *   isOff = false → đúng một cửa sổ riêng [startMin, endMin].
 * - Không có ngoại lệ: dùng các rule của thứ trong tuần.
 */
export function resolveWindows(
  dateVN: string,
  rules: AvailabilityRuleLike[],
  exception: AvailabilityExceptionLike | null,
): TimeWindow[] {
  if (exception) {
    if (exception.isOff) return []
    if (exception.startMin != null && exception.endMin != null && exception.endMin > exception.startMin) {
      return [{ startMin: exception.startMin, endMin: exception.endMin }]
    }
    return []
  }
  const weekday = vnWeekday(dateVN)
  return rules
    .filter((r) => r.weekday === weekday && r.endMin > r.startMin)
    .map((r) => ({ startMin: r.startMin, endMin: r.endMin }))
    .sort((a, b) => a.startMin - b.startMin)
}

export interface BusyInterval {
  startsAt: Date
  endsAt: Date
}

export interface DaySlot {
  startMin: number
  endMin: number
  startsAt: string
  endsAt: string
  period: 'SANG' | 'CHIEU' | 'TOI'
  available: boolean
}

export interface GenerateDaySlotsInput {
  dateVN: string
  durationMin: number
  bufferMin: number
  minNoticeHours: number
  now: Date
  windows: TimeWindow[]
  busy: BusyInterval[]
}

/**
 * Sinh toàn bộ slot của một ngày (kể cả slot bận, để giao diện hiển thị
 * trạng thái) — slot khả dụng khi:
 * - bắt đầu sau mốc now + minNoticeHours (đặt trước tối thiểu), và
 * - không chồng với khoảng bận nào sau khi khoảng bận được nới bufferMin
 *   ở cả hai đầu (thời gian đệm giữa các buổi).
 */
export function generateDaySlots(input: GenerateDaySlotsInput): DaySlot[] {
  const { dateVN, durationMin, bufferMin, minNoticeHours, now, windows, busy } = input
  if (durationMin <= 0) return []
  const earliest = now.getTime() + minNoticeHours * 60 * MIN_MS
  const busyMs = busy.map((b) => ({
    start: b.startsAt.getTime() - bufferMin * MIN_MS,
    end: b.endsAt.getTime() + bufferMin * MIN_MS,
  }))
  const slots: DaySlot[] = []
  for (const w of windows) {
    for (let start = w.startMin; start + durationMin <= w.endMin; start += durationMin) {
      const startUtc = slotStartUtc(dateVN, start)
      const endUtc = new Date(startUtc.getTime() + durationMin * MIN_MS)
      const blocked = busyMs.some((b) => intervalsOverlap(startUtc.getTime(), endUtc.getTime(), b.start, b.end))
      slots.push({
        startMin: start,
        endMin: start + durationMin,
        startsAt: startUtc.toISOString(),
        endsAt: endUtc.toISOString(),
        period: slotPeriod(start),
        available: startUtc.getTime() >= earliest && !blocked,
      })
    }
  }
  return slots.sort((a, b) => a.startMin - b.startMin)
}

// ─── Biểu mẫu intake tùy biến theo phiên ───

export interface FormField {
  key: string
  label: string
  type: 'text' | 'textarea' | 'select'
  required: boolean
  options: string[]
}

const FIELD_TYPES = ['text', 'textarea', 'select'] as const

/** Đọc formSchema (Json trong DB) một cách phòng thủ — dữ liệu bẩn thành mảng rỗng. */
export function parseFormSchema(raw: unknown): FormField[] {
  if (!Array.isArray(raw)) return []
  const fields: FormField[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const key = typeof row.key === 'string' ? row.key.trim() : ''
    const label = typeof row.label === 'string' ? row.label.trim() : ''
    const type = FIELD_TYPES.includes(row.type as (typeof FIELD_TYPES)[number]) ? (row.type as FormField['type']) : 'text'
    if (!key || !label) continue
    fields.push({
      key,
      label,
      type,
      required: row.required === true,
      options: Array.isArray(row.options) ? row.options.filter((o): o is string => typeof o === 'string').slice(0, 20) : [],
    })
  }
  return fields.slice(0, 12)
}

/** Kiểm tra câu trả lời theo schema: trả danh sách lỗi (rỗng = hợp lệ). */
export function validateFormAnswers(fields: FormField[], answers: Record<string, unknown>): string[] {
  const errors: string[] = []
  for (const field of fields) {
    const value = answers[field.key]
    const text = typeof value === 'string' ? value.trim() : ''
    if (field.required && !text) {
      errors.push(`Thiếu câu trả lời bắt buộc: ${field.label}`)
      continue
    }
    if (text.length > 2000) errors.push(`Câu trả lời quá dài: ${field.label}`)
    if (field.type === 'select' && text && field.options.length > 0 && !field.options.includes(text)) {
      errors.push(`Lựa chọn không hợp lệ: ${field.label}`)
    }
  }
  return errors
}

/** Lọc answers chỉ giữ các key có trong schema, cắt độ dài an toàn. */
export function sanitizeAnswers(fields: FormField[], answers: Record<string, unknown>): Record<string, string> {
  const clean: Record<string, string> = {}
  for (const field of fields) {
    const value = answers[field.key]
    if (typeof value === 'string' && value.trim()) clean[field.key] = value.trim().slice(0, 2000)
  }
  return clean
}

// ─── Kiểm tra lịch rảnh theo tuần (logic thuần) ───

export interface AvailabilityRuleInput {
  weekday: number
  startMin: number
  endMin: number
}

/** Trả danh sách lỗi của một bộ lịch rảnh: thứ hợp lệ, khung giờ hợp lệ,
 *  và trong cùng một ngày các khung không được chồng nhau. */
export function validateAvailabilityRules(rules: AvailabilityRuleInput[]): string[] {
  const errors: string[] = []
  for (const rule of rules) {
    if (rule.weekday < 0 || rule.weekday > 6) errors.push('Thứ trong tuần không hợp lệ.')
    if (rule.startMin < 0 || rule.endMin > 1440 || rule.endMin <= rule.startMin) {
      errors.push('Khung giờ rảnh phải bắt đầu trước khi kết thúc, trong khoảng 00:00–24:00.')
    }
  }
  const sorted = [...rules].sort((a, b) => a.weekday - b.weekday || a.startMin - b.startMin)
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]
    const cur = sorted[i]
    if (prev.weekday === cur.weekday && cur.startMin < prev.endMin) {
      errors.push('Các khung giờ rảnh trong cùng một ngày đang chồng nhau.')
    }
  }
  return errors
}
