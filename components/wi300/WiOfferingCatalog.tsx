import Link from 'next/link'
import { BriefcaseBusiness, Package } from 'lucide-react'
import { notFound } from 'next/navigation'
import prisma from '@/lib/prisma'
import { readProjects } from '@/lib/wi300/project-service'
import { getPresentationBrand } from '@/lib/site-profile/presentation'
import { systemPageContent, systemPageHidden } from '@/lib/wi300/managed-page-runtime'
import { gridColumns } from '@/lib/wi300/appearance'
import WiContentPage from './WiContentPage'

/** Hai trang dùng chung giao diện, chỉ lấy nội dung đúng loại từ dự án công khai. */
export default async function WiOfferingCatalog({ kind }: { kind: 'PRODUCT' | 'SERVICE' }) {
  const product = kind === 'PRODUCT'
  const pageId = product ? 'products' : 'services'
  // Brand theo trang: deployment brand, hoặc brand chọn-dùng khi site bật
  // bản wi300 cho riêng trang sản phẩm/dịch vụ qua siteConfig.ui.pages.
  const brand = await getPresentationBrand(pageId)
  if (!brand) notFound()
  if (systemPageHidden(brand, pageId)) notFound()
  const page = systemPageContent(brand, pageId)
  const title = product ? 'Sản phẩm' : 'Dịch vụ'
  const Icon = product ? Package : BriefcaseBusiness
  const projects = (await readProjects(prisma)).filter(project => project.published)
  const offerings = projects.flatMap(project => project.offerings
    .filter(item => item.kind === kind)
    .map((item, index) => ({ project, item, index })))
  return <main className="mx-auto w-full max-w-7xl px-4 py-10 text-brk-on-surface sm:px-6 lg:py-16">
    <nav aria-label="Đường dẫn trang" className="mb-8 flex gap-2 text-sm text-brk-muted"><Link href="/" className="text-brk-primary">Trang chủ</Link><span aria-hidden>/</span><span aria-current="page">{title}</span></nav>
    <div className="rounded-3xl border border-brk-outline bg-white p-6 sm:p-12">
      <Icon className="mb-5 h-12 w-12 text-brk-primary" aria-hidden="true" />
      <WiContentPage page={page} fallbackTitle={title + ' trong hệ sinh thái Wi'} fallbackDescription={`Khám phá ${title.toLocaleLowerCase('vi')} từ các dự án trong hệ sinh thái ${brand.name}. Xem chi tiết hoặc liên hệ đơn vị cung cấp để tìm hiểu thêm.`} />
      {page.showCTA && !page.ctaLabel && <div className="mt-8 flex flex-wrap gap-3"><Link href="/doi-tac" className="inline-flex min-h-12 items-center rounded-xl bg-brk-primary px-5 font-semibold text-white">Đăng ký làm đối tác</Link><Link href={product ? '/dich-vu' : '/san-pham'} className="inline-flex min-h-12 items-center rounded-xl border border-brk-outline px-5 font-semibold text-brk-primary">{product ? 'Khám phá dịch vụ' : 'Khám phá sản phẩm'}</Link></div>}
    </div>
    {page.showList && <section aria-label={title} className="mt-8">
      {offerings.length ? <div className={`grid gap-4 ${gridColumns[page.columns]}`}>{offerings.map(({ project, item, index }) => <article key={project.slug + ':' + index} className="min-w-0 space-y-3 rounded-2xl border border-brk-outline bg-white p-5">
        <Link href={'/du-an/' + project.slug} className="text-sm font-semibold text-brk-primary">{project.name}</Link>
        <h2 className="break-words text-lg font-bold">{item.name}</h2><p className="whitespace-pre-wrap break-words text-sm leading-6 text-brk-muted">{item.description}</p>
        <a href={item.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center font-semibold text-brk-primary">Xem chi tiết / liên hệ ↗</a>
      </article>)}</div> : <p className="rounded-2xl border border-brk-outline bg-white p-6 text-brk-muted">Thông tin {title.toLocaleLowerCase('vi')} đang được cập nhật.</p>}
    </section>}
  </main>
}
