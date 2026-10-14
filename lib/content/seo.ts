import { z } from 'zod'
import type { Metadata } from 'next'
import { safeProjectUrl } from '@/lib/wi300/projects'

export const contentSeoSchema = z.object({
  slug: z.string().trim().max(120).regex(/^$|^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Đường dẫn chỉ dùng chữ thường không dấu, số và dấu gạch nối.').default(''),
  title: z.string().trim().max(160).default(''), description: z.string().trim().max(500).default(''),
  imageUrl: z.string().trim().max(1000).refine(safeProjectUrl, 'Đường dẫn ảnh không hợp lệ.').default(''),
  keywords: z.string().trim().max(300).default(''), index: z.boolean().default(true), follow: z.boolean().default(true),
}).strict()
export type ContentSeo = z.infer<typeof contentSeoSchema>
export const emptyContentSeo = contentSeoSchema.parse({})
export function contentUrl(kind: 'post' | 'category', id: string | number, seo: ContentSeo) {
  const base = kind === 'post' ? '/bai-viet/' : '/bai-viet/danh-muc/'
  return base + encodeURIComponent(String(id)) + (seo.slug ? '/' + seo.slug : '')
}
export function contentMetadata(seo: ContentSeo, title: string, description: string, url: string, image?: string | null): Metadata {
  const actualTitle = seo.title || title, actualDescription = seo.description || description.slice(0, 500)
  const images = seo.imageUrl || image
  return { title: { absolute: actualTitle }, description: actualDescription, keywords: seo.keywords || undefined,
    alternates: { canonical: url }, robots: { index: seo.index, follow: seo.follow },
    openGraph: { title: actualTitle, description: actualDescription, url, images: images ? [images] : [] },
    twitter: { card: 'summary_large_image', title: actualTitle, description: actualDescription, images: images ? [images] : [] },
  }
}
