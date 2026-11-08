import Link from 'next/link'
import MainHeader from '@/components/layout/MainHeader'
import FooterSection from '@/components/home/FooterSection'
import prisma from '@/lib/prisma'
import { getCurrentSiteProfile } from '@/lib/site-profile/runtime'
import { FALLBACK_PROFILE } from '@/lib/db-fallback'
import { getSession } from '@/lib/get-session'
import OfferingCatalog from '@/components/offerings/OfferingCatalog'
import { getOfferingCatalog } from '@/lib/offerings/server'

/**
 * Bản classic của trang Sản phẩm / Dịch vụ: khung, header và màu của chính
 * site; đầu trang gọn với tiêu đề + dòng giới thiệu lấy từ cấu hình của
 * site (subtitle của hồ sơ site). Không dùng câu chữ của sàn: không nút
 * "Đăng ký làm đối tác", không mục "Giới thiệu từ các dự án", không
 * "hệ sinh thái".
 */
export default async function ClassicOfferingCatalog({ kind }: { kind: 'PRODUCT' | 'SERVICE' }) {
  const product = kind === 'PRODUCT'
  const title = product ? 'Sản phẩm số' : 'Dịch vụ'
  const profile = await getCurrentSiteProfile()
  const safeProfile = profile || FALLBACK_PROFILE
  const siteTitle = safeProfile.title || ''
  const intro = safeProfile.subtitle || (siteTitle ? `${title} của ${siteTitle}` : title)
  let items: Awaited<ReturnType<typeof getOfferingCatalog>> = []
  let catalogError = false
  try {
    items = await getOfferingCatalog(product ? 'DIGITAL' : 'SERVICE')
  } catch {
    catalogError = true
  }
  // Món người xem đã kích hoạt: thẻ hiện nút "Vào sử dụng" đi thẳng vào
  // không gian dùng của món đó.
  let ownedIds: number[] = []
  if (items.length) {
    try {
      const session = await getSession()
      const userId = session?.user?.id != null ? Number(session.user.id) : null
      if (userId != null) {
        const rows = await prisma.enrollment.findMany({
          where: { userId, status: 'ACTIVE', courseId: { in: items.map((item) => item.id) } },
          select: { courseId: true },
        })
        ownedIds = rows.map((row) => row.courseId)
      }
    } catch {
      ownedIds = []
    }
  }
  return (
    <main className="min-h-screen" style={{ backgroundColor: (safeProfile as any).backgroundColor || undefined }}>
      <MainHeader title={title} profile={profile} />
      <section className="container mx-auto px-4 py-10">
        <nav aria-label="Đường dẫn trang" className="mb-6 flex gap-2 text-sm text-brk-muted">
          <Link href="/" className="text-brk-primary">Trang chủ</Link>
          <span aria-hidden>/</span>
          <span aria-current="page">{title}</span>
        </nav>
        <h1 className="text-3xl font-black text-brk-on-surface">{title}</h1>
        <p className="mt-2 max-w-3xl leading-7 text-brk-muted">{intro}</p>
        <div className="mt-8">
          {catalogError ? (
            <p role="alert" className="rounded-xl bg-amber-50 p-5 text-amber-900">Chưa tải được danh mục. Vui lòng tải lại trang.</p>
          ) : (
            <OfferingCatalog group={product ? 'DIGITAL' : 'SERVICE'} items={items} ownedIds={ownedIds} siteName={siteTitle} />
          )}
        </div>
      </section>
      <FooterSection profile={safeProfile as any} />
    </main>
  )
}
