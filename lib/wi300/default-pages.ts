/** Tên và khung chỉ dành cho trang mặc định; không áp dụng vào template nhập riêng. */
const toolTitles: Record<string, string> = {
  affiliate: 'Affiliate', posts: 'Bài viết cộng đồng', courses: 'Quản lý khóa học',
  students: 'Quản lý thành viên', roadmap: 'Lộ trình học tập', crm: 'Khách hàng & chăm sóc',
  'email-mkt': 'Email Marketing', genealogy: 'Nhân mạch', payments: 'Quản lý thanh toán',
  'bank-accounts': 'Tài khoản nhận tiền', vouchers: 'Quản lý voucher', brk: 'Ví & quyền lợi',
  'reserved-ids': 'Mã số thành viên', 'youtube-tools': 'Công cụ YouTube',
  settings: 'Cài đặt', backup: 'Sao lưu dữ liệu', 'tca-sync': 'Đồng bộ dữ liệu',
  'dev-flow': 'Quản lý công việc', 'ho-tro': 'Hỗ trợ', pages: 'Website & nội dung',
  landings: 'Landing page', 'my-site': 'Website của tôi', 'site-profiles': 'Hồ sơ website',
  'system-admin': 'Quản trị hệ thống', 'email-settings': 'Cấu hình email',
}
const affiliateTitles: Record<string, string> = { payouts: 'Duyệt rút tiền', conversions: 'Lượt đăng ký', clicks: 'Lịch sử click' }
export function defaultPageTitle(pathname: string) {
  if (pathname === '/account-settings') return 'Cài đặt tài khoản'
  if (pathname === '/tools') return 'Công cụ'
  if (!pathname.startsWith('/tools/')) return null
  const [, , slug, subpage] = pathname.split('/')
  if (slug === 'affiliate' && subpage) return affiliateTitles[subpage] || 'Affiliate'
  return toolTitles[slug] || 'Công cụ'
}
