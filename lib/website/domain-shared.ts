/** Địa chỉ hệ thống cố định: không lấy từ Host do khách gửi lên. */
export const PLATFORM_ORIGIN = 'https://giautoandien.io.vn'
export function normalizeHostname(raw: string): string {
  const host=raw.trim().toLowerCase().replace(/\.$/,'')
  if(host.length>253 || !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(host)) throw new Error('Nhập tên miền, không kèm https://, cổng hoặc đường dẫn.')
  if(isPlatformHost(host) || host.endsWith('.giautoandien.io.vn') || /\.(local|internal|localhost|test|invalid)$/.test(host)) throw new Error('Không thể đăng ký địa chỉ hệ thống hoặc tên miền nội bộ.')
  return host
}
export function requestHostname(raw: string) { return raw.toLowerCase().replace(/:\d+$/,'').replace(/\.$/,'') }
export function isPlatformHost(host: string) { return ['giautoandien.io.vn','www.giautoandien.io.vn','localhost','127.0.0.1'].includes(host) || host.endsWith('.vercel.app') }
/** Giữ trang và chức năng liên quan trên tên miền riêng, giữ mã giới thiệu. */
export function websiteHref(input: string, slug: string, referral: string, customDomain: boolean) {
  if(!input) return '#'
  if(input.startsWith('#') || (!input.startsWith('/') && !input.startsWith(PLATFORM_ORIGIN+'/'))) return input
  const url=new URL(input,PLATFORM_ORIGIN)
  if(url.origin!==PLATFORM_ORIGIN) return input
  if(referral && !url.searchParams.has('ref')) url.searchParams.set('ref',referral)
  const base='/page/'+slug
  const own=url.pathname===base || url.pathname.startsWith(base+'/')
  if(customDomain && own) return (url.pathname.slice(base.length) || '/')+url.search+url.hash
  if(customDomain) return url.pathname+url.search+url.hash
  return input.startsWith('/') ? url.pathname+url.search+url.hash : url.toString()
}

export type DomainModules = { courses: boolean; crm: boolean; affiliate: boolean }
export function safeReturnPath(raw: string|null) { return raw && raw.startsWith('/') && !raw.startsWith('//') && !raw.includes('\\') && !/[\r\n]/.test(raw) ? raw : null }
/** Danh sách cho phép rõ ràng: chức năng mới không tự mở trên website riêng. */
export function domainRoute(path: string, modules: DomainModules): 'page' | 'account' | 'catalog' | 'system' | 'deny' {
  if(path==='/login' || path==='/register' || path==='/forgot-password' || path==='/complete-profile' || path==='/account-settings' || /^\/reset-password\/[a-zA-Z0-9_-]+$/.test(path) || path.startsWith('/api/auth/')) return 'system'
  if(path==='/api/upload/url') return 'system' // Ảnh đại diện của tài khoản đã đăng nhập.
  if(path==='/cong-cu') return 'page'
  if(/^\/ung-dung\/[a-z]+$/.test(path)) return 'page'
  if(path==='/tai-khoan') return 'account'
  if(path==='/khoa-hoc') return modules.courses ? 'catalog' : 'deny'
  if(/^\/(?:khoa-hoc\/[^/]+|courses\/[^/]+(?:\/learn)?)$/.test(path)) return modules.courses ? 'system' : 'deny'
  if(path==='/api/enroll-after-register' || /^\/api\/upload\/(?:comment|lesson|payment)$/.test(path)) return modules.courses ? 'system' : 'deny'
  if(path==='/tools/crm' || /^\/api\/crm(?:\/[^/]+)?$/.test(path) || path==='/api/websites/lead') return modules.crm ? 'system' : 'deny'
  if(path==='/tools/affiliate' || /^\/api\/affiliate\/(?:dashboard|withdraw|refs|links|resolve-ref|log-click)$/.test(path)) return modules.affiliate ? 'system' : 'deny'
  if(path==='/api/user/profile' || /^\/api\/user\/\d+$/.test(path)) return 'system'
  if(/^\/(?:api|tools|admin|my-space|dashboard|site-domain|page|land|landing|du-an|account|account-settings|_next)(?:\/|$)/.test(path)) return 'deny'
  if(path==='/manifest.webmanifest' || path==='/sw.js') return 'deny'
  // Các tên đường dẫn chức năng bị khóa vẫn dành riêng, không thành trang tự thiết kế.
  return 'page'
}
