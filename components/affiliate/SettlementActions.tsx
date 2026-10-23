'use client'

/**
 * Nút thao tác cho Báo cáo quyết toán hoa hồng theo giảng viên:
 * xuất CSV (gửi cho giảng viên đối chiếu) + in báo cáo.
 */
import type { SettlementLine } from '@/lib/affiliate/settlement'

function fmtDateVN(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('vi-VN', { timeZone: 'Asia/Saigon' })
}

export default function SettlementActions({ lines, period }: { lines: SettlementLine[]; period: string }) {
  const exportCsv = () => {
    const header = [
      'Giảng viên', 'Khóa học', 'Người giới thiệu', 'Email người giới thiệu',
      'Loại hoa hồng', 'Đơn hàng', 'Học viên mua', 'Giá niêm yết (đ)',
      'Tỷ lệ (%)', 'Số tiền phải trả (đ)', 'Trạng thái', 'Ngày mua', 'Ngày chốt đối soát'
    ]
    const rows = lines.map(l => [
      l.teacherName,
      l.courseName,
      l.affiliateName,
      l.affiliateEmail,
      l.kind === 'DIRECT' ? 'Trực tiếp' : 'Tri ân',
      l.orderId ? `#${l.orderId}` : '',
      l.buyerName,
      String(l.listedPrice),
      String(l.percentage),
      String(l.amount),
      l.ready ? 'Đã chốt' : 'Chờ đối soát',
      fmtDateVN(l.orderDate),
      fmtDateVN(l.availableAt)
    ])
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`
    const csv = '\uFEFF' + [header, ...rows].map(r => r.map(esc).join(',')).join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `quyet-toan-hoa-hong-${period}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex gap-2 print:hidden">
      <button
        onClick={exportCsv}
        className="px-4 py-2 text-sm font-semibold bg-gray-900 text-white rounded-xl hover:bg-gray-700"
      >
        ⬇ Xuất CSV
      </button>
      <button
        onClick={() => window.print()}
        className="px-4 py-2 text-sm font-semibold bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50"
      >
        🖨 In báo cáo
      </button>
    </div>
  )
}
