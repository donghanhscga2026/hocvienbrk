/** Danh mục riêng cho WI300. Không lưu ảnh, kết quả hoặc tài khoản của app. */
export type ExternalApp = {
  slug: string
  name: string
  description: string
  url: string
  icon: 'Image' | 'ScanLine'
  mode: 'embed' | 'external'
}
export const externalApps: readonly ExternalApp[] = [
  { slug: 'cleanimage', name: 'CleanImage', description: 'Làm sạch thông tin ẩn trong ảnh và tải ảnh kết quả.', url: 'https://cleanimage.vercel.app/', icon: 'Image', mode: 'embed' },
  { slug: 'digital-biz-scan', name: 'Digital Biz Scan', description: 'Mở công cụ Digital Biz Scan của bạn.', url: 'https://digital-biz-scan.lovable.app/', icon: 'ScanLine', mode: 'external' },
]
export function findExternalApp(slug: string) {
  return externalApps.find(app => app.slug === slug)
}
export const externalAppHref = (slug: string) => '/tools/apps/' + encodeURIComponent(slug)
