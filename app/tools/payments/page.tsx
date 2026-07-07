'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getPendingPayments, getAllPayments, verifyPaymentAction, rejectPaymentAction, triggerAutoVerifyManual, getGmailStatus } from '@/app/actions/payment-actions'
import { ArrowLeft, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import Image from 'next/image'
import MainHeader from '@/components/layout/MainHeader'

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
    user: {
      id: number
      name: string | null
      email: string
      phone: string | null
    }
    course: {
      id: number
      id_khoa: string
      name_lop: string
      phi_coc: number
    }
  }
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentData[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'PENDING' | 'ALL'>('PENDING')
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [scanning, setScanning] = useState(false)
  const [gmailStatus, setGmailStatus] = useState<{ penalized: boolean; retryAfter?: string }>({ penalized: false })

  async function handleManualScan() {
    setScanning(true)
    try {
      const result = await triggerAutoVerifyManual() as any
      if (result.success) {
        if (result.penalized) {
          const penaltyDate = new Date(result.retryAfter).toLocaleString('vi-VN');
          alert(`⚠️ TÀI KHOẢN ĐANG BỊ GOOGLE PHẠT RATE LIMIT!\n- Thời gian phạt đến: ${penaltyDate}\n- Vui lòng KHÔNG quét tay hoặc chạy script local lúc này để tránh bị Google khóa lâu hơn!`);
        } else if (result.locked) {
          alert('🔒 Hệ thống đang có tiến trình quét Gmail chạy ngầm. Vui lòng thử lại sau 30 giây.')
        } else {
          alert(`⚡ Quét thành công!\n- Số email đã quét: ${result.processed}\n- Số giao dịch được kích hoạt tự động: ${result.matched}`)
          await loadPayments()
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

  useEffect(() => {
    loadPayments()
  }, [filter])

  async function loadPayments() {
    setLoading(true)
    const result = filter === 'PENDING' 
      ? await getPendingPayments()
      : await getAllPayments()
    
    if (result.success) {
      setPayments(result.payments as PaymentData[])
    }

    const statusRes = await getGmailStatus() as any
    if (statusRes.success) {
      setGmailStatus({
        penalized: !!statusRes.penalized,
        retryAfter: statusRes.retryAfter
      })
    }
    setLoading(false)
  }

  async function handleVerify(paymentId: number) {
    setActionLoading(paymentId)
    const enrollmentId = payments.find(p => p.id === paymentId)?.enrollment.id
    if (!enrollmentId) return

    const result = await verifyPaymentAction(enrollmentId, 'MANUAL_ADMIN', 'Admin xác nhận thủ công')
    if (result.success) {
      await loadPayments()
    }
    setActionLoading(null)
  }

  async function handleReject(paymentId: number) {
    const reason = prompt('Nhập lý do từ chối:')
    if (!reason) return

    setActionLoading(paymentId)
    const enrollmentId = payments.find(p => p.id === paymentId)?.enrollment.id
    if (!enrollmentId) return

    const result = await rejectPaymentAction(enrollmentId, reason)
    if (result.success) {
      await loadPayments()
    }
    setActionLoading(null)
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

  const stats = {
    pending: payments.filter(p => p.status === 'PENDING').length,
    verified: payments.filter(p => p.status === 'VERIFIED').length,
    rejected: payments.filter(p => p.status === 'REJECTED').length,
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <MainHeader title="THANH TOÁN" toolSlug="payments" />

      {gmailStatus.penalized && (
        <div className="bg-amber-50 border-b border-amber-200 p-3 flex items-center gap-2.5 shadow-inner">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-xs text-amber-700 font-bold leading-normal">
            ⚠️ Gmail API đang bị Google tạm khóa hạn mức đến:{' '}
            <span className="text-red-600 font-extrabold underline">{new Date(gmailStatus.retryAfter!).toLocaleString('vi-VN')}</span>.
            Hệ thống đã tự động bỏ qua toàn bộ yêu cầu quét Gmail để bảo vệ hòm thư.
          </p>
        </div>
      )}

      <div className="text-xs font-medium text-gray-500 text-center py-2 bg-gray-100">
        {payments.length} yêu cầu
      </div>

      {/* TOOLBAR STICKY */}
      <div className="sticky top-16 z-40 bg-white border-b shadow-sm">
        <div className="p-4 space-y-4">
          {/* Stats Row */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-50 rounded-lg shrink-0">
                <Clock className="w-4 h-4 text-yellow-600" />
                <span className="text-xs font-bold text-yellow-700">{stats.pending} Chờ</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-lg shrink-0">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-xs font-bold text-green-700">{stats.verified} OK</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 rounded-lg shrink-0">
                <XCircle className="w-4 h-4 text-red-600" />
                <span className="text-xs font-bold text-red-700">{stats.rejected} Từ chối</span>
              </div>
            </div>

            <button
              disabled={scanning || gmailStatus.penalized}
              onClick={handleManualScan}
              className={`flex items-center gap-1 px-3.5 py-1.5 rounded-xl text-xs font-black shadow-md transition-all uppercase tracking-wider shrink-0 ${
                gmailStatus.penalized
                  ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed shadow-none'
                  : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white'
              }`}
            >
              {scanning ? (
                <>
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin mr-1" />
                  Đang quét...
                </>
              ) : gmailStatus.penalized ? (
                <>
                  ⚠️ Đang bị khóa
                </>
              ) : (
                <>
                  ⚡ Quét Gmail
                </>
              )}
            </button>
          </div>

          {/* Filter Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('PENDING')}
              className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${
                filter === 'PENDING' 
                  ? 'bg-black text-yellow-400 shadow-lg' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              ⏳ Chờ xác nhận
            </button>
            <button
              onClick={() => setFilter('ALL')}
              className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${
                filter === 'ALL' 
                  ? 'bg-black text-yellow-400 shadow-lg' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              📋 Tất cả
            </button>
          </div>
        </div>
      </div>

      {/* CONTENT - SCROLLABLE */}
      <div className="flex-1 p-4 pb-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-3 border-purple-600 border-t-transparent"></div>
            <p className="mt-4 text-gray-500 text-sm">Đang tải...</p>
          </div>
        ) : payments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-gray-500 font-medium">Không có thanh toán nào</p>
            <p className="text-gray-400 text-sm mt-1">Danh sách trống</p>
          </div>
        ) : (
          <div className="space-y-3">
            {payments.map((payment) => {
              const StatusIcon = statusIcons[payment.status] || AlertCircle
              return (
                <div key={payment.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                  {/* Header Card */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${statusColors[payment.status]}`}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        {payment.status === 'PENDING' ? 'Chờ' :
                         payment.status === 'VERIFIED' ? 'OK' :
                         payment.status === 'REJECTED' ? 'Từ chối' : 'Hủy'}
                      </span>
                      <span className="text-xs text-gray-400 font-medium">
                        #{payment.id}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(payment.createdAt).toLocaleDateString('vi-VN')}
                    </span>
                  </div>

                  {/* Info Grid */}
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Học viên</p>
                      <p className="font-bold text-sm text-gray-900 truncate">
                        {payment.enrollment.user.name || 'N/A'}{' '}
                        <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 border border-indigo-100 px-1 py-0.5 rounded">
                          HV#{payment.enrollment.user.id}
                        </span>
                      </p>
                      <p className="text-xs text-gray-500 truncate mb-1">{payment.enrollment.user.email}</p>
                      <p className="text-[9px] text-slate-400 font-bold">
                        Đề nghị: <span className="font-black text-slate-600">{new Date(payment.createdAt).toLocaleString('vi-VN')}</span>
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Khóa học</p>
                      <p className="font-bold text-sm text-orange-600 truncate">{payment.enrollment.course.name_lop}</p>
                      <p className="text-xs text-gray-500">{payment.enrollment.course.phi_coc.toLocaleString()}đ</p>
                    </div>
                  </div>

                  {/* Payment Info */}
                  {(payment.amount > 0 || payment.bankName || payment.content) && (
                    <div className="bg-green-50 rounded-xl p-3 mb-3">
                      <p className="text-[10px] text-green-600 font-bold uppercase mb-1">Thông tin CK</p>
                      <div className="flex flex-wrap gap-2">
                        {payment.amount > 0 && (
                          <span className="text-sm font-bold text-green-700">
                            {payment.amount.toLocaleString()}đ
                          </span>
                        )}
                        {payment.bankName && (
                          <span className="text-xs text-green-600">🏦 {payment.bankName}</span>
                        )}
                        {payment.content && (
                          <span className="text-xs text-green-600">ND: {payment.content}</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Proof Image */}
                  {payment.proofImage && (
                    <div className="mb-3">
                      <p className="text-[10px] text-blue-600 font-bold uppercase mb-2">📎 Biên lai</p>
                      <div className="relative w-full h-40 border-2 border-blue-100 rounded-xl overflow-hidden">
                        <Image
                          src={payment.proofImage}
                          alt="Biên lai"
                          fill
                          className="object-cover"
                        />
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  {payment.status === 'PENDING' && (
                    <div className="flex gap-2 pt-2 border-t border-gray-100">
                      <button
                        onClick={() => handleVerify(payment.id)}
                        disabled={actionLoading === payment.id}
                        className="flex-1 py-2.5 bg-green-500 text-white rounded-xl font-bold text-sm hover:bg-green-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                      >
                        {actionLoading === payment.id ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            Xác nhận
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleReject(payment.id)}
                        disabled={actionLoading === payment.id}
                        className="flex-1 py-2.5 bg-red-50 text-red-600 rounded-xl font-bold text-sm hover:bg-red-100 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                      >
                        <XCircle className="w-4 h-4" />
                        Từ chối
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}