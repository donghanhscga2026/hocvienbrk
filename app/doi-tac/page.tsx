import Link from 'next/link'
import { notFound } from 'next/navigation'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { getCurrentDeploymentBrand } from '@/lib/site-profile/deployment-runtime'
import Wi300PartnerForm from '@/components/wi300/Wi300PartnerForm'

export const metadata = { title: 'Đăng ký đối tác' }
export default async function Page() {
  const brand = await getCurrentDeploymentBrand()
  if (!brand) notFound()
  const session = await auth()
  const id = session?.user?.id == null ? NaN : Number(session.user.id)
  const loggedIn = Number.isSafeInteger(id) && id >= 0
  let phone = ''
  if (loggedIn) {
    try { phone = (await prisma.user.findUnique({ where: { id }, select: { phone: true } }))?.phone || '' } catch { /* Form can accept the contact number if prefill is unavailable. */ }
  }
  return <main className="mx-auto w-full max-w-7xl px-4 py-10 text-brk-on-surface sm:px-6">
    <nav aria-label="Đường dẫn trang" className="mb-6 flex gap-2 text-sm text-brk-muted"><Link href="/" className="text-brk-primary">Trang chủ</Link><span aria-hidden>/</span><span aria-current="page">Đăng ký đối tác</span></nav>
    <h1 className="text-3xl font-bold">Trở thành đối tác {brand.name}</h1>
    <p className="mt-4 max-w-3xl leading-7 text-brk-muted">Chia sẻ chuyên môn với vai trò giảng viên hoặc kết nối doanh nghiệp của bạn với hệ sinh thái Wi. Bạn có thể đăng ký cả hai bằng tài khoản hiện tại.</p>
    <ol className="my-8 grid gap-3 sm:grid-cols-3">{['Gửi thông tin và hồ sơ', 'Ban điều phối trao đổi trực tiếp', 'Xét hồ sơ và cấp quyền phù hợp'].map((text, index) => <li key={text} className="rounded-xl border border-brk-outline bg-white p-4"><span className="mr-2 font-bold text-brk-primary">{index + 1}.</span>{text}</li>)}</ol>
    {loggedIn ? <Wi300PartnerForm name={session?.user?.name || 'Thành viên'} phone={phone} /> : <div className="rounded-2xl border border-brk-outline bg-white p-6"><h2 className="text-xl font-bold">Dùng tài khoản thành viên để gửi yêu cầu</h2><p className="mt-3 leading-7 text-brk-muted">Đăng nhập để hồ sơ được gắn với tài khoản và theo dõi phản hồi. Nếu chưa có tài khoản, hãy đăng ký thành viên rồi quay lại mục Đăng ký đối tác.</p><div className="mt-5 flex flex-wrap gap-3"><Link href="/login?callbackUrl=%2Fdoi-tac" className="inline-flex min-h-12 items-center rounded-xl bg-brk-primary px-5 font-semibold text-white">Đăng nhập và gửi yêu cầu</Link><Link href="/register" className="inline-flex min-h-12 items-center rounded-xl border border-brk-outline px-5 font-semibold text-brk-primary">Tạo tài khoản</Link></div></div>}
  </main>
}
