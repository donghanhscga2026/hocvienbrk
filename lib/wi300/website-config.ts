import type { Metadata } from 'next'
import type { DeploymentBrand } from '@/lib/site-profile/deployment-brand'
import type { WiAppearance } from './appearance'
import { newManagedPage } from './managed-pages'

export const WEBSITE_PAGES = [
  { id: 'home', label: 'Trang chủ', url: '/' },
  { id: 'courses', label: 'Khóa học', url: '/khoa-hoc' },
  { id: 'projects', label: 'Dự án', url: '/du-an' },
  { id: 'teachers', label: 'Giảng viên', url: '/giang-vien' },
] as const
export type WebsitePage = (typeof WEBSITE_PAGES)[number]['id']

// Cấu hình đã xuất bản ghi đè thương hiệu; ô trống giữ giá trị Vercel hiện tại.
export function configuredBrand(brand: DeploymentBrand, appearance: WiAppearance): DeploymentBrand {
  const c = appearance.common, seo = appearance.seo
  // Brand được gửi đến Client Components: không gửi nội dung/SEO của trang ẩn hoặc đã xóa.
  const publicAppearance = { ...appearance,
    customPages: appearance.customPages.map(page => page.published && !page.deleted ? page : { ...newManagedPage(page.id, page.slug, 'Trang ẩn'), published: page.published, deleted: page.deleted }),
    pageContent: Object.fromEntries(Object.entries(appearance.pageContent).map(([id, page]) => [id, appearance.hiddenPages.includes(id) ? { ...newManagedPage(page.id, page.slug, 'Trang ẩn'), published: false, deleted: page.deleted } : page])),
  }
  return { ...brand, appearance: publicAppearance, name: c.name || brand.name, tagline: c.tagline || brand.tagline,
    seoTitle: seo.title || brand.seoTitle, description: seo.description || brand.description,
    ogImageUrl: seo.imageUrl || brand.ogImageUrl,
    logoUrl: c.logoUrl || brand.logoUrl, wordmarkUrl: c.logoUrl || brand.wordmarkUrl, iconUrl: c.iconUrl || brand.iconUrl,
    palette: { ...brand.palette, primary: c.primary, accent: c.accent, background: c.background, onSurface: c.foreground },
  }
}
export function websiteMetadata(brand: DeploymentBrand): Metadata {
  const seo = brand.appearance?.seo
  return { description: brand.description, keywords: seo?.keywords || undefined,
    robots: { index: seo?.index ?? true, follow: seo?.follow ?? true },
    openGraph: { title: brand.seoTitle, description: brand.description, siteName: brand.name, images: [brand.ogImageUrl] },
    twitter: { card: 'summary_large_image', title: brand.seoTitle, description: brand.description, images: [brand.ogImageUrl] },
  }
}

// Ô trống kế thừa SEO chung; robots chỉ ghi đè khi admin chọn cấu hình riêng.
export function pageMetadata(brand: DeploymentBrand, page: WebsitePage): Metadata {
  const shared = websiteMetadata(brand), own = brand.appearance?.pageSeo?.[page]
  const fallback = WEBSITE_PAGES.find(item => item.id === page)!
  const title = own?.title || (page === 'home' ? brand.seoTitle : `${brand.appearance?.[page].title || fallback.label} | ${brand.name}`)
  const description = own?.description || brand.description
  const image = own?.imageUrl || brand.ogImageUrl
  return { ...shared, title: { absolute: title }, description, keywords: own?.keywords || shared.keywords,
    alternates: { canonical: fallback.url },
    robots: brand.appearance?.hiddenPages.includes(page) ? { index: false, follow: false } : own && !own.inheritRobots ? { index: own.index, follow: own.follow } : shared.robots,
    openGraph: { title, description, siteName: brand.name, images: [image] },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  }
}
