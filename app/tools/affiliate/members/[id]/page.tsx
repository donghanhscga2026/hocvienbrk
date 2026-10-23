import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { AdminSubNav } from "@/components/admin/AdminSubNav"
import { affiliateSubNav } from "../affiliate-nav"
import { getMemberCommissionDetail } from "@/lib/affiliate/member-detail"
import { currentPeriodSaigon } from "@/lib/affiliate/settlement"
import MemberCommissionActions from "@/components/affiliate/MemberCommissionActions"
import Link from "next/link"

/**
 * Chi tiết hoa hồng của một thành viên.
 * - ADMIN: xem bất kỳ thành viên nào. - Thành viên: chỉ xem của chính mình.
 * - Tổng quan (trực tiếp / tri ân / đã chốt / chờ đối soát), tổng hợp theo
 *   khóa học, và chi tiết từng giao dịch phát sinh hoa hồng.
 * - Kỳ lọc qua ?period=YYYY-MM; mặc định tất cả các kỳ.
 */
export default async function AffiliateMemberDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ period?: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/')
  const viewerId = Number(session.user.id)
  const role = session.user.role

  const { id } = await params
  const memberId = Number(id)
  if (!memberId) redirect('/tools/affiliate/sales')
  const isAdmin = role === 'ADMIN'
  if (!isAdmin && viewerId !== memberId) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <p className="text-gray-500">Bạn chỉ xem được chi tiết hoa hồng của chính mình.</p>
        <Link href="/tools/affiliate" className="text-blue-600 hover:underline text-sm">← Quay lại Affiliate</Link>
      </div>
    )
  }

  const sp = await searchParams
  const period = sp.period && (sp.period === 'all' || /^\d{4}-\d{2}$/.test(sp.period)) ? sp.period : 'all'
  const data = await getMemberCommissionDetail({ memberId, period })
  if (!data) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <p className="text-gray-500">Không tìm thấy thành viên #{memberId}.</p>
      </div>
    )
  }

  const fmt = (n: number) => n.toLocaleString('vi-VN') + 'đ'
  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('vi-VN', { timeZone: 'Asia/Saigon' })
  const showNav = role === 'ADMIN' || role === 'TEACHER'
  const navItems = role === 'ADMIN'
    ? affiliateSubNav
    : affiliateSubNav.filter(i => ['/tools/affiliate', '/tools/affiliate/config', '/tools/affiliate/settlement'].includes(i.href))
  const walletTotal = data.wallet ? data.wallet.pendingBalance + data.wallet.balance : 0

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {showNav && <AdminSubNav title="Affiliate" items={navItems} />}

      <div className="flex flex-wrap items-end justify-between gap-3 mt-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Hoa hồng của {data.member.name} <span className="text-gray-400 text-lg font-normal">#{data.member.id}</span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {data.member.email} · {data.member.role}
            {data.wallet && <> · Số dư ghi nhận hiện tại: <b className="text-gray-700">{fmt(walletTotal)}</b> (chờ đối soát {fmt(data.wallet.pendingBalance)} + đã chốt {fmt(data.wallet.balance)})</>}
          </p>
        </div>
        <MemberCommissionActions lines={data.lines} memberName={data.member.name} memberId={data.member.id} period={period} />
      </div>

      <form method="GET" className="flex flex-wrap items-center gap-2 mt-4 print:hidden">
        <label className="text-sm text-gray-600">Kỳ:</label>
        <input type="month" name="period" defaultValue={period === 'all' ? '' : period} className="px-3 py-2 border border-gray-300 rounded-xl text-sm" />
        <button type="submit" className="px-4 py-2 text-sm font-semibold bg-gray-900 text-white rounded-xl">Xem</button>
        <Link href={`/tools/affiliate/members/${data.member.id}?period=all`} className={`px-4 py-2 text-sm font-semibold rounded-xl border ${period === 'all' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-300'}`}>Tất cả các kỳ</Link>
        <Link href={`/tools/affiliate/members/${data.member.id}?period=${currentPeriodSaigon()}`} className="px-4 py-2 text-sm font-semibold rounded-xl border bg-white text-gray-700 border-gray-300">Tháng này</Link>
      </form>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="text-[11px] font-semibold text-gray-400 uppercase">Tổng hoa hồng</div>
          <div className="text-xl font-bold text-gray-900 mt-1">{fmt(data.totals.total)}</div>
          <div className="text-[11px] text-gray-400">{data.totals.lineCount} dòng · {data.totals.orderCount} đơn hàng</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="text-[11px] font-semibold text-gray-400 uppercase">Trực tiếp / Tri ân</div>
          <div className="text-base font-bold text-gray-900 mt-1">{fmt(data.totals.direct)} <span className="text-gray-300">/</span> {fmt(data.totals.gratitude)}</div>
          <div className="text-[11px] text-gray-400">Qua link của mình / từ người mình giới thiệu</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="text-[11px] font-semibold text-gray-400 uppercase">Đã chốt đối soát</div>
          <div className="text-xl font-bold text-emerald-600 mt-1">{fmt(data.totals.ready)}</div>
          <div className="text-[11px] text-gray-400">Đủ điều kiện được thanh toán</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="text-[11px] font-semibold text-gray-400 uppercase">Chờ đối soát (30 ngày)</div>
          <div className="text-xl font-bold text-amber-600 mt-1">{fmt(data.totals.waiting)}</div>
          <div className="text-[11px] text-gray-400">Chưa tới hạn chốt</div>
        </div>
      </div>

      <h2 className="text-base font-bold text-gray-900 mt-8 mb-2">Theo khóa học</h2>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 border-b border-gray-100">
              <th className="px-4 py-2 text-left font-medium">Khóa học</th>
              <th className="px-4 py-2 text-left font-medium">Giảng viên</th>
              <th className="px-4 py-2 text-right font-medium">Số đơn</th>
              <th className="px-4 py-2 text-right font-medium">Doanh số liên quan</th>
              <th className="px-4 py-2 text-right font-medium">HH trực tiếp</th>
              <th className="px-4 py-2 text-right font-medium">HH tri ân</th>
              <th className="px-4 py-2 text-right font-medium">Tổng HH</th>
            </tr>
          </thead>
          <tbody>
            {data.courses.map(cs => (
              <tr key={String(cs.courseId)} className="border-b border-gray-50">
                <td className="px-4 py-2 font-medium text-gray-800">{cs.courseName}</td>
                <td className="px-4 py-2 text-gray-500">{cs.teacherName || '—'}</td>
                <td className="px-4 py-2 text-right text-gray-500">{cs.orderCount}</td>
                <td className="px-4 py-2 text-right text-gray-700">{fmt(cs.gmv)}</td>
                <td className="px-4 py-2 text-right text-gray-700">{fmt(cs.directAmount)}</td>
                <td className="px-4 py-2 text-right text-gray-700">{fmt(cs.gratitudeAmount)}</td>
                <td className="px-4 py-2 text-right font-bold text-emerald-600">{fmt(cs.totalAmount)}</td>
              </tr>
            ))}
            {data.courses.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-4 text-gray-400 italic">Chưa có hoa hồng nào trong kỳ này.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <h2 className="text-base font-bold text-gray-900 mt-8 mb-2">Chi tiết từng giao dịch</h2>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-400 border-b border-gray-100">
              <th className="px-3 py-2 text-left font-medium">Ngày mua</th>
              <th className="px-3 py-2 text-left font-medium">Đơn</th>
              <th className="px-3 py-2 text-left font-medium">Học viên mua</th>
              <th className="px-3 py-2 text-left font-medium">Khóa học</th>
              <th className="px-3 py-2 text-left font-medium">Loại</th>
              <th className="px-3 py-2 text-right font-medium">Giá trị đơn</th>
              <th className="px-3 py-2 text-right font-medium">%</th>
              <th className="px-3 py-2 text-right font-medium">Hoa hồng</th>
              <th className="px-3 py-2 text-left font-medium">Trạng thái</th>
              <th className="px-3 py-2 text-left font-medium">Ngày chốt</th>
            </tr>
          </thead>
          <tbody>
            {data.lines.map(l => (
              <tr key={l.commissionId} className="border-b border-gray-50">
                <td className="px-3 py-1.5 text-gray-500">{fmtDate(l.orderDate)}</td>
                <td className="px-3 py-1.5 text-gray-500">{l.orderId ? `#${l.orderId}` : '—'}</td>
                <td className="px-3 py-1.5 text-gray-700">{l.buyerName}</td>
                <td className="px-3 py-1.5 text-gray-700">{l.courseName}</td>
                <td className="px-3 py-1.5 text-gray-500">{l.kind === 'DIRECT' ? 'Trực tiếp' : 'Tri ân'}</td>
                <td className="px-3 py-1.5 text-right text-gray-500">{fmt(l.listedPrice)}</td>
                <td className="px-3 py-1.5 text-right text-gray-500">{l.percentage}%</td>
                <td className="px-3 py-1.5 text-right font-semibold text-gray-800">{fmt(l.amount)}</td>
                <td className="px-3 py-1.5">
                  <span className={l.ready ? 'text-emerald-600 font-semibold' : 'text-amber-600 font-semibold'}>
                    {l.ready ? 'Đã chốt' : 'Chờ đối soát'}
                  </span>
                </td>
                <td className="px-3 py-1.5 text-gray-500">{l.availableAt ? fmtDate(l.availableAt) : '—'}</td>
              </tr>
            ))}
            {data.lines.length === 0 && (
              <tr><td colSpan={10} className="px-3 py-4 text-gray-400 italic">Không có giao dịch nào trong kỳ này.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {data.totals.cancelledCount > 0 && period === 'all' && (
        <p className="text-[11px] text-gray-400 mt-4">
          * Không tính {data.totals.cancelledCount} dòng hoa hồng đã bị thu hồi (đơn hoàn/hủy hoặc loại trừ theo quy định), tổng {fmt(data.totals.cancelledAmount)}.
        </p>
      )}
      <p className="text-[11px] text-gray-400 mt-2">
        * Xem tất cả các kỳ thì tổng hoa hồng ở đây khớp với số dư ghi nhận trong ví của thành viên.
      </p>
    </div>
  )
}
