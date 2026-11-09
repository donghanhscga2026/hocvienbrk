/**
 * Nội dung bán hàng bổ sung cho trang bán khóa học MẶC ĐỊNH (khác với trang
 * bán tự dựng): giảng viên điền 3 ô chữ thường trong form sửa khóa học —
 * khóa học dành cho ai, học xong làm được gì, câu hỏi thường gặp — hệ thống
 * tự lắp thành các mục trên trang. Lưu ở SystemConfig theo khóa học
 * (cùng cách với chi tiết sản phẩm số/dịch vụ) nên không cần thêm cột SQL.
 * Ô trống thì mục tương ứng không hiện.
 */
export interface CourseSalesContentInput {
  audience: string
  outcomes: string
  faq: string
}

export interface CourseSalesFaqItem {
  question: string
  answer: string
}

export interface CourseSalesContent {
  audience: string[]
  outcomes: string[]
  faq: CourseSalesFaqItem[]
}

export const EMPTY_COURSE_SALES_CONTENT: CourseSalesContent = { audience: [], outcomes: [], faq: [] }

const MAX_FIELD_LENGTH = 4000
const MAX_LINES = 12
const MAX_FAQ_ITEMS = 8

export function courseSalesContentKey(courseId: number): string {
  return `catalog:course-sales:${courseId}`
}

export function cleanSalesLines(text: unknown, max = MAX_LINES): string[] {
  if (typeof text !== 'string') return []
  return text
    .split(/\r?\n/)
    .map(line => line.replace(/^[\s\-•*✓✔–—]+/, '').trim())
    .filter(line => line.length > 0)
    .slice(0, max)
    .map(line => line.slice(0, 300))
}

export function parseSalesFaq(text: unknown): CourseSalesFaqItem[] {
  if (typeof text !== 'string') return []
  return text
    .split(/\r?\n\s*\r?\n/)
    .map(block => block.trim())
    .filter(Boolean)
    .map(block => {
      const lines = block.split(/\r?\n/).map(line => line.trim()).filter(Boolean)
      if (lines.length < 2) return null
      return { question: lines[0].slice(0, 200), answer: lines.slice(1).join(' ').slice(0, 1000) }
    })
    .filter((item): item is CourseSalesFaqItem => item != null)
    .slice(0, MAX_FAQ_ITEMS)
}

/** Chuẩn hoá dữ liệu thô (từ form hoặc từ SystemConfig) trước khi lưu. */
export function sanitizeCourseSalesContentInput(raw: unknown): CourseSalesContentInput {
  const value = (typeof raw === 'object' && raw != null ? raw : {}) as Record<string, unknown>
  const field = (v: unknown) => (typeof v === 'string' ? v.slice(0, MAX_FIELD_LENGTH) : '')
  return { audience: field(value.audience), outcomes: field(value.outcomes), faq: field(value.faq) }
}

/** Đọc nội dung đã lưu (dạng thô) thành dạng hiển thị cho trang bán. */
export function parseCourseSalesContent(raw: unknown): CourseSalesContent {
  const input = sanitizeCourseSalesContentInput(raw)
  return {
    audience: cleanSalesLines(input.audience),
    outcomes: cleanSalesLines(input.outcomes),
    faq: parseSalesFaq(input.faq),
  }
}

export function hasCourseSalesContent(content: CourseSalesContent): boolean {
  return content.audience.length > 0 || content.outcomes.length > 0 || content.faq.length > 0
}
