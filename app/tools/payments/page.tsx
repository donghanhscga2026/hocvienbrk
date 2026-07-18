'use client'

import { useEffect, useState, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { getAllPayments, verifyPaymentAction, rejectPaymentAction, triggerAutoVerifyManual, getGmailStatus, revertToPendingAction, cancelEnrollmentAction, resetSystemForRebuildAction } from '@/app/actions/payment-actions'
import { Clock, CheckCircle, XCircle, AlertCircle, QrCode, RotateCcw, Ban, Square, CheckSquare, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import Image from 'next/image'
import MainHeader from '@/components/layout/MainHeader'
import { resolveBankBin } from '@/lib/bank-bin'

interface PaymentData {
  id: number
  amount: number
  status: string
  phone: string | null
  courseCode: string | null
  bankName: string | null
  accountNumber: string | null
  content: string | null
  proofImage: string | null
  verifyMethod: string | null
  verifiedAt: Date | null
  createdAt: Date
  enrollment: {
    id: number
    status: string
    referrerId: number | null
    updatedAt: Date
    referrer: {
      id: number
      name: string | null
      phone: string | null
    } | null
    user: {
      id: number
      name: string | null
      email: string
      phone: string | null
      referrerId: number | null
      referrer: {
        id: number
        name: string | null
        phone: string | null
      } | null
    }
    course: {
      id: number
      id_khoa: string
      name_lop: string
      phi_coc: number
      teacherBankAccount: {
        id: number
        accountHolder: string
        accountNumber: string
        bankName: string | null
        qrCodeUrl: string | null
      } | null
    }
  }
}

function localDatetimeToDate(val: string): Date | undefined {
  if (!val) return undefined
  const d = new Date(val)
  return isNaN(d.getTime()) ? undefined : d
}

function dateToLocalDatetime(d: Date | string | null | undefined): string {
  if (!d) return ''
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return ''
  const vnOffset = 7 * 60
  const local = new Date(dt.getTime() + vnOffset * 60 * 1000)
  return local.toISOString().slice(0, 16)
}

type FilterType = 'ALL' | 'PENDING' | 'VERIFIED' | 'REJECTED' | 'CANCELLED'
type SortField = 'createdAt' | 'updatedAt'

export default function PaymentsPage() {
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'ADMIN'

  const [allPayments, setAllPayments] = useState<PaymentData[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>('PENDING')
  const [sortBy, setSortBy] = useState<SortField>('createdAt')
  const [sortDesc, setSortDesc] = useState(true)
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [bulkLoading, setBulkLoading] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [gmailStatus, setGmailStatus] = useState<{ penalized: boolean; retryAfter?: string }>({ penalized: false })
  const [selectedQR, setSelectedQR] = useState<number | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [enrollmentDates, setEnrollmentDates] = useState<Record<number, string>>({})

  const stats = useMemo(() => ({
    total: allPayments.length,
    pending: allPayments.filter(p => p.status === 'PENDING').length,
    verified: allPayments.filter(p => p.status === 'VERIFIED').length,
    rejected: allPayments.filter(p => p.status === 'REJECTED').length,
    cancelled: allPayments.filter(p => p.status === 'CANCELLED').length,
  }), [allPayments])

  const payments = useMemo(() => {
    const filtered = filter === 'ALL'
      ? allPayments
      : allPayments.filter(p => p.status === filter)

    return [...filtered].sort((a, b) => {
      let aVal: number, bVal: number
      if (sortBy === 'updatedAt') {
        aVal = new Date(a.enrollment.updatedAt).getTime()
        bVal = new Date(b.enrollment.updatedAt).getTime()
      } else {
        aVal = new Date(a.createdAt).getTime()
        bVal = new Date(b.createdAt).getTime()
      }
      return sortDesc ? bVal - aVal : aVal - bVal
    })
  }, [allPayments, filter, sortBy, sortDesc])

  const selectedCount = selectedIds.size

  async function loadData() {
    setLoading(true)
    setSelectedIds(new Set())
    const result = await getAllPayments()
    if (result.success) {
      setAllPayments(result.payments as PaymentData[])
    }
    const statusRes = await getGmailStatus() as any
    if (statusRes.success) {
      setGmailStatus({ penalized: !!statusRes.penalized, retryAfter: statusRes.retryAfter })
    }
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  useEffect(() => {
    const initial: Record<number, string> = {}
    allPayments.forEach(p => {
      if (p.status === 'PENDING') {
        const hasMeaningfulDate = p.enrollment.updatedAt &&
          new Date(p.enrollment.updatedAt).getTime() !== new Date(p.createdAt).getTime()
        initial[p.enrollment.id] = hasMeaningfulDate ? dateToLocalDatetime(p.enrollment.updatedAt) : ''
      }
    })
    setEnrollmentDates(initial)
  }, [allPayments])

  async function handleManualScan() {
    setScanning(true)
    try {
      const result = await triggerAutoVerifyManual() as any
      if (result.success) {
        if (result.penalized) {
          const penaltyDate = new Date(result.retryAfter).toLocaleString('vi-VN')
          alert(`⚠️ TÀI KHOẢN ĐANG BỊ GOOGLE PHẠT RATE LIMIT!\n- Thời gian phạt đến: ${penaltyDate}\n- Vui lòng KHÔNG quét tay hoặc chạy script local lúc này để tránh bị Google khóa lâu hơn!`)
        } else if (result.locked) {
          alert('🔒 Hệ thống đang có tiến trình quét Gmail chạy ngầm. Vui lòng thử lại sau 30 giây.')
        } else {
          alert(`⚡ Quét thành công!\n- Số email đã quét: ${result.processed}\n- Số giao dịch được kích hoạt tự động: ${result.matched}`)
          await loadData()
        }
      } else {
        alert(`❌ Lỗi quét email: ${result.error}`)
      }
    } catch (err: any) {
      alert(`❌ Lỗi hệ thống: ${err.message}`)
    } finally {
      setScanning(false)
    }
  }

  async function handleVerify(paymentId: number) {
    setActionLoading(paymentId)
    const payment = allPayments.find(p => p.id === paymentId)
    if (!payment) { setActionLoading(null); return }
    const enrollmentId = payment.enrollment.id
    const dateStr = enrollmentDates[enrollmentId]
    const customUpdatedAt = dateStr ? localDatetimeToDate(dateStr) : undefined
    const result = await verifyPaymentAction(enrollmentId, 'MANUAL_ADMIN', 'Admin xác nhận thủ công', customUpdatedAt)
    if (result.success) {
      await loadData()
    } else {
      alert(`❌ Lỗi: ${result.error}`)
    }
    setActionLoading(null)
  }

  async function handleReject(paymentId: number) {
    const reason = prompt('Nhập lý do từ chối:')
    if (!reason) return
    setActionLoading(paymentId)
    const enrollmentId = allPayments.find(p => p.id === paymentId)?.enrollment.id
    if (!enrollmentId) return
    const result = await rejectPaymentAction(enrollmentId, reason)
    if (result.success) {
      await loadData()
    }
    setActionLoading(null)
  }

  async function handleRevertToPending(enrollmentIds: number[]) {
    if (!confirm(`Xác nhận đổi ${enrollmentIds.length} đăng ký về trạng thái CHỜ DUYỆT?`)) return
    setBulkLoading(true)
    const result = await revertToPendingAction(enrollmentIds)
    if (result.success) {
      const messages: string[] = []
      
      if (result.brkReverted && result.brkReverted.length > 0) {
        messages.push(`✅ Đã phẫu thuật revert ${result.brkReverted.length} BRK member: ${result.brkReverted.map(r => `#${r.userId}`).join(', ')}`)
      }
      if (result.errors && result.errors.length > 0) {
        messages.push(`⚠️ Lỗi (${result.errors.length}): ${result.errors.map(e => `#${e.enrollmentId}: ${e.reason}`).join('; ')}`)
      }
      if (result.count && result.count > 0) {
        messages.push(`✅ Đã đổi ${result.count} đăng ký về Chờ duyệt.`)
      }
      
      alert(messages.join('\n'))
      await loadData()
    } else {
      alert(`❌ Lỗi: ${result.error}`)
    }
    setBulkLoading(false)
  }

  async function handleCancel(enrollmentIds: number[]) {
    if (!confirm(`Xác nhận HỦY ${enrollmentIds.length} đăng ký? Thao tác này không thể hoàn tác.`)) return
    setBulkLoading(true)
    const result = await cancelEnrollmentAction(enrollmentIds)
    if (result.success) {
      alert(`✅ Đã hủy ${result.count} đăng ký.`)
      await loadData()
    } else {
      alert(`❌ Lỗi: ${result.error}`)
    }
    setBulkLoading(false)
  }

  function toggleSelect(enrollmentId: number) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(enrollmentId)) next.delete(enrollmentId)
      else next.add(enrollmentId)
      return next
    })
  }

  function selectAll() {
    setSelectedIds(new Set(payments.map(p => p.enrollment.id)))
  }

  function clearSelection() {
    setSelectedIds(new Set())
  }

  const statusColors: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    VERIFIED: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-800',
    CANCELLED: 'bg-gray-100 text-gray-800'
  }

  const statusIcons: Record<string, any> = {
    PENDING: Clock,
    VERIFIED: CheckCircle,
    REJECTED: XCircle,
    CANCELLED: AlertCircle
  }

  const statusLabels: Record<string, string> = {
    PENDING: 'Chờ',
    VERIFIED: 'Duyệt',
    REJECTED: 'Từ chối',
    CANCELLED: 'Hủy'
  }

  function getFilterButtonStyle(activeFilter: FilterType) {
    const isActive = filter === activeFilter
    if (isActive) return 'bg-gray-900 text-white shadow-md'
    if (activeFilter === 'PENDING') return 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
    if (activeFilter === 'VERIFIED') return 'bg-green-50 text-green-700 hover:bg-green-100'
    if (activeFilter === 'REJECTED') return 'bg-red-50 text-red-600 hover:bg-red-100'
    if (activeFilter === 'CANCELLED') return 'bg-gray-100 text-gray-600 hover:bg-gray-200'
    return 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <MainHeader title="THANH TOÁN" toolSlug="payments" />

      {gmailStatus.penalized && (
        <div className="bg-amber-50 border-b border-amber-200 p-2.5 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-[11px] text-amber-700 font-bold leading-tight">
            ⚠️ Gmail API bị khóa đến{' '}
            <span className="text-red-600 underline">{new Date(gmailStatus.retryAfter!).toLocaleString('vi-VN')}</span>
          </p>
        </div>
      )}

      {/* TOOLBAR STICKY */}
      <div className="sticky top-16 z-40 bg-white border-b shadow-sm">
        <div className="px-3 py-2.5 space-y-2">
          {/* ROW 1: Clickable stat badges */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            {(['ALL', 'PENDING', 'VERIFIED', 'REJECTED', 'CANCELLED'] as FilterType[]).map(f => {
              const count = f === 'ALL' ? stats.total
                : f === 'PENDING' ? stats.pending
                : f === 'VERIFIED' ? stats.verified
                : f === 'REJECTED' ? stats.rejected
                : stats.cancelled
              const label = f === 'ALL' ? 'Tổng' : statusLabels[f]
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all ${getFilterButtonStyle(f)}`}
                >
                  <span>{label}</span>
                  <span>{count}</span>
                </button>
              )
            })}
            {selectedCount > 0 && (
              <span className="flex items-center text-[10px] text-indigo-600 font-bold shrink-0 ml-auto">
                Đã chọn {selectedCount}
              </span>
            )}
          </div>

          {/* ROW 2: Quét Gmail + Sort controls */}
          <div className="flex items-center gap-1.5">
            <button
              disabled={scanning || gmailStatus.penalized}
              onClick={handleManualScan}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all shrink-0 ${
                gmailStatus.penalized
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-sm'
              }`}
            >
              {scanning ? (
                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <span>⚡</span>
              )}
              <span>{scanning ? 'Đang quét...' : gmailStatus.penalized ? 'Bị khóa' : 'Quét Gmail'}</span>
            </button>

            <div className="flex items-center gap-1 ml-auto bg-gray-50 rounded-lg px-1.5 py-1">
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as SortField)}
                className="text-[11px] font-semibold text-gray-700 bg-transparent border-none outline-none cursor-pointer pr-1 appearance-none"
              >
                <option value="createdAt">📅 Đăng ký</option>
                <option value="updatedAt">📅 updatedAt</option>
              </select>
              <button
                onClick={() => setSortDesc(!sortDesc)}
                className="p-1 rounded hover:bg-gray-200 transition-colors text-gray-600"
                title={sortDesc ? 'Giảm dần (mới nhất)' : 'Tăng dần (cũ nhất)'}
              >
                {sortDesc ? <ArrowDown className="w-3.5 h-3.5" /> : <ArrowUp className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* ROW 3: Admin — Select all + Bulk actions (only when items selected) */}
          {isAdmin && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {payments.length > 0 && (
                <button
                  onClick={selectedCount === payments.length ? clearSelection : selectAll}
                  className="flex items-center gap-1 text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-md transition-colors shrink-0"
                >
                  {selectedCount === payments.length ? (
                    <CheckSquare className="w-3 h-3" />
                  ) : (
                    <Square className="w-3 h-3" />
                  )}
                  {selectedCount === payments.length ? 'Bỏ chọn' : 'Chọn tất cả'}
                </button>
              )}

              {selectedCount > 0 && (
                <>
                  <div className="w-px h-4 bg-gray-200 shrink-0" />
                  <button
                    onClick={() => handleRevertToPending(Array.from(selectedIds))}
                    disabled={bulkLoading}
                    className="flex items-center gap-1 px-2.5 py-1 bg-yellow-50 border border-yellow-200 text-yellow-700 hover:bg-yellow-100 rounded-lg font-bold text-[10px] transition-colors disabled:opacity-50 shrink-0"
                  >
                    {bulkLoading ? (
                      <div className="w-3 h-3 border-2 border-yellow-400/30 border-t-yellow-600 rounded-full animate-spin" />
                    ) : (
                      <RotateCcw className="w-3 h-3" />
                    )}
                    Về Pending
                  </button>
                  <button
                    onClick={() => handleCancel(Array.from(selectedIds))}
                    disabled={bulkLoading}
                    className="flex items-center gap-1 px-2.5 py-1 bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 rounded-lg font-bold text-[10px] transition-colors disabled:opacity-50 shrink-0"
                  >
                    {bulkLoading ? (
                      <div className="w-3 h-3 border-2 border-red-400/30 border-t-red-600 rounded-full animate-spin" />
                    ) : (
                      <Ban className="w-3 h-3" />
                    )}
                    Hủy kích hoạt
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* CONTENT */}
      <div className="flex-1 p-3 pb-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-3 border-purple-600 border-t-transparent" />
            <p className="mt-4 text-gray-500 text-sm">Đang tải...</p>
          </div>
        ) : payments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mb-3">
              <AlertCircle className="w-7 h-7 text-gray-300" />
            </div>
            <p className="text-gray-500 font-medium text-sm">Không có yêu cầu nào</p>
            <p className="text-gray-400 text-xs mt-1">Danh sách trống</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {payments.map((payment) => {
              const StatusIcon = statusIcons[payment.status] || AlertCircle
              const isSelected = selectedIds.has(payment.enrollment.id)
              const enrollmentId = payment.enrollment.id

              return (
                <div
                  key={payment.id}
                  className={`bg-white border rounded-xl p-3 shadow-sm transition-all ${
                    isSelected ? 'border-indigo-400 ring-1.5 ring-indigo-200 shadow-indigo-50' : 'border-gray-100'
                  }`}
                >
                  {/* Header Card */}
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {isAdmin && (
                        <button
                          onClick={() => toggleSelect(enrollmentId)}
                          className={`w-4.5 h-4.5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-indigo-600 border-indigo-600'
                              : 'border-gray-300 hover:border-indigo-400'
                          }`}
                          style={{ width: 18, height: 18 }}
                          title={isSelected ? 'Bỏ chọn' : 'Chọn'}
                        >
                          {isSelected && (
                            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      )}
                      <span className={`flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${statusColors[payment.status]}`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusLabels[payment.status]}
                      </span>
                      <span className="text-[10px] text-gray-400 font-medium">#{payment.id}</span>
                      <span className="text-[10px] text-gray-300 truncate">
                        {payment.enrollment.course.id_khoa}
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-400 shrink-0 ml-1">
                      {new Date(payment.createdAt).toLocaleDateString('vi-VN')}
                    </span>
                  </div>

                  {/* Info: Học viên */}
                  <div className="bg-gray-50 rounded-lg p-2.5 text-xs space-y-1 mb-2.5">
                    <div className="flex items-center justify-between gap-1.5 border-b border-gray-200 pb-1 mb-1">
                      <span className="text-[9px] text-gray-400 font-bold uppercase">Học viên</span>
                      <span className="font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded text-[9px]">
                        #{payment.enrollment.user.id}
                      </span>
                    </div>
                    <div className="flex justify-between items-center gap-2 text-gray-900 font-semibold">
                      <span className="truncate">{payment.enrollment.user.name || 'N/A'}</span>
                      <span className="text-[9px] text-gray-500 font-normal shrink-0">
                        Đăng ký: {new Date(payment.createdAt).toLocaleString('vi-VN')}
                      </span>
                    </div>
                    <p className="text-gray-500 break-all text-[11px]">{payment.enrollment.user.email}</p>

                    {payment.enrollment.user.phone && (
                      <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-1.5 mt-1">
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] text-gray-500 font-bold uppercase">SĐT:</span>
                          <span className="font-bold text-gray-800 text-[11px] break-all select-all">{payment.enrollment.user.phone}</span>
                        </div>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(payment.enrollment.user.phone!)
                            alert('Đã copy!')
                          }}
                          className="text-[9px] text-indigo-700 hover:text-indigo-900 font-bold bg-indigo-50 hover:bg-indigo-100 px-1.5 py-0.5 rounded transition-colors shrink-0"
                        >
                          Copy
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Info: Nhân mạch */}
                  <div className="bg-purple-50/50 border border-purple-100 rounded-lg p-2.5 mb-2.5 text-xs space-y-1.5">
                    <div>
                      <span className="text-[8px] text-purple-600 font-bold uppercase block mb-0.5">
                        Nhân mạch chia sẻ khóa #{payment.enrollment.course.id_khoa}
                      </span>
                      {payment.enrollment.referrer ? (
                        <div className="flex items-center justify-between gap-1">
                          <p className="font-semibold text-gray-800 break-words text-[11px]">
                            #{payment.enrollment.referrer.id} - {payment.enrollment.referrer.name || 'N/A'}
                            {payment.enrollment.referrer.phone && (
                              <span className="text-gray-500 font-normal"> (📞 {payment.enrollment.referrer.phone})</span>
                            )}
                          </p>
                          <button
                            onClick={() => {
                              const phone = payment.enrollment.referrer?.phone || ''
                              const name = payment.enrollment.referrer?.name || 'N/A'
                              const id = payment.enrollment.referrer?.id
                              navigator.clipboard.writeText(`#${id} ${name}${phone ? ' - ' + phone : ''}`)
                              alert('Đã copy!')
                            }}
                            className="text-[9px] text-purple-600 hover:text-purple-800 font-bold bg-purple-100 hover:bg-purple-200 px-1.5 py-0.5 rounded transition-colors shrink-0"
                          >
                            Copy
                          </button>
                        </div>
                      ) : (
                        <p className="text-gray-400 italic text-[11px]">Không có</p>
                      )}
                    </div>
                    <div className="pt-1.5 border-t border-purple-100/50">
                      <span className="text-[8px] text-purple-600 font-bold uppercase block mb-0.5">
                        Nhân mạch kết nối
                      </span>
                      {payment.enrollment.user.referrer ? (
                        <div className="flex items-center justify-between gap-1">
                          <p className="font-semibold text-gray-800 break-words text-[11px]">
                            #{payment.enrollment.user.referrer.id} - {payment.enrollment.user.referrer.name || 'N/A'}
                            {payment.enrollment.user.referrer.phone && (
                              <span className="text-gray-500 font-normal"> (📞 {payment.enrollment.user.referrer.phone})</span>
                            )}
                          </p>
                          <button
                            onClick={() => {
                              const phone = payment.enrollment.user.referrer?.phone || ''
                              const name = payment.enrollment.user.referrer?.name || 'N/A'
                              const id = payment.enrollment.user.referrer?.id
                              navigator.clipboard.writeText(`#${id} ${name}${phone ? ' - ' + phone : ''}`)
                              alert('Đã copy!')
                            }}
                            className="text-[9px] text-purple-600 hover:text-purple-800 font-bold bg-purple-100 hover:bg-purple-200 px-1.5 py-0.5 rounded transition-colors shrink-0"
                          >
                            Copy
                          </button>
                        </div>
                      ) : (
                        <p className="text-gray-400 italic text-[11px]">Không có</p>
                      )}
                    </div>
                  </div>

                  {/* Info: Khóa học */}
                  <div className="bg-orange-50/50 border border-orange-100 rounded-lg p-2.5 mb-2.5 text-xs space-y-1.5">
                    <div>
                      <span className="text-[8px] text-orange-600 font-bold uppercase block">Khóa học</span>
                      <p className="font-bold text-[13px] text-orange-700 break-words">{payment.enrollment.course.name_lop}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-orange-100/50">
                      <div>
                        <span className="text-[8px] text-gray-400 font-bold uppercase block">Giá cọc</span>
                        <span className="font-bold text-gray-800 text-[11px]">{payment.enrollment.course.phi_coc.toLocaleString()}đ</span>
                      </div>
                      {payment.amount > 0 && (
                        <div>
                          <span className="text-[8px] text-gray-400 font-bold uppercase block">Nhận được</span>
                          <span className="font-black text-green-700 text-[11px]">{payment.amount.toLocaleString()}đ</span>
                        </div>
                      )}
                    </div>
                    {(payment.bankName || payment.accountNumber) && (
                      <div className="pt-1.5 border-t border-orange-100/50 text-[10px] text-slate-600">
                        🏦 <span className="font-medium">{payment.bankName}</span>
                        {payment.accountNumber && ` - STK: ${payment.accountNumber}`}
                      </div>
                    )}
                  </div>

                  {/* Ô thời gian updatedAt — chỉ cho PENDING */}
                  {payment.status === 'PENDING' && (
                    <div className="bg-blue-50/60 border border-blue-200 rounded-lg p-2.5 mb-2.5">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[9px] text-blue-700 font-bold uppercase">
                          📅 Thời gian CK (dùng khi Duyệt)
                        </span>
                        {enrollmentDates[enrollmentId] && (
                          <button
                            onClick={() => setEnrollmentDates(prev => ({ ...prev, [enrollmentId]: '' }))}
                            className="text-[9px] text-gray-400 hover:text-red-500 font-semibold transition-colors"
                          >
                            Xóa
                          </button>
                        )}
                      </div>
                      <input
                        type="datetime-local"
                        value={enrollmentDates[enrollmentId] ?? ''}
                        onChange={e => setEnrollmentDates(prev => ({ ...prev, [enrollmentId]: e.target.value }))}
                        className="w-full text-[11px] border border-blue-200 bg-white rounded-lg px-2 py-1.5 text-gray-800 font-medium focus:outline-none focus:ring-1.5 focus:ring-blue-400 focus:border-blue-400"
                        placeholder="Để trống = dùng thời điểm bấm Duyệt"
                      />
                      <p className="text-[8px] text-blue-500 mt-0.5 leading-tight">
                        {enrollmentDates[enrollmentId]
                          ? '✅ Khi Duyệt sẽ dùng thời gian trên'
                          : '⬜ Trống → Khi Duyệt sẽ dùng thời điểm hiện tại'}
                      </p>
                    </div>
                  )}

                  {/* Cú pháp chuyển khoản chuẩn */}
                  {(() => {
                    const cleanPhone = payment.enrollment.user.phone ? payment.enrollment.user.phone.replace(/\D/g, '').slice(-6) : ''
                    const standardContent = `SDT ${cleanPhone} HV ${payment.enrollment.user.id} COC ${payment.enrollment.course.id_khoa}`.toUpperCase()
                    const isContentMatch = payment.content ? payment.content.trim().toUpperCase() === standardContent : false

                    return (
                      <div className="bg-blue-50/70 border border-blue-100 rounded-lg p-2.5 mb-2.5 text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-[9px] text-blue-600 font-bold uppercase">Cú pháp CK chuẩn</p>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(standardContent)
                              alert('Đã copy!')
                            }}
                            className="text-[9px] text-blue-700 hover:text-blue-900 font-bold bg-blue-100/50 px-1.5 py-0.5 rounded transition-colors"
                          >
                            Copy
                          </button>
                        </div>
                        <p className="font-mono font-bold text-gray-900 bg-white border border-blue-100 p-1.5 rounded break-all select-all text-[11px]">
                          {standardContent}
                        </p>
                        {payment.content && (
                          <div className="mt-1.5 flex items-center gap-1 flex-wrap">
                            <span className="text-[9px] text-gray-500 font-semibold">ND thực tế:</span>
                            <span className={`font-mono font-bold px-1 py-0.5 rounded text-[9px] break-all ${
                              isContentMatch ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {payment.content} {isContentMatch ? '✓' : '✗'}
                            </span>
                          </div>
                        )}
                      </div>
                    )
                  })()}

                  {/* QR Code */}
                  {payment.enrollment.course.teacherBankAccount ? (
                    <div className="mb-2.5">
                      <button
                        onClick={() => setSelectedQR(payment.id)}
                        className="flex items-center justify-center gap-1.5 w-full py-2 bg-indigo-50 border border-indigo-150 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-800 transition-colors rounded-lg text-[11px] font-bold"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        QR Chuyển Khoản
                      </button>
                    </div>
                  ) : (
                    <div className="mb-2.5 text-[9px] text-amber-600 font-semibold italic bg-amber-50 p-1.5 rounded-lg border border-amber-100">
                      ⚠️ Chưa cấu hình tài khoản nhận CK.
                    </div>
                  )}

                  {/* Proof Image */}
                  {payment.proofImage && (
                    <div className="mb-2.5">
                      <p className="text-[9px] text-blue-600 font-bold uppercase mb-1.5">📎 Biên lai</p>
                      <div className="relative w-full h-36 border-2 border-blue-100 rounded-lg overflow-hidden">
                        <Image src={payment.proofImage} alt="Biên lai" fill className="object-cover" />
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="pt-2 border-t border-gray-100 space-y-1.5">
                    {payment.status === 'PENDING' && (
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleVerify(payment.id)}
                          disabled={actionLoading === payment.id}
                          className="flex-1 py-2 bg-green-500 text-white rounded-lg font-bold text-xs hover:bg-green-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
                        >
                          {actionLoading === payment.id ? (
                            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            <>
                              <CheckCircle className="w-3.5 h-3.5" />
                              Duyệt
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleReject(payment.id)}
                          disabled={actionLoading === payment.id}
                          className="flex-1 py-2 bg-red-50 text-red-600 rounded-lg font-bold text-xs hover:bg-red-100 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Từ chối
                        </button>
                      </div>
                    )}

                    {isAdmin && (
                      <div className="flex gap-1.5 flex-wrap">
                        {payment.enrollment.status === 'ACTIVE' && (
                          <button
                            onClick={() => handleRevertToPending([payment.enrollment.id])}
                            disabled={bulkLoading}
                            className="flex items-center gap-1 px-2 py-1.5 bg-yellow-50 border border-yellow-200 text-yellow-700 hover:bg-yellow-100 rounded-lg font-bold text-[10px] transition-colors disabled:opacity-50"
                          >
                            <RotateCcw className="w-3 h-3" />
                            Active → Pending
                          </button>
                        )}
                        {payment.enrollment.status !== 'CANCELLED' && (
                          <button
                            onClick={() => handleCancel([payment.enrollment.id])}
                            disabled={bulkLoading}
                            className="flex items-center gap-1 px-2 py-1.5 bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 rounded-lg font-bold text-[10px] transition-colors disabled:opacity-50"
                          >
                            <Ban className="w-3 h-3" />
                            Hủy
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* QR Modal */}
      {selectedQR && (() => {
        const p = allPayments.find(pay => pay.id === selectedQR)
        if (!p || !p.enrollment.course.teacherBankAccount) return null
        const bankAcc = p.enrollment.course.teacherBankAccount
        const bankId = resolveBankBin(bankAcc.bankName)
        const cleanPhone = p.enrollment.user.phone ? p.enrollment.user.phone.replace(/\D/g, '').slice(-6) : ''
        const standardContent = `SDT ${cleanPhone} HV ${p.enrollment.user.id} COC ${p.enrollment.course.id_khoa}`.toUpperCase()
        const effectiveAmount = p.enrollment.course.phi_coc || p.amount || 0
        const qrUrl = `https://img.vietqr.io/image/${bankId}-${bankAcc.accountNumber}-qr_only.png?amount=${effectiveAmount}&addInfo=${encodeURIComponent(standardContent)}&accountName=${encodeURIComponent(bankAcc.accountHolder)}`

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl text-center relative mx-auto">
              <button
                onClick={() => setSelectedQR(null)}
                className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 p-1 rounded-full transition-colors"
              >
                <XCircle className="w-4 h-4" />
              </button>
              <h3 className="text-sm font-black text-gray-900 mb-0.5">Mã QR Chuyển Khoản</h3>
              <p className="text-[11px] text-gray-500 mb-3">{p.enrollment.course.name_lop}</p>
              <div className="relative w-52 h-52 mx-auto border-2 border-indigo-100 rounded-xl overflow-hidden bg-gray-50 flex items-center justify-center mb-3 shadow-inner">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrUrl} alt="Mã QR" className="object-contain w-full h-full" />
              </div>
              <div className="bg-gray-50 rounded-xl p-2.5 text-left text-xs space-y-1.5 border border-gray-100">
                <div>
                  <span className="text-gray-400 block text-[9px] font-bold uppercase">Ngân hàng</span>
                  <span className="font-bold text-gray-800">{bankAcc.bankName || 'N/A'}</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <span className="text-gray-400 block text-[9px] font-bold uppercase">Số TK</span>
                    <span className="font-mono font-bold text-gray-800 break-all text-[11px]">{bankAcc.accountNumber}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[9px] font-bold uppercase">Chủ TK</span>
                    <span className="font-bold text-gray-800 uppercase text-[11px]">{bankAcc.accountHolder}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <span className="text-gray-400 block text-[9px] font-bold uppercase">Số tiền</span>
                    <span className="font-bold text-red-600">{effectiveAmount.toLocaleString()}đ</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[9px] font-bold uppercase">Nội dung CK</span>
                    <span className="font-mono font-bold text-indigo-600 break-all text-[10px]">{standardContent}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedQR(null)}
                className="mt-3 w-full py-2.5 bg-black hover:bg-gray-800 text-yellow-400 font-bold rounded-xl text-xs transition-colors shadow-lg"
              >
                Đóng
              </button>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
