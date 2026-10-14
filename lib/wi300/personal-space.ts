import { searchText } from './catalog'

export type PersonalTool = { id: number; slug?: string; name: string; url: string; roles: string[]; isActive: boolean; icon?: string | null; description?: string | null }

// Cùng điều kiện hiển thị giảng dạy ở header và dữ liệu riêng trên server.
export function canTeach(role?: string | null) {
  return role === 'TEACHER' || role === 'INSTRUCTOR' || role === 'ADMIN'
}

// Phân nhóm bằng mã ổn định; đổi tên hiển thị không làm công cụ chuyển nhóm.
export const toolGroups = [
  { id: 'training', label: 'Đào tạo & khóa học', description: 'Khóa học, học viên và lộ trình đào tạo.', slugs: ['courses', 'students', 'roadmap', 'my-learning'] },
  { id: 'marketing', label: 'Khách hàng & marketing', description: 'Chăm sóc khách hàng và tiếp thị.', slugs: ['crm', 'email-mkt'] },
  { id: 'members', label: 'Thành viên & liên kết', description: 'Affiliate và mạng lưới thành viên.', slugs: ['affiliate', 'genealogy'] },
  { id: 'payments', label: 'Thanh toán & quyền lợi', description: 'Thanh toán, ngân hàng, ví và voucher.', slugs: ['payments', 'bank-accounts', 'vouchers', 'brk', 'reserved-ids'] },
  { id: 'utilities', label: 'Tiện ích', description: 'Công cụ hỗ trợ công việc hằng ngày.', slugs: ['youtube-tools'] },
  { id: 'system', label: 'Quản trị & hỗ trợ', description: 'Cài đặt, sao lưu, hỗ trợ và đồng bộ.', slugs: ['wi-appearance', 'settings', 'backup', 'tca-sync', 'dev-flow', 'ho-tro', 'system-admin', 'email-settings', 'account-assistant', 'assistant-guide'] },
  { id: 'other', label: 'Công cụ khác', description: 'Các công cụ bổ sung của hệ thống.', slugs: [] },
]
const contentSlugs = ['pages', 'page', 'landings', 'posts', 'my-site', 'site-profiles']
function routeSlug(tool: PersonalTool) {
  return tool.url.startsWith('/tools/') ? tool.url.split(/[?#]/)[0].split('/')[2] : ''
}
// Nhãn riêng cho Wi300; mã ví và cấu hình công cụ chung vẫn giữ nguyên.
export function wi300ToolName(tool: PersonalTool) {
  return routeSlug(tool) === 'brk' || tool.slug === 'brk' ? 'Ví Wi' : tool.name
}
export function isContentTool(tool: PersonalTool) {
  return contentSlugs.includes(tool.slug || '') || contentSlugs.includes(routeSlug(tool))
}
export function toolGroup(tool: PersonalTool) {
  return toolGroups.find(group => group.slugs.includes(tool.slug || '') || group.slugs.includes(routeSlug(tool)))?.id || 'other'
}

// Phân khu chỉ sắp xếp điều hướng; quyền công cụ vẫn được kiểm tra riêng.
export function toolWorkspace(tool: PersonalTool) {
  const slug = routeSlug(tool) || tool.slug || ''
  if (slug === 'wi-projects') return 'business'
  if (tool.roles.length && tool.roles.every(role => ['ADMIN', 'DEVELOPER'].includes(role))) return 'admin'
  if (['reserved-ids', 'vouchers', 'dev-flow'].includes(slug)) return 'admin'
  if (['roadmap', 'my-learning'].includes(slug)) return 'learning'
  if (['affiliate', 'genealogy'].includes(slug)) return 'affiliate'
  if (['bank-accounts', 'brk', 'ho-tro', 'account-assistant', 'assistant-guide'].includes(slug)) return 'account'
  if (isContentTool(tool)) return 'pages'
  if (['crm', 'email-mkt', 'payments'].includes(slug)) return 'business'
  if (['courses', 'students'].includes(slug)) return 'teaching'
  if (toolGroup(tool) === 'system') return 'admin'
  return 'tools'
}
export function filterPersonalTools(tools: PersonalTool[], query: string, group: string) {
  const needle = searchText(query)
  return tools.filter(tool => (!group || toolGroup(tool) === group) && (!needle || searchText(`${wi300ToolName(tool)} ${toolGroups.find(item => item.id === toolGroup(tool))?.description || ''}`).includes(needle)))
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

// Quyền menu dùng cùng quy tắc với màn công cụ; không thay thế kiểm tra ở server.
export function canUseTool(role: string, roles: string[]) {
  return !roles.length || roles.includes(role) || (role === 'ADMIN' && roles.some(r => ['TEACHER', 'AFFILIATE', 'STUDENT'].includes(r))) || (role === 'TEACHER' && roles.some(r => ['AFFILIATE', 'STUDENT'].includes(r)))
}
export function safeToolUrl(url: string) {
  if (url.startsWith('/') && !url.startsWith('//') && !url.includes('\\')) return url
  try { return new URL(url).protocol === 'https:' ? url : null } catch { return null }
}
export type SpaceShortcut = { label: string; href: string; icon?: string | null }
export type SpaceNavGroup = { id: string; label: string; href: string; icon: string; items: SpaceShortcut[] }

// Header và sidebar nhận cùng cấu trúc; mục con đi thẳng tới chức năng.
export function spaceNavigation(role: string, tools: PersonalTool[]): SpaceNavGroup[] {
  const loggedIn = role !== 'guest'
  const groups: SpaceNavGroup[] = [
    { id: 'home', label: 'Tổng quan', href: '/my-space', icon: 'LayoutGrid', items: [] },
    { id: 'learning', label: 'Học tập', href: '/my-space?tab=learning', icon: 'BookOpen', items: [
      { label: 'Khóa đang học', href: '/my-space?tab=learning&status=active', icon: 'BookOpen' },
      { label: 'Khóa đã hoàn thành', href: '/my-space?tab=learning&status=completed', icon: 'GraduationCap' },
      { label: 'Đăng ký chờ xử lý', href: '/my-space?tab=learning&status=pending', icon: 'CreditCard' },
      ...(loggedIn ? [{ label: 'Yêu cầu của tôi', href: '/my-requests', icon: 'MessageCircle' }] : []),
    ] },
    ...(canTeach(role) ? [{ id: 'teaching', label: 'Giảng dạy', href: '/my-space?tab=teaching', icon: 'GraduationCap', items: [] }] : []),
    ...(loggedIn ? [{ id: 'affiliate', label: 'Cộng tác viên', href: '/my-space?tab=affiliate', icon: 'Link2', items: [{ label: 'Link giới thiệu & hoa hồng', href: '/tools/affiliate', icon: 'Link2' }] }] : []),
    ...(loggedIn ? [{ id: 'business', label: 'Quản lý & kinh doanh', href: '/my-space?tab=business', icon: 'Handshake', items: [] }] : []),
    { id: 'pages', label: 'Nội dung & website', href: '/my-space?tab=pages', icon: 'Globe', items: [] },
    { id: 'tools', label: 'Công cụ & tiện ích', href: '/my-space?tab=tools', icon: 'LayoutGrid', items: [] },
    { id: 'account', label: 'Tài khoản & tài chính', href: '/my-space?tab=account', icon: 'UserRound', items: [
      { label: loggedIn ? 'Cài đặt tài khoản' : 'Đăng nhập', href: loggedIn ? '/account-settings' : '/login', icon: 'Settings' },
      { label: 'Hỗ trợ & phản hồi', href: '/support', icon: 'LifeBuoy' },
      { label: 'Đăng ký đối tác', href: '/doi-tac', icon: 'Handshake' },
    ] },
    ...(['ADMIN', 'DEVELOPER'].includes(role) ? [{ id: 'admin', label: 'Quản trị hệ thống', href: '/my-space?tab=admin', icon: 'ShieldCheck', items: [] }] : []),
  ]
  for (const tool of tools) {
    if (!tool || !tool.isActive || !Array.isArray(tool.roles) || !tool.roles.every(r => typeof r === 'string') || !canUseTool(role, tool.roles) || typeof tool.url !== 'string' || !safeToolUrl(tool.url) || typeof tool.name !== 'string') continue
    const group = groups.find(g => g.id === toolWorkspace(tool))
    if (group && !groups.some(g => g.items.some(i => i.href === tool.url))) group.items.push({ label: wi300ToolName(tool), href: tool.url, icon: tool.icon })
  }
  return groups.filter(group => !['business', 'pages'].includes(group.id) || group.items.length > 0)
}
