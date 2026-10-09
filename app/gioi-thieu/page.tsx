import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getCurrentDeploymentBrand } from '@/lib/site-profile/deployment-runtime'

export const metadata = { title: 'Giới thiệu' }
export default async function Page() {
  const brand = await getCurrentDeploymentBrand()
  if (!brand) notFound()
  return <main className="min-h-screen bg-brk-background px-4 py-12 text-brk-on-surface"><div className="mx-auto max-w-4xl"><p className="font-semibold text-brk-primary">{brand.tagline}</p><h1 className="mt-4 text-4xl font-extrabold sm:text-5xl">Kết nối để cùng phát triển</h1><div className="mt-8 grid items-center gap-8 rounded-3xl border border-brk-outline bg-white p-6 sm:grid-cols-[200px_1fr] sm:p-10"><Image src={brand.logoUrl} alt="WIPA" width={500} height={500} unoptimized className="mx-auto h-48 w-48 object-contain" /><div className="space-y-4 leading-7 text-brk-muted"><p>{brand.description}</p><p>{brand.name} hướng đến một hệ sinh thái nơi các doanh nghiệp chia sẻ tri thức, giới thiệu sản phẩm và dịch vụ, tạo cơ hội hợp tác và cùng nâng cao năng lực trong thời đại số.</p><p>Giai đoạn đầu tập trung vào khóa học. Sản phẩm và dịch vụ sẽ được bổ sung khi cộng đồng sẵn sàng.</p></div></div><div className="mt-8 flex flex-wrap gap-3"><Link href="/khoa-hoc" className="inline-flex min-h-12 items-center rounded-xl bg-brk-primary px-5 font-semibold text-white">Khám phá khóa học →</Link><Link href="/kham-pha" className="inline-flex min-h-12 items-center rounded-xl border border-brk-outline bg-white px-5 font-semibold">Khám phá hệ sinh thái</Link></div></div></main>
}
