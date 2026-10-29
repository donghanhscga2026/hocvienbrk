import { auth } from '@/auth'
import MainHeader from '@/components/layout/MainHeader'
import BookingWizard from '@/components/booking/BookingWizard'
import { getPublicSession } from '@/lib/booking/service'
import { getMemberPrefill } from '@/lib/booking/member'

export const dynamic = 'force-dynamic'

/**
 * Trang đặt lịch hẹn công khai theo mã phiên (kiểu Bookify):
 * /dat-lich/[code]?trk=<nguồn>&tags=<nhóm khách>
 * Khách không cần tài khoản; học viên đã đăng nhập được tự điền thông tin.
 */
export default async function DatLichPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>
  searchParams: Promise<{ trk?: string; tags?: string }>
}) {
  const { code } = await params
  const query = await searchParams
  const session = await getPublicSession(code)

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-50">
        <MainHeader title="Đặt lịch hẹn" />
        <main className="mx-auto max-w-2xl p-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
            <h1 className="text-lg font-semibold text-slate-800">Không tìm thấy phiên hẹn</h1>
            <p className="mt-2 text-sm text-slate-500">
              Link đặt lịch không đúng hoặc phiên hẹn đã tạm dừng. Vui lòng kiểm tra lại link bạn nhận được.
            </p>
          </div>
        </main>
      </div>
    )
  }

  const authSession = await auth()
  const memberId = authSession?.user?.id ? Number(authSession.user.id) : NaN
  const member = Number.isInteger(memberId) ? await getMemberPrefill(memberId) : null
  const prefill = member
    ? { name: member.name, email: member.email, phone: member.phone }
    : { name: '', email: '', phone: '' }
  const viewer = { isMember: !!member, hasPhone: !!member?.hasPhone }

  return (
    <div className="min-h-screen bg-slate-50">
      <MainHeader title="Đặt lịch hẹn" />
      <main className="mx-auto max-w-4xl p-4 sm:p-6">
        <BookingWizard
          session={session}
          source={query.trk || ''}
          tags={query.tags || ''}
          prefill={prefill}
          viewer={viewer}
        />
      </main>
    </div>
  )
}
