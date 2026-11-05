import type { MetadataRoute } from 'next'
import { headers } from 'next/headers'
import { PLATFORM_ORIGIN, requestHostname } from '@/lib/website/domain-shared'

// Thay cho public/robots.txt tĩnh trước đây (chỉ có Allow: /): bản động này
// giữ nguyên luật truy cập, đồng thời khai báo Sitemap theo đúng host của
// request để mỗi tên miền nền tảng trỏ về sitemap của chính mình.
export const dynamic = 'force-dynamic'

export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = requestHostname((await headers()).get('host') || '')
  const base = host ? `https://${host}` : PLATFORM_ORIGIN
  return {
    rules: [{ userAgent: '*', allow: '/' }],
    sitemap: `${base}/sitemap.xml`,
  }
}
