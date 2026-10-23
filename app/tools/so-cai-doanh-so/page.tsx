import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { getSalesSummaryByMember, getMemberEntries } from "@/lib/sales-ledger/service"
import SyncButton from "@/components/sales-ledger/SyncButton"

/**
 * Quản trị: Sổ cái doanh số thành viên — GMV ghi nhận theo từng thành
 * viên, tách hai vai Giảng viên / Affiliate, đã trừ các dòng đảo (đơn
 * hoàn/hủy). Nguồn: đồng bộ idempotent từ bảng Order (cron hoặc nút
 * Đồng bộ ngay). Chỉ ADMIN. GĐ2A (23/10/2026).
 */
export default async function SoCaiDoanhSoPage({
  searchParams
}: {
  searchParams: Promise<{ period?: string; userId?: string; page?: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/')
  if (session.user.role !== 'ADMIN') {
    return <div className="p-6 max-w-3xl mx-auto"><p className="text-gray-500">Bạn không có quyền xem trang này.</p></div>
  }

  const params = await searchParams
  const now = new Date()
  const period = params.period && (params.period === 'all' || /^\d{4}-\d{2}$/.test(params.period))
    ? params.period
    : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const from = period === 'all' ? new Date(0) : new Date(`${period}-01T00:00:00.000Z`)
  const to = period === 'all' ? new Date('9999-12-31T00:00:00.000Z') : new Date(new Date(from).setUTCMonth(from.getUTCMonth() + 1))

  const summary = await getSalesSummaryByMember(from, to)
  const fmt = (n: number) => n.toLocaleString('vi-VN') + 'đ'
  const detailUserId = Number(params.userId) || null
  const detail = detailUserId ? await getMemberEntries(detailUserId, Math.max(1, Number(params.page) || 1), 50) : null
  const detailUser = detailUserId ? summary.find((s) => s.userId === detailUserId) : null

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Sổ cái doanh số thành viên</h1>
          <p className="text-sm text-gray-500 mt-1">
            Doanh số khóa học tạo ra qua từng thành viên, tách vai Giảng viên (bán khóa của mình, gồm cả đơn do
            affiliate mang về) và vai Affiliate (mang khách tới). Số liệu ròng sau khi trừ đơn hoàn/hủy.
          </p>
        </div>
        <SyncButton />
      </div>

      <form method="GET" className="flex flex-wrap items-center gap-2 mt-5">
        <label className="text-sm text-gray-600" htmlFor="period">Kỳ:</label>
        <input id="period" type="month" name="period" defaultValue={period === 'all' ? '' : period} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        <button type="submit" className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white">Xem</button>
        <Link href="/tools/so-cai-doanh-so?period=all" className="text-sm text-gray-500 underline">Toàn bộ thời gian</Link>
      </form>

      <div className="overflow-x-auto mt-5 rounded-2xl border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-gray-500">
              <th className="px-3 py-2 font-medium">Thành viên</th>
              <th className="px-3 py-2 font-medium text-right">GMV vai Giảng viên</th>
              <th className="px-3 py-2 font-medium text-right">GMV vai Affiliate</th>
              <th className="px-3 py-2 font-medium text-right">Tổng GMV ghi nhận</th>
              <th className="px-3 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {summary.map((s) => (
              <tr key={s.userId} className="border-t border-gray-100">
                <td className="px-3 py-2">
                  <span className="font-medium text-gray-900">{s.userName ?? '(chưa đặt tên)'}</span>
                  <span className="block text-xs text-gray-400">HV {s.userId} · {s.email}</span>
                </td>
                <td className="px-3 py-2 text-right">{fmt(s.teacherGmv)}</td>
                <td className="px-3 py-2 text-right">{fmt(s.affiliateGmv)}</td>
                <td className="px-3 py-2 text-right font-semibold">{fmt(s.totalGmv)}</td>
                <td className="px-3 py-2 text-right">
                  <Link className="text-gray-600 underline" href={`/tools/so-cai-doanh-so?period=${period}&userId=${s.userId}`}>Chi tiết</Link>
                </td>
              </tr>
            ))}
            {summary.length === 0 && (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-400">Chưa có dòng sổ nào trong kỳ. Bấm nút Đồng bộ ngay để quét đơn đã thanh toán.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {detail && detailUserId && (
        <div className="mt-8">
          <h2 className="font-bold text-gray-900">Chi tiết dòng sổ — HV {detailUserId}{detailUser ? ` · ${detailUser.userName ?? ''}` : ''}</h2>
          <div className="overflow-x-auto mt-3 rounded-2xl border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-gray-500">
                  <th className="px-3 py-2 font-medium">Thời điểm</th>
                  <th className="px-3 py-2 font-medium">Vai</th>
                  <th className="px-3 py-2 font-medium">Loại</th>
                  <th className="px-3 py-2 font-medium">Đơn</th>
                  <th className="px-3 py-2 font-medium">Khóa</th>
                  <th className="px-3 py-2 font-medium text-right">Số tiền</th>
                </tr>
              </thead>
              <tbody>
                {detail.rows.map((r) => (
                  <tr key={r.id} className="border-t border-gray-100">
                    <td className="px-3 py-2">{r.occurredAt.toISOString().slice(0, 10)}</td>
                    <td className="px-3 py-2">{r.role === 'TEACHER' ? 'Giảng viên' : 'Affiliate'}</td>
                    <td className="px-3 py-2">{r.type === 'ACCRUAL' ? 'Ghi nhận' : 'Đảo (hoàn/hủy)'}</td>
                    <td className="px-3 py-2">#{r.orderId}</td>
                    <td className="px-3 py-2">{r.courseId ? `#${r.courseId}` : '—'}</td>
                    <td className="px-3 py-2 text-right">{fmt(r.amount)}</td>
                  </tr>
                ))}
                {detail.rows.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-gray-400">Thành viên này chưa có dòng sổ nào.</td></tr>}
              </tbody>
            </table>
          </div>
          {detail.totalPages > 1 && (
            <p className="text-sm text-gray-500 mt-3">Trang {Math.max(1, Number(params.page) || 1)}/{detail.totalPages} — dùng ?page= để chuyển trang.</p>
          )}
        </div>
      )}
    </div>
  )
}
