import Link from 'next/link'
import Image from 'next/image'
import MainHeader from '@/components/layout/MainHeader'
import FooterSection from '@/components/home/FooterSection'
import { getCurrentSiteProfile } from '@/lib/site-profile/runtime'
import { FALLBACK_PROFILE } from '@/lib/db-fallback'

/**
 * Bản classic (giautoandien) của trang Giới thiệu.
 * Nội dung lấy từ SiteProfile hiện tại (tiêu đề, phụ đề, mô tả, ảnh đại
 * diện) — cùng hồ sơ mà trang chủ classic đang hiển thị.
 */
export default async function ClassicAboutPage() {
  const profile = await getCurrentSiteProfile()
  const safeProfile: any = profile || FALLBACK_PROFILE
  const title = safeProfile.title || 'MFC - Dòng chảy Phước Báu'
  const subtitle = safeProfile.subtitle || safeProfile.metaDescription || ''
  const description = safeProfile.metaDescription || safeProfile.messageDetail || safeProfile.messageContent || ''
  return (
    <main className="min-h-screen" style={{ backgroundColor: safeProfile.backgroundColor || undefined }}>
      <MainHeader title="GIỚI THIỆU" profile={profile} />
      <section className="container mx-auto max-w-4xl px-4 py-12">
        <p className="mb-4 font-semibold text-brk-primary">Giới thiệu</p>
        <h1 className="break-words text-3xl font-black text-brk-on-surface sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-4 text-lg leading-8 text-brk-on-surface">{subtitle}</p>}
        {safeProfile.heroImage && <Image src={safeProfile.heroImage} alt="" width={1200} height={630} unoptimized className="mt-8 w-full rounded-[2rem] border border-brk-outline object-cover shadow-xl" />}
        {description && <p className="mt-8 whitespace-pre-line break-words leading-8 text-brk-muted">{description}</p>}
        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/khoa-hoc" className="inline-flex min-h-12 items-center rounded-xl bg-brk-primary px-5 font-semibold text-brk-on-primary">Khám phá khóa học →</Link>
          <Link href="/giang-vien" className="inline-flex min-h-12 items-center rounded-xl border border-brk-outline bg-brk-surface px-5 font-semibold text-brk-primary">Đội ngũ giảng viên</Link>
        </div>
      </section>
      <FooterSection profile={safeProfile} />
    </main>
  )
}
