import { searchText } from './catalog'

export type PersonalTool = { id: number; slug?: string; name: string; url: string; roles: string[]; isActive: boolean }

// Cùng điều kiện hiển thị giảng dạy ở header và dữ liệu riêng trên server.
export function canTeach(role?: string | null) {
  return role === 'TEACHER' || role === 'ADMIN'
}

// Phân nhóm bằng mã ổn định; đổi tên hiển thị không làm công cụ chuyển nhóm.
export const toolGroups = [
  { id: 'training', label: 'Đào tạo & khóa học', description: 'Khóa học, học viên và lộ trình đào tạo.', slugs: ['courses', 'students', 'roadmap', 'my-learning'] },
  { id: 'marketing', label: 'Khách hàng & marketing', description: 'Chăm sóc khách hàng và tiếp thị.', slugs: ['crm', 'email-mkt'] },
  { id: 'members', label: 'Thành viên & liên kết', description: 'Affiliate và mạng lưới thành viên.', slugs: ['affiliate', 'genealogy'] },
  { id: 'payments', label: 'Thanh toán & quyền lợi', description: 'Thanh toán, ngân hàng, ví và voucher.', slugs: ['payments', 'bank-accounts', 'vouchers', 'brk', 'reserved-ids'] },
  { id: 'utilities', label: 'Tiện ích', description: 'Công cụ hỗ trợ công việc hằng ngày.', slugs: ['youtube-tools'] },
  { id: 'system', label: 'Quản trị & hỗ trợ', description: 'Cài đặt, sao lưu, hỗ trợ và đồng bộ.', slugs: ['settings', 'backup', 'tca-sync', 'dev-flow', 'ho-tro', 'system-admin', 'email-settings', 'account-assistant', 'assistant-guide'] },
  { id: 'other', label: 'Công cụ khác', description: 'Các công cụ bổ sung của hệ thống.', slugs: [] },
]
const contentSlugs = ['pages', 'page', 'landings', 'posts', 'my-site', 'site-profiles']
function routeSlug(tool: PersonalTool) {
  return tool.url.startsWith('/tools/') ? tool.url.split(/[?#]/)[0].split('/')[2] : ''
}
export function isContentTool(tool: PersonalTool) {
  return contentSlugs.includes(tool.slug || '') || contentSlugs.includes(routeSlug(tool))
}
export function toolGroup(tool: PersonalTool) {
  return toolGroups.find(group => group.slugs.includes(tool.slug || '') || group.slugs.includes(routeSlug(tool)))?.id || 'other'
}
export function filterPersonalTools(tools: PersonalTool[], query: string, group: string) {
  const needle = searchText(query)
  return tools.filter(tool => (!group || toolGroup(tool) === group) && (!needle || searchText(`${tool.name} ${toolGroups.find(item => item.id === toolGroup(tool))?.description || ''}`).includes(needle)))
}

// Chỉ dùng trạng thái/minh chứng đã lưu, không coi tải minh chứng là đã duyệt tiền.
export function pendingCourseLabel(payment?: { status: string; proofImage: string | null; amount: number }) {
  if (!payment) return 'Chờ xử lý đăng ký'
  if (payment.status === 'VERIFIED') return 'Chờ kích hoạt'
  if (payment.status === 'REJECTED') return 'Minh chứng chưa được chấp nhận'
  if (payment.status === 'CANCELLED') return 'Thanh toán đã hủy'
  if (payment.status === 'PENDING' && payment.proofImage) return 'Chờ duyệt thanh toán'
  if (payment.status === 'PENDING' && payment.amount > 0) return 'Chờ thanh toán'
  return 'Chờ kích hoạt'
}
