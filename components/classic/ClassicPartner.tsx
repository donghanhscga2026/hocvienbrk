import Link from 'next/link'
import MainHeader from '@/components/layout/MainHeader'
import FooterSection from '@/components/home/FooterSection'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import Wi300PartnerForm from '@/components/wi300/Wi300PartnerForm'
import { getCurrentSiteProfile } from '@/lib/site-profile/runtime'
import { FALLBACK_PROFILE } from '@/lib/db-fallback'

/**
 * Bản classic (giautoandien) của trang Đăng ký đối tác.
 * Dùng chung biểu mẫu và hành động gửi yêu cầu đối tác hiện tại
 * (Wi300PartnerForm → API partner-requests), chỉ bọc khung classic.
 */
export default async function ClassicPartnerPage() {
  const profile = await getCurrentSiteProfile()
  const safeProfile: any = profile || FALLBACK_PROFILE
  const session = await auth()
  const id = session?.user?.id == null ? NaN : Number(session.user.id)
  const loggedIn = Number.isSafeInteger(id) && id >= 0
  let phone = ''
  if (loggedIn) {
    try { phone = (await prisma.user.findUnique({ where: { id }, select: { phone: true } }))?.phone || '' } catch { /* Form can accept the contact number if prefill is unavailable. */ }
  }
  return (
    <main className="min-h-screen" style={{ backgroundColor: safeProfile.backgroundColor || undefined }}>
      <MainHeader title="ĐĂNG KÝ ĐỐI TÁC" profile={profile} />
      <section className="container mx-auto max-w-5xl px-4 py-10">
        <nav aria-label="Đường dẫn trang" className="mb-6 flex gap-2 text-sm text-brk-muted"><Link href="/" className="text-brk-primary">Trang chủ</Link><span aria-hidden>/</span><span aria-current="page">Đăng ký đối tác</span></nav>
        <h1 className="text-3xl font-black text-brk-on-surface">Trở thành đối tác</h1>
        <p className="mt-3 max-w-3xl leading-7 text-brk-muted">Chia sẻ chuyên môn với vai trò giảng viên hoặc kết nối doanh nghiệp của bạn với cộng đồng. Bạn có thể đăng ký cả hai bằng tài khoản hiện tại.</p>
        <ol className="my-8 grid gap-3 sm:grid-cols-3">{['Gửi thông tin và hồ sơ', 'Ban điều phối trao đổi trực tiếp', 'Xét hồ sơ và cấp quyền phù hợp'].map((text, index) => <li key={text} className="rounded-xl border border-brk-outline bg-brk-surface p-4 shadow-sm"><span className="mr-2 font-bold text-brk-primary">{index + 1}.</span>{text}</li>)}</ol>
        {loggedIn
          ? <Wi300PartnerForm name={session?.user?.name || 'Thành viên'} phone={phone} />
          : <div className="rounded-2xl border border-brk-outline bg-brk-surface p-6 shadow-sm"><h2 className="text-xl font-bold text-brk-on-surface">Dùng tài khoản thành viên để gửi yêu cầu</h2><p className="mt-3 leading-7 text-brk-muted">Đăng nhập để hồ sơ được gắn với tài khoản và theo dõi phản hồi. Nếu chưa có tài khoản, hãy đăng ký thành viên rồi quay lại mục Đăng ký đối tác.</p><div className="mt-5 flex flex-wrap gap-3"><Link href="/login?callbackUrl=%2Fdoi-tac" className="inline-flex min-h-12 items-center rounded-xl bg-brk-primary px-5 font-semibold text-brk-on-primary">Đăng nhập và gửi yêu cầu</Link><Link href="/register?callbackUrl=%2Fdoi-tac" className="inline-flex min-h-12 items-center rounded-xl border border-brk-outline px-5 font-semibold text-brk-primary">Tạo tài khoản</Link></div></div>}
      </section>
      <FooterSection profile={safeProfile} />
    </main>
  )
}
