import { spinContent } from '../email-spin'
import { fillCareTemplate, type CareTemplateVars } from './templates'

/**
 * Care Engine GĐ2 — logic thuần của thư viện câu mẫu dùng chung (không
 * chạm DB, test độc lập bằng scripts/test-care-followups.cjs):
 * - render: điền biến {name} {course} {lesson} {streak} {amount} {days}
 *   {hours} trước, rồi tung spintax {a|b|c} bằng đúng hàm spin của
 *   email-mkt (lib/email-spin.ts) như bản demo đã duyệt.
 * - validate: shortcut dạng /ten-mau (chữ thường, số, gạch ngang/dưới).
 * - phân quyền xem/sửa theo phạm vi SYSTEM | COURSE | PERSONAL.
 */

export type CareTemplateScope = 'SYSTEM' | 'COURSE' | 'PERSONAL'

export interface CareTemplateLike {
  scope: CareTemplateScope
  courseId: number | null
  ownerId: number
}

export interface CareActorLike {
  id: number
  role: string
  /** Khóa actor dạy (giảng viên); admin truyền vào danh sách rỗng và dùng cờ isAdmin. */
  courseIds: number[]
  isAdmin: boolean
}

/** Điền biến rồi tung spintax — thứ tự này giữ nguyên {name} khỏi bị spin xử lý nhầm. */
export function renderCareLibraryTemplate(body: string, vars: CareTemplateVars): string {
  return spinContent(fillCareTemplate(body, vars))
}

/** Xem trước nhiều biến thể spintax của cùng 1 mẫu (đã điền biến). */
export function previewCareLibraryTemplate(body: string, vars: CareTemplateVars, count = 3): string[] {
  const previews: string[] = []
  for (let i = 0; i < count; i++) previews.push(renderCareLibraryTemplate(body, vars))
  return previews
}

const SHORTCUT_RE = /^\/[a-z0-9][a-z0-9-_]{1,29}$/

export function normalizeShortcut(raw: string): string {
  const trimmed = raw.trim().toLowerCase()
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}

/** Trả về thông báo lỗi tiếng Việt nếu shortcut không hợp lệ, null nếu hợp lệ. */
export function validateShortcut(raw: string): string | null {
  const shortcut = normalizeShortcut(raw)
  if (!SHORTCUT_RE.test(shortcut)) return 'Phím tắt phải có dạng /ten-mau: bắt đầu bằng /, dài 3–31 ký tự, chỉ gồm chữ thường, số, dấu - và _.'
  return null
}

export function validateTemplateBody(body: string): string | null {
  const text = body.trim()
  if (text.length < 10) return 'Nội dung câu mẫu quá ngắn (tối thiểu 10 ký tự).'
  if (text.length > 2000) return 'Nội dung câu mẫu vượt quá 2.000 ký tự.'
  // Spintax phải đóng ngoặc cân bằng ở 1 cấp — tránh mẫu lỗi làm rơi ký tự khi render.
  let depth = 0
  for (const ch of text) {
    if (ch === '{') depth++
    if (ch === '}') depth--
    if (depth < 0 || depth > 1) return 'Nội dung có ngoặc { } chưa cân bằng hoặc lồng nhau — kiểm tra lại cú pháp spintax/biến.'
  }
  if (depth !== 0) return 'Nội dung có ngoặc { chưa đóng — kiểm tra lại cú pháp spintax/biến.'
  return null
}

/** Actor có nhìn thấy câu mẫu này trong thư viện không. */
export function canViewTemplate(actor: CareActorLike, template: CareTemplateLike): boolean {
  if (actor.isAdmin) return true
  if (template.scope === 'SYSTEM') return true
  if (template.scope === 'PERSONAL') return template.ownerId === actor.id
  // COURSE: chỉ giảng viên của chính khóa đó.
  return template.courseId != null && actor.courseIds.includes(template.courseId)
}

/** Actor có sửa/tắt câu mẫu này không (chủ sở hữu, GV của khóa, hoặc admin với mẫu hệ thống). */
export function canEditTemplate(actor: CareActorLike, template: CareTemplateLike): boolean {
  if (actor.isAdmin) return true
  if (template.scope === 'PERSONAL') return template.ownerId === actor.id
  if (template.scope === 'COURSE') return template.courseId != null && actor.courseIds.includes(template.courseId)
  return false // SYSTEM: chỉ admin sửa
}

/** Actor có tạo câu mẫu ở phạm vi này không. */
export function canCreateTemplate(actor: CareActorLike, scope: CareTemplateScope, courseId: number | null): boolean {
  if (scope === 'PERSONAL') return true
  if (scope === 'SYSTEM') return actor.isAdmin
  return courseId != null && (actor.isAdmin || actor.courseIds.includes(courseId))
}

/**
 * 6 câu mẫu mặc định bám demo Màn 2 — nạp idempotent vào thư viện khi
 * chưa có mẫu SYSTEM nào (xem templates-store.ts). Chủ sở hữu ghi nhận
 * là admin đầu tiên của hệ thống để không hardcode id người dùng.
 */
export const DEFAULT_CARE_TEMPLATES: { shortcut: string; name: string; body: string }[] = [
  {
    shortcut: '/giu-chuoi',
    name: 'Nhắc giữ chuỗi bài ngày',
    body: '{Chào|Xin chào} {name}, chuỗi {streak} ngày của mình ở khóa {course} đang rất đẹp — đừng để đứt ở {lesson} nhé. Nộp bài hôm nay là giữ được nhịp!',
  },
  {
    shortcut: '/bat-dau',
    name: 'Động viên bắt đầu bài đầu tiên',
    body: 'Chào {name}, khóa {course} của mình đang chờ bài học đầu tiên. Bài 1 chỉ mất khoảng 15 phút — bắt đầu hôm nay nhé!',
  },
  {
    shortcut: '/cho-ho-tro',
    name: 'Xác nhận đã nhận yêu cầu hỗ trợ',
    body: 'Thầy/cô đã nhận được câu hỏi của {name} rồi nhé. Bên mình sẽ trả lời trong vòng 24 giờ — {name} cứ yên tâm học tiếp phần khác trước.',
  },
  {
    shortcut: '/thanh-toan',
    name: 'Nhắc hoàn tất thanh toán còn dở',
    body: '{name} ơi, đăng ký khóa {course} còn thiếu bước thanh toán {amount}. Hoàn tất hôm nay để được kích hoạt ngay nhé.',
  },
  {
    shortcut: '/diem-a',
    name: 'Nhắc ghi Điểm A (điểm bắt đầu)',
    body: '{name} ghi Điểm A cho khóa {course} giúp thầy nhé — chỉ 3 phút, để sau này đo được tiến bộ của chính mình.',
  },
  {
    shortcut: '/vang-lau',
    name: 'Gọi quay lại khi im lặng nhiều ngày',
    body: 'Lâu rồi chưa thấy {name} trong khóa {course}. Có vướng gì cứ nhắn lại đây, thầy trò mình cùng gỡ nhé.',
  },
]
