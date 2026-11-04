import Link from 'next/link'
import MainHeader from '@/components/layout/MainHeader'
import FooterSection from '@/components/home/FooterSection'
import prisma from '@/lib/prisma'
import { readProjects } from '@/lib/wi300/project-service'
import { getCurrentSiteProfile } from '@/lib/site-profile/runtime'
import { FALLBACK_PROFILE } from '@/lib/db-fallback'
import OfferingCatalog from '@/components/offerings/OfferingCatalog'
import { getOfferingCatalog } from '@/lib/offerings/server'

/**
 * Bản classic (giautoandien) của trang Sản phẩm / Dịch vụ.
 * Dữ liệu dùng chung với bản wi300: offerings của các dự án đã xuất bản
 * qua cùng service readProjects; chỉ khác khung hiển thị classic.
 */
export default async function ClassicOfferingCatalog({ kind }: { kind: 'PRODUCT' | 'SERVICE' }) {
  const product = kind === 'PRODUCT'
  const title = product ? 'Sản phẩm số' : 'Dịch vụ'
  const profile = await getCurrentSiteProfile()
  const safeProfile = profile || FALLBACK_PROFILE
  let items: Awaited<ReturnType<typeof getOfferingCatalog>> = []
  let catalogError = false
  try { items = await getOfferingCatalog(product ? 'DIGITAL' : 'SERVICE') } catch { catalogError = true }
  const projects = (await readProjects(prisma)).filter(project => project.published)
  const offerings = projects.flatMap(project => project.offerings
    .filter(item => item.kind === kind)
    .map((item, index) => ({ project, item, index })))
  return (
    <main className="min-h-screen" style={{ backgroundColor: (safeProfile as any).backgroundColor || undefined }}>
      <MainHeader title={title} profile={profile} />
      <section className="container mx-auto px-4 py-10">
        <nav aria-label="Đường dẫn trang" className="mb-6 flex gap-2 text-sm text-brk-muted"><Link href="/" className="text-brk-primary">Trang chủ</Link><span aria-hidden>/</span><span aria-current="page">{title}</span></nav>
        <h1 className="text-3xl font-black text-brk-on-surface">{title}</h1>
        <p className="mt-2 max-w-3xl leading-7 text-brk-muted">Khám phá {title.toLocaleLowerCase('vi')} từ các dự án trong cộng đồng. Xem chi tiết hoặc liên hệ đơn vị cung cấp để tìm hiểu thêm.</p>
        <div className="mt-6 flex flex-wrap gap-3"><Link href="/doi-tac" className="inline-flex min-h-12 items-center rounded-xl bg-brk-primary px-5 font-semibold text-brk-on-primary">Đăng ký làm đối tác</Link><Link href={product ? '/dich-vu' : '/san-pham'} className="inline-flex min-h-12 items-center rounded-xl border border-brk-outline bg-brk-surface px-5 font-semibold text-brk-primary">{product ? 'Khám phá dịch vụ' : 'Khám phá sản phẩm'}</Link></div>
        <div className="mt-8">{catalogError ? <p role="alert" className="rounded-xl bg-amber-50 p-5 text-amber-900">Chưa tải được danh mục. Vui lòng tải lại trang.</p> : <OfferingCatalog group={product ? 'DIGITAL' : 'SERVICE'} items={items} />}</div>
        {offerings.length > 0 && <section aria-label="Giới thiệu từ dự án" className="mt-10">
          <h2 className="mb-4 text-xl font-bold">Giới thiệu từ các dự án</h2>
          {offerings.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{offerings.map(({ project, item, index }) => (
              <article key={project.slug + ':' + index} className="min-w-0 space-y-3 rounded-2xl border border-brk-outline bg-brk-surface p-5 shadow-sm">
                <Link href={'/du-an/' + project.slug} className="text-sm font-semibold text-brk-primary">{project.name}</Link>
                <h2 className="break-words text-lg font-bold text-brk-on-surface">{item.name}</h2>
                <p className="whitespace-pre-wrap break-words text-sm leading-6 text-brk-muted">{item.description}</p>
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center font-semibold text-brk-primary">Xem chi tiết / liên hệ ↗</a>
              </article>
            ))}</div>
          ) : (
            <p className="rounded-2xl border border-brk-outline bg-brk-surface p-6 text-brk-muted">Thông tin {title.toLocaleLowerCase('vi')} đang được cập nhật.</p>
          )}
        </section>}
      </section>
      <FooterSection profile={safeProfile as any} />
    </main>
  )
}
