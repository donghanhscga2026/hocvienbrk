import type { Metadata } from 'next'
import type { DeploymentBrand } from '@/lib/site-profile/deployment-brand'
import type { WiAppearance } from './appearance'

// Cấu hình đã xuất bản ghi đè thương hiệu; ô trống giữ giá trị Vercel hiện tại.
export function configuredBrand(brand: DeploymentBrand, appearance: WiAppearance): DeploymentBrand {
  const c = appearance.common, seo = appearance.seo
  return { ...brand, appearance, name: c.name || brand.name, tagline: c.tagline || brand.tagline,
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
