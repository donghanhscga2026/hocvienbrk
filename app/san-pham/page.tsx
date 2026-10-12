import Link from 'next/link'
import prisma from '@/lib/prisma'
import { readProjects } from '@/lib/wi300/project-service'
import { Package } from 'lucide-react'
import { notFound } from 'next/navigation'
import { getCurrentDeploymentBrand } from '@/lib/site-profile/deployment-runtime'

export const metadata = { title: 'Sản phẩm & dịch vụ' }
export default async function Page() {
  const brand = await getCurrentDeploymentBrand()
  if (!brand) notFound()
  const projects = (await readProjects(prisma)).filter(project => project.published)
  return <main className="mx-auto w-full max-w-7xl px-4 py-10 text-brk-on-surface sm:px-6 lg:py-16">
    <nav aria-label="Đường dẫn trang" className="mb-8 flex gap-2 text-sm text-brk-muted"><Link href="/" className="text-brk-primary">Trang chủ</Link><span aria-hidden>/</span><span aria-current="page">Sản phẩm</span></nav>
    <div className="rounded-3xl border border-brk-outline bg-white p-6 sm:p-12">
      <Package className="mb-5 h-12 w-12 text-brk-primary" aria-hidden="true" />
      <h1 className="text-3xl font-bold sm:text-4xl">Sản phẩm & dịch vụ từ doanh nghiệp Wi</h1>
      <p className="mt-5 max-w-2xl leading-7 text-brk-muted">Khám phá sản phẩm và dịch vụ trong hệ sinh thái {brand.name}. Bấm vào nội dung để xem chi tiết hoặc liên hệ đơn vị cung cấp.</p>
      <p className="mt-3 max-w-2xl leading-7 text-brk-muted">Bạn là doanh nghiệp muốn giới thiệu sản phẩm? Gửi yêu cầu để ban điều phối trao đổi về phương án hợp tác.</p>
      <div className="mt-8 flex flex-wrap gap-3"><Link href="/doi-tac" className="inline-flex min-h-12 items-center rounded-xl bg-brk-primary px-5 font-semibold text-white">Đăng ký doanh nghiệp</Link><Link href="/khoa-hoc" className="inline-flex min-h-12 items-center rounded-xl border border-brk-outline px-5 font-semibold text-brk-primary">Khám phá khóa học</Link></div>
    </div>
    {(['PRODUCT', 'SERVICE'] as const).map(kind => <section key={kind} className="mt-8"><h2 className="text-2xl font-bold">{kind === 'PRODUCT' ? 'Sản phẩm' : 'Dịch vụ'}</h2><div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{projects.flatMap(project => project.offerings.filter(item => item.kind === kind).map((item, index) => <article key={`${project.slug}:${index}`} className="space-y-3 rounded-2xl border border-brk-outline bg-white p-5"><Link href={`/du-an/${project.slug}`} className="text-sm font-semibold text-brk-primary">{project.name}</Link><h3 className="break-words text-lg font-bold">{item.name}</h3><p className="whitespace-pre-wrap break-words text-sm leading-6 text-brk-muted">{item.description}</p><a href={item.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center font-semibold text-brk-primary">Xem chi tiết / liên hệ ↗</a></article>))}</div>{!projects.some(project => project.offerings.some(item => item.kind === kind)) && <p className="mt-4 text-brk-muted">Thông tin đang được cập nhật.</p>}</section>)}
  </main>
}
