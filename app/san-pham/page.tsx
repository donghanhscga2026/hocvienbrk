import Link from 'next/link'
import { Package } from 'lucide-react'
import { notFound } from 'next/navigation'
import { getCurrentDeploymentBrand } from '@/lib/site-profile/deployment-runtime'

export const metadata = { title: 'Sản phẩm' }
export default async function Page() {
  const brand = await getCurrentDeploymentBrand()
  if (!brand) notFound()
  return <main className="mx-auto w-full max-w-7xl px-4 py-10 text-brk-on-surface sm:px-6 lg:py-16">
    <nav aria-label="Đường dẫn trang" className="mb-8 flex gap-2 text-sm text-brk-muted"><Link href="/" className="text-brk-primary">Trang chủ</Link><span aria-hidden>/</span><span aria-current="page">Sản phẩm</span></nav>
    <div className="rounded-3xl border border-brk-outline bg-white p-6 sm:p-12">
      <Package className="mb-5 h-12 w-12 text-brk-primary" aria-hidden="true" />
      <h1 className="text-3xl font-bold sm:text-4xl">Sản phẩm từ doanh nghiệp Wi</h1>
      <p className="mt-5 max-w-2xl leading-7 text-brk-muted">Không gian giới thiệu sản phẩm trong hệ sinh thái {brand.name}. Danh mục sản phẩm đang được chuẩn bị và sẽ được bổ sung trong thời gian tới.</p>
      <p className="mt-3 max-w-2xl leading-7 text-brk-muted">Bạn là doanh nghiệp muốn giới thiệu sản phẩm? Gửi yêu cầu để ban điều phối trao đổi về phương án hợp tác.</p>
      <div className="mt-8 flex flex-wrap gap-3"><Link href="/doi-tac" className="inline-flex min-h-12 items-center rounded-xl bg-brk-primary px-5 font-semibold text-white">Đăng ký doanh nghiệp</Link><Link href="/khoa-hoc" className="inline-flex min-h-12 items-center rounded-xl border border-brk-outline px-5 font-semibold text-brk-primary">Khám phá khóa học</Link></div>
    </div>
  </main>
}
