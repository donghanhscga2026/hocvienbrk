import type { MetadataRoute } from 'next'
import { headers } from 'next/headers'
import { PLATFORM_ORIGIN, requestHostname } from '@/lib/website/domain-shared'
import { getCurrentDeploymentBrand } from '@/lib/site-profile/deployment-runtime'

// Sitemap theo đúng host của request: hai tên miền nền tảng (wi300.vn,
// giautoandien.io.vn) dùng chung code nhưng mỗi tên miền tự khai báo URL
// của chính mình, không trỏ chéo sang tên miền còn lại.
export const dynamic = 'force-dynamic'

// Các route tĩnh công khai có thật trong app/ (đã đối chiếu cây thư mục:
// /kham-pha chỉ redirect về trang chủ nên không đưa vào).
const PUBLIC_PATHS = [
  '/',
  '/khoa-hoc',
  '/giang-vien',
  '/du-an',
  '/gioi-thieu',
  '/bai-viet',
  '/san-pham',
  '/dich-vu',
  '/doi-tac',
] as const

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const host = requestHostname((await headers()).get('host') || '')
  const base = host ? `https://${host}` : PLATFORM_ORIGIN
  const now = new Date()
  const entries: MetadataRoute.Sitemap = PUBLIC_PATHS.map((path) => ({
    url: base + path,
    lastModified: now,
    changeFrequency: path === '/' ? 'daily' : 'weekly',
    priority: path === '/' ? 1 : 0.7,
  }))
  // Trang tự tạo đã xuất bản của thương hiệu triển khai — cùng nguồn dữ
  // liệu và cùng điều kiện (published, chưa xóa) mà trang [slug] phục vụ.
  try {
    const brand = await getCurrentDeploymentBrand()
    for (const page of brand?.appearance?.customPages ?? []) {
      if (!page.published || page.deleted || !page.slug) continue
      entries.push({
        url: `${base}/${page.slug}`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.6,
      })
    }
  } catch {
    // Đọc cấu hình lỗi thì sitemap tĩnh vẫn dùng được.
  }
  return entries
}
