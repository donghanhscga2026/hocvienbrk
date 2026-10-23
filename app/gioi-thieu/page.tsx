import WiContentPage from '@/components/wi300/WiContentPage'
import { systemPageContent, systemPageMetadata, systemPageHidden } from '@/lib/wi300/managed-page-runtime'
import Wi300Businesses from '@/components/wi300/Wi300Businesses'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getCurrentDeploymentBrand } from '@/lib/site-profile/deployment-runtime'

export async function generateMetadata() { const brand = await getCurrentDeploymentBrand(); return brand ? systemPageMetadata(brand, 'about') : { title: 'Giới thiệu' } }
export default async function Page() {
  const brand = await getCurrentDeploymentBrand()
  if (!brand || systemPageHidden(brand, 'about')) notFound()
  const page = systemPageContent(brand, 'about')
  const body = `${brand.description}\n\n${brand.name} hướng đến một hệ sinh thái dành cho cá nhân và doanh nghiệp, chia sẻ tri thức, giới thiệu sản phẩm và dịch vụ, tạo cơ hội hợp tác và cùng nâng cao năng lực trong thời đại số.\n\n300DNS là dự án của WIPA. Các dự án thuộc 300DNS được WIPA cố vấn.\n\nGiai đoạn đầu tập trung vào khóa học. Sản phẩm và dịch vụ sẽ được bổ sung khi cộng đồng sẵn sàng.`
  return <main className="bg-brk-background px-4 py-12 text-brk-on-surface"><div className="mx-auto max-w-4xl"><p className="mb-4 font-semibold text-brk-primary">{brand.tagline}</p><WiContentPage page={page} fallbackTitle="Kết nối để cùng phát triển" fallbackBody={body} fallbackImage={brand.logoUrl} />{page.showCTA && !page.ctaLabel && <div className="mt-8 flex flex-wrap gap-3"><Link href="/khoa-hoc" className="inline-flex min-h-12 items-center rounded-xl bg-brk-primary px-5 font-semibold text-white">Khám phá khóa học →</Link><Link href="/kham-pha" className="inline-flex min-h-12 items-center rounded-xl border border-brk-outline bg-white px-5 font-semibold">Khám phá hệ sinh thái</Link></div>}</div><Wi300Businesses /></main>
}
