import { ACCOUNT_SUPPORT_SOURCE, FEEDBACK_SOURCE, PARTNER_SOURCE } from './request-workflow'

export type RequestOrigin = { label: string; courseTitle: string | null; lessonTitle: string | null; pagePath: string | null; pageLabel: string }

// Chỉ tạo đường dẫn nội bộ từ dữ liệu đã lưu; không tin URL do người gửi tự khai.
export function requestOrigin(row: { source: string; content: string; course?: { name_lop: string; id_khoa: string } | null }, lessonTitle: string | null = null): RequestOrigin {
  let pagePath: string | null = null
  let pageLabel = 'Mở trang nguồn'
  if (row.course) { pagePath = '/khoa-hoc/' + encodeURIComponent(row.course.id_khoa); pageLabel = 'Mở trang khóa học' }
  else if (row.source === PARTNER_SOURCE) pagePath = '/doi-tac'
  else if (row.source === ACCOUNT_SUPPORT_SOURCE) {
    if (row.content.startsWith('Trang gặp lỗi: Đăng ký\n')) pagePath = '/register'
    else if (row.content.startsWith('Trang gặp lỗi: Đăng nhập\n')) pagePath = '/login'
  }
  else if (row.source.startsWith('Landing page: ') && row.source.slice(14).trim()) pagePath = '/land/' + encodeURIComponent(row.source.slice(14).trim())
  else if (row.source === 'Yêu cầu thành viên' || row.source === FEEDBACK_SOURCE) pagePath = '/support'
  return { label: row.source, courseTitle: row.course?.name_lop || null, lessonTitle, pagePath, pageLabel }
}
