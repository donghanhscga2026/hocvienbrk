'use client'

/**
 * Xuất CSV chi tiết hoa hồng của một thành viên (từ trang chi tiết CTV).
 */
import type { MemberCommissionLine } from '@/lib/affiliate/member-detail'

export default function MemberCommissionActions({
  lines,
  memberName,
  memberId,
  period
}: {
  lines: MemberCommissionLine[]
  memberName: string
  memberId: number
  period: string
}) {
  const exportCsv = () => {
    const fmtDate = (iso: string | null) =>
      iso ? new Date(iso).toLocaleDateString('vi-VN', { timeZone: 'Asia/Saigon' }) : ''
    const header = [
      'Ngày mua', 'Đơn hàng', 'Học viên mua', 'Khóa học', 'Giảng viên',
      'Loại hoa hồng', 'Giá trị đơn (đ)', 'Tỷ lệ (%)', 'Hoa hồng (đ)',
      'Trạng thái', 'Ngày chốt đối soát'
    ]
    const rows = lines.map(l => [
      fmtDate(l.orderDate),
      l.orderId ? `#${l.orderId}` : '',
      l.buyerName,
      l.courseName,
      l.teacherName,
      l.kind === 'DIRECT' ? 'Trực tiếp' : 'Tri ân',
      String(l.listedPrice),
      String(l.percentage),
      String(l.amount),
      l.ready ? 'Đã chốt' : 'Chờ đối soát',
      fmtDate(l.availableAt)
    ])
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`
    const csv = '\uFEFF' + [header, ...rows].map(r => r.map(esc).join(',')).join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `hoa-hong-${memberId}-${period}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <button
      onClick={exportCsv}
      className="px-4 py-2 text-sm font-semibold bg-gray-900 text-white rounded-xl hover:bg-gray-700 print:hidden"
      title={`Xuất chi tiết hoa hồng của ${memberName}`}
    >
      ⬇ Xuất CSV
    </button>
  )
}
