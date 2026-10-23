import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { AdminSubNav } from "@/components/admin/AdminSubNav"
import { affiliateSubNav } from "../affiliate-nav"
import { getSettlementData, currentPeriodSaigon, type SettlementLine } from "@/lib/affiliate/settlement"
import SettlementActions from "@/components/affiliate/SettlementActions"
import Link from "next/link"

/**
 * Báo cáo QUYẾT TOÁN hoa hồng theo giảng viên.
 * - ADMIN: xem tất cả giảng viên. - TEACHER: chỉ xem phần của mình.
 * - Kỳ theo tháng ĐƠN ĐƯỢC THANH TOÁN; lọc qua ?period=YYYY-MM hoặc ?period=all.
 * Giảng viên dùng báo cáo này đối chiếu khoản thu và tự thanh toán
 * cho người giới thiệu (nền tảng không giữ tiền).
 */
export default async function AffiliateSettlementPage({
  searchParams
}: {
  searchParams: Promise<{ period?: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/')
  const userId = Number(session.user.id)
  const role = session.user.role
  if (role !== 'ADMIN' && role !== 'TEACHER') {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <p className="text-gray-500">Bạn không có quyền xem trang này.</p>
      </div>
    )
  }

  const params = await searchParams
  const period = params.period && (params.period === 'all' || /^\d{4}-\d{2}$/.test(params.period))
    ? params.period
    : currentPeriodSaigon()

  const data = await getSettlementData({ period, viewerId: userId, viewerRole: role })
  const fmt = (n: number) => n.toLocaleString('vi-VN') + 'đ'
  const navItems = role === 'ADMIN'
    ? affiliateSubNav
    : affiliateSubNav.filter(i => ['/tools/affiliate', '/tools/affiliate/config', '/tools/affiliate/settlement'].includes(i.href))

  const linesByTeacher = new Map<string, SettlementLine[]>()
  for (const l of data.lines) {
    const k = String(l.teacherId ?? 'null')
    if (!linesByTeacher.has(k)) linesByTeacher.set(k, [])
    linesByTeacher.get(k)!.push(l)
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <AdminSubNav title="Affiliate" items={navItems} />

      <div className="flex flex-wrap items-end justify-between gap-3 mt-4 mb-1">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Quyết toán hoa hồng theo giảng viên</h1>
          <p className="text-sm text-gray-500 mt-1">
            Số liệu hoa hồng đã ghi nhận theo từng giảng viên để giảng viên đối chiếu khoản thu
            và thanh toán cho người giới thiệu. Nền tảng không giữ tiền.
          </p>
        </div>
        <SettlementActions lines={data.lines} period={period} />
      </div>

      <form method="GET" className="flex flex-wrap items-center gap-2 mt-4 print:hidden">
        <label className="text-sm text-gray-600">Kỳ quyết toán:</label>
        <input
          type="month"
          name="period"
          defaultValue={period === 'all' ? '' : period}
          className="px-3 py-2 border border-gray-300 rounded-xl text-sm"
        />
        <button type="submit" className="px-4 py-2 text-sm font-semibold bg-gray-900 text-white rounded-xl">Xem</button>
        <Link
          href="/tools/affiliate/settlement?period=all"
          className={`px-4 py-2 text-sm font-semibold rounded-xl border ${period === 'all' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-300'}`}
        >
          Tất cả các kỳ
        </Link>
        <span className="text-xs text-gray-400">Đang xem: {period === 'all' ? 'toàn bộ' : `tháng ${period.slice(5)}/${period.slice(0, 4)}`}</span>
      </form>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="text-[11px] font-semibold text-gray-400 uppercase">Tổng phải trả</div>
          <div className="text-xl font-bold text-gray-900 mt-1">{fmt(data.totals.amount)}</div>
          <div className="text-[11px] text-gray-400">{data.totals.lineCount} dòng hoa hồng · {data.totals.orderCount} đơn</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="text-[11px] font-semibold text-gray-400 uppercase">Đã chốt đối soát</div>
          <div className="text-xl font-bold text-emerald-600 mt-1">{fmt(data.totals.readyAmount)}</div>
          <div className="text-[11px] text-gray-400">Đủ điều kiện thanh toán</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="text-[11px] font-semibold text-gray-400 uppercase">Chờ đối soát (30 ngày)</div>
          <div className="text-xl font-bold text-amber-600 mt-1">{fmt(data.totals.waitingAmount)}</div>
          <div className="text-[11px] text-gray-400">Chưa tới hạn chốt</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="text-[11px] font-semibold text-gray-400 uppercase">Giảng viên / Người giới thiệu</div>
          <div className="text-xl font-bold text-gray-900 mt-1">{data.totals.teacherCount} / {data.totals.affiliateCount}</div>
          <div className="text-[11px] text-gray-400">Trong kỳ đang xem</div>
        </div>
      </div>

      {data.teachers.length === 0 && (
        <p className="text-gray-400 italic mt-8">Chưa có hoa hồng nào phát sinh trong kỳ này.</p>
      )}

      {data.teachers.map(t => (
        <div key={String(t.teacherId)} className="bg-white rounded-2xl border border-gray-100 shadow-sm mt-6 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50/75 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
            <div className="font-bold text-gray-900">
              Giảng viên: {t.teacherName}
              <span className="ml-2 text-xs font-normal text-gray-400">phải trả</span>
            </div>
            <div className="text-sm">
              <span className="font-bold text-gray-900">{fmt(t.totalAmount)}</span>
              <span className="text-gray-400"> · </span>
              <span className="text-emerald-600 font-semibold">Đã chốt {fmt(t.readyAmount)}</span>
              <span className="text-gray-400"> · </span>
              <span className="text-amber-600 font-semibold">Chờ {fmt(t.waitingAmount)}</span>
            </div>
          </div>

          {t.courses.map(cs => (
            <div key={String(cs.courseId)} className="px-4 py-3 border-b border-gray-50 last:border-0">
              <div className="text-sm font-semibold text-gray-800 mb-2">
                {cs.courseName} <span className="text-gray-400 font-normal">— tổng {fmt(cs.totalAmount)}</span>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-400">
                    <th className="py-1 text-left font-medium">Người giới thiệu</th>
                    <th className="py-1 text-right font-medium">Số dòng</th>
                    <th className="py-1 text-right font-medium">Đã chốt</th>
                    <th className="py-1 text-right font-medium">Chờ đối soát</th>
                    <th className="py-1 text-right font-medium">Tổng phải trả</th>
                  </tr>
                </thead>
                <tbody>
                  {cs.affiliates.map(a => (
                    <tr key={a.affiliateId} className="border-t border-gray-50">
                      <td className="py-1.5">
                        <span className="font-medium text-gray-700">{a.affiliateName}</span>
                        {a.affiliateEmail && <span className="text-gray-400"> · {a.affiliateEmail}</span>}
                      </td>
                      <td className="py-1.5 text-right text-gray-500">{a.count}</td>
                      <td className="py-1.5 text-right text-emerald-600">{fmt(a.readyAmount)}</td>
                      <td className="py-1.5 text-right text-amber-600">{fmt(a.waitingAmount)}</td>
                      <td className="py-1.5 text-right font-bold text-gray-800">{fmt(a.totalAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

          <details className="px-4 py-3 print:hidden">
            <summary className="text-xs font-semibold text-gray-500 cursor-pointer">Chi tiết từng dòng hoa hồng (để đối chiếu)</summary>
            <table className="w-full text-xs mt-2">
              <thead>
                <tr className="text-gray-400 border-b border-gray-100">
                  <th className="py-1 text-left font-medium">Đơn</th>
                  <th className="py-1 text-left font-medium">Học viên mua</th>
                  <th className="py-1 text-left font-medium">Khóa học</th>
                  <th className="py-1 text-left font-medium">Người giới thiệu</th>
                  <th className="py-1 text-left font-medium">Loại</th>
                  <th className="py-1 text-right font-medium">%</th>
                  <th className="py-1 text-right font-medium">Số tiền</th>
                  <th className="py-1 text-left font-medium">Ngày mua</th>
                  <th className="py-1 text-left font-medium">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {(linesByTeacher.get(String(t.teacherId ?? 'null')) || []).map(l => (
                  <tr key={l.commissionId} className="border-b border-gray-50">
                    <td className="py-1.5 text-gray-500">{l.orderId ? `#${l.orderId}` : '—'}</td>
                    <td className="py-1.5 text-gray-700">{l.buyerName}</td>
                    <td className="py-1.5 text-gray-700">{l.courseName}</td>
                    <td className="py-1.5 text-gray-700">{l.affiliateName}</td>
                    <td className="py-1.5 text-gray-500">{l.kind === 'DIRECT' ? 'Trực tiếp' : 'Tri ân'}</td>
                    <td className="py-1.5 text-right text-gray-500">{l.percentage}%</td>
                    <td className="py-1.5 text-right font-semibold text-gray-800">{fmt(l.amount)}</td>
                    <td className="py-1.5 text-gray-500">{new Date(l.orderDate).toLocaleDateString('vi-VN', { timeZone: 'Asia/Saigon' })}</td>
                    <td className="py-1.5">
                      <span className={l.ready ? 'text-emerald-600 font-semibold' : 'text-amber-600 font-semibold'}>
                        {l.ready ? 'Đã chốt' : 'Chờ đối soát'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </div>
      ))}

      <p className="text-[11px] text-gray-400 mt-6">
        * "Đã chốt" = hoa hồng đã qua hạn đối soát 30 ngày kể từ ngày phát sinh, đủ điều kiện để giảng viên thanh toán.
        "Chờ đối soát" = còn trong 30 ngày, có thể bị thu hồi nếu đơn bị hoàn/hủy.
        File CSV xuất ra chứa đầy đủ từng dòng để gửi cho giảng viên đối chiếu với khoản thu thực tế.
      </p>
    </div>
  )
}
