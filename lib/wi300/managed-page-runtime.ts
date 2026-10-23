import type { DeploymentBrand } from '@/lib/site-profile/deployment-brand'
import { SYSTEM_WEBSITE_PAGES, newManagedPage } from './managed-pages'
import { contentMetadata } from '@/lib/content/seo'
export function systemPageContent(brand: DeploymentBrand, id: string) {
  const page = SYSTEM_WEBSITE_PAGES.find(item => item.id === id)
  if (!page) throw new Error('Unknown website page')
  const saved = brand.appearance?.pageContent[id]
  if (saved) return saved
  const defaults = newManagedPage(id, page.url.slice(1), page.label)
  if (id === 'about') return { ...defaults, layout: 'split' as const, title: 'Kết nối để cùng phát triển', imageUrl: brand.logoUrl,
    body: `${brand.description}\n\n${brand.name} hướng đến một hệ sinh thái dành cho cá nhân và doanh nghiệp, chia sẻ tri thức, giới thiệu sản phẩm và dịch vụ, tạo cơ hội hợp tác và cùng nâng cao năng lực trong thời đại số.\n\n300DNS là dự án của WIPA. Các dự án thuộc 300DNS được WIPA cố vấn.\n\nGiai đoạn đầu tập trung vào khóa học. Sản phẩm và dịch vụ sẽ được bổ sung khi cộng đồng sẵn sàng.` }
  if (id === 'products' || id === 'services') return { ...defaults, title: page.label + ' trong hệ sinh thái Wi', description: `Khám phá ${page.label.toLocaleLowerCase('vi')} từ các dự án trong hệ sinh thái ${brand.name}. Xem chi tiết hoặc liên hệ đơn vị cung cấp để tìm hiểu thêm.` }
  if (id === 'partners') return { ...defaults, title: 'Trở thành đối tác ' + brand.name, description: 'Chia sẻ chuyên môn với vai trò giảng viên hoặc kết nối doanh nghiệp của bạn với hệ sinh thái Wi. Bạn có thể đăng ký cả hai bằng tài khoản hiện tại.' }
  return defaults
}
export function systemPageMetadata(brand: DeploymentBrand, id: string) {
  const settings = systemPageContent(brand, id), page = SYSTEM_WEBSITE_PAGES.find(item => item.id === id)!
  const seo = { ...settings.seo, title: settings.seo.title || `${settings.title || page.label} | ${brand.name}`,
    description: settings.seo.description || settings.description || brand.description,
    imageUrl: settings.seo.imageUrl || settings.imageUrl || brand.ogImageUrl,
    keywords: settings.seo.keywords || brand.appearance?.seo.keywords || '',
    ...(settings.inheritRobots ? { index: brand.appearance?.seo.index ?? true, follow: brand.appearance?.seo.follow ?? true } : {}),
  }
  if (brand.appearance?.hiddenPages.includes(id)) seo.index = false
  return contentMetadata(seo, page.label, brand.description, page.url)
}
export function systemPageHidden(brand: DeploymentBrand, id: string) { return brand.appearance?.hiddenPages.includes(id) || false }
