import MainHeader from '@/components/layout/MainHeader'
import GuestPortal from '@/components/booking/GuestPortal'

export const dynamic = 'force-dynamic'

/**
 * Cổng tra cứu hẹn phía khách (Giai đoạn 2): khách nhập Email + Mã đặt
 * lịch để xem, đổi giờ hoặc hủy lịch hẹn 1:1 — không cần tài khoản,
 * giống cổng tra cứu của Bookify.
 */
export default async function TraCuuHenPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; code?: string }>
}) {
  const query = await searchParams
  return (
    <div className="min-h-screen bg-slate-50">
      <MainHeader title="Tra cứu lịch hẹn" />
      <main className="mx-auto max-w-2xl p-4 sm:p-6">
        <GuestPortal initialEmail={query.email || ''} initialCode={query.code || ''} />
      </main>
    </div>
  )
}
