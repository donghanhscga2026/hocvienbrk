'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getPendingPayments, getAllPayments, verifyPaymentAction, rejectPaymentAction, triggerAutoVerifyManual, getGmailStatus } from '@/app/actions/payment-actions'
import { ArrowLeft, Clock, CheckCircle, XCircle, AlertCircle, QrCode } from 'lucide-react'
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

export default function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentData[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'PENDING' | 'ALL'>('PENDING')
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [scanning, setScanning] = useState(false)
  const [gmailStatus, setGmailStatus] = useState<{ penalized: boolean; retryAfter?: string }>({ penalized: false })
  const [selectedQR, setSelectedQR] = useState<number | null>(null)

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

                  {/* Info: Học viên */}
                  <div className="bg-gray-50 rounded-xl p-3 text-xs space-y-1 mb-3">
                    <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-gray-200 pb-1.5 mb-1.5">
                      <span className="text-[10px] text-gray-400 font-bold uppercase">Học viên</span>
                      <span className="font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded text-[10px]">
                        #{payment.enrollment.user.id}
                      </span>
                    </div>
                    <div className="flex justify-between items-center flex-wrap gap-2 text-gray-900 font-semibold">
                      <span>{payment.enrollment.user.name || 'N/A'}</span>
                      <span className="text-[10px] text-gray-500 font-normal">
                        Đăng ký: {new Date(payment.createdAt).toLocaleString('vi-VN')}
                      </span>
                    </div>
                    <p className="text-gray-500 break-all mb-1.5">{payment.enrollment.user.email}</p>
                    
                    {payment.enrollment.user.phone && (
                      <div className="flex items-center justify-between bg-white border border-gray-150 rounded-lg p-2 mt-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-gray-500 font-bold uppercase">SĐT:</span>
                          <span className="font-bold text-gray-800 break-all select-all">{payment.enrollment.user.phone}</span>
                        </div>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(payment.enrollment.user.phone!)
                            alert('Đã copy số điện thoại học viên!')
                          }}
                          className="text-[10px] text-indigo-700 hover:text-indigo-900 font-bold bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded transition-colors shrink-0"
                        >
                          Copy
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Info: Nhân mạch */}
                  <div className="bg-purple-50/50 border border-purple-100 rounded-xl p-3 mb-3 text-xs space-y-2">
                    <div>
                      <span className="text-[9px] text-purple-600 font-bold uppercase block mb-0.5">
                        Nhân mạch chia sẻ khóa học #{payment.enrollment.course.id_khoa}
                      </span>
                      {payment.enrollment.referrer ? (
                        <p className="font-semibold text-gray-800 break-words">
                          #{payment.enrollment.referrer.id} - {payment.enrollment.referrer.name || 'N/A'}{' '}
                          {payment.enrollment.referrer.phone && (
                            <span className="text-gray-500 font-normal">(📞 {payment.enrollment.referrer.phone})</span>
                          )}
                        </p>
                      ) : (
                        <p className="text-gray-400 italic">Không có (N/A)</p>
                      )}
                    </div>
                    <div className="pt-2 border-t border-purple-100/50">
                      <span className="text-[9px] text-purple-600 font-bold uppercase block mb-0.5">
                        Nhân mạch kết nối
                      </span>
                      {payment.enrollment.user.referrer ? (
                        <p className="font-semibold text-gray-800 break-words">
                          #{payment.enrollment.user.referrer.id} - {payment.enrollment.user.referrer.name || 'N/A'}{' '}
                          {payment.enrollment.user.referrer.phone && (
                            <span className="text-gray-500 font-normal">(📞 {payment.enrollment.user.referrer.phone})</span>
                          )}
                        </p>
                      ) : (
                        <p className="text-gray-400 italic">Không có (N/A)</p>
                      )}
                    </div>
                  </div>

                  {/* Info: Khóa học */}
                  <div className="bg-orange-50/50 border border-orange-100 rounded-xl p-3 mb-3 text-xs space-y-1.5">
                    <div>
                      <span className="text-[9px] text-orange-600 font-bold uppercase block">Khóa học</span>
                      <p className="font-bold text-sm text-orange-650 break-words">{payment.enrollment.course.name_lop}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-orange-100/50">
                      <div>
                        <span className="text-[9px] text-gray-400 font-bold uppercase block">Giá cọc</span>
                        <span className="font-bold text-gray-800">{payment.enrollment.course.phi_coc.toLocaleString()}đ</span>
                      </div>
                      {payment.amount > 0 && (
                        <div>
                          <span className="text-[9px] text-gray-400 font-bold uppercase block">Nhận được</span>
                          <span className="font-black text-green-700">{payment.amount.toLocaleString()}đ</span>
                        </div>
                      )}
                    </div>

                    {/* Ngân hàng chuyển thực tế từ mail config */}
                    {(payment.bankName || payment.accountNumber) && (
                      <div className="pt-1.5 border-t border-orange-100/50 text-[11px] text-slate-600">
                        <p>
                          🏦 <span className="font-medium">{payment.bankName}</span> 
                          {payment.accountNumber && ` - STK: ${payment.accountNumber}`}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Cú pháp chuyển khoản chuẩn */}
                  {(() => {
                    const cleanPhone = payment.enrollment.user.phone ? payment.enrollment.user.phone.replace(/\D/g, '').slice(-6) : ''
                    const standardContent = `SDT ${cleanPhone} HV ${payment.enrollment.user.id} COC ${payment.enrollment.course.id_khoa}`.toUpperCase()
                    const isContentMatch = payment.content ? payment.content.trim().toUpperCase() === standardContent : false
                    
                    return (
                      <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3 mb-3 text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-[10px] text-blue-600 font-bold uppercase">Cú pháp CK chuẩn</p>
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(standardContent)
                              alert('Đã copy cú pháp chuyển khoản!')
                            }}
                            className="text-[10px] text-blue-700 hover:text-blue-900 font-bold bg-blue-100/50 px-1.5 py-0.5 rounded transition-colors"
                          >
                            Copy
                          </button>
                        </div>
                        <p className="font-mono font-bold text-gray-900 bg-white border border-blue-100 p-2 rounded break-all select-all">
                          {standardContent}
                        </p>
                        
                        {/* So sánh cú pháp thực tế */}
                        {payment.content && (
                          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] text-gray-500 font-semibold">ND thực tế:</span>
                            <span className={`font-mono font-bold px-1.5 py-0.5 rounded text-[10px] break-all ${
                              isContentMatch 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {payment.content} {isContentMatch ? '✓ Khớp' : '✗ Lệch'}
                            </span>
                          </div>
                        )}
                      </div>
                    )
                  })()}

                  {/* Nút Tạo / Xem QR Code */}
                  {payment.enrollment.course.teacherBankAccount ? (
                    <div className="mb-3">
                      <button
                        onClick={() => setSelectedQR(payment.id)}
                        className="flex items-center justify-center gap-1.5 w-full py-2.5 bg-indigo-50 border border-indigo-150 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-800 transition-colors rounded-xl text-xs font-bold"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        Tạo / Xem mã QR Chuyển Khoản
                      </button>
                    </div>
                  ) : (
                    <div className="mb-3 text-[10px] text-amber-600 font-semibold italic bg-amber-50 p-2 rounded-lg border border-amber-100">
                      ⚠️ Khóa học chưa cấu hình tài khoản nhận chuyển khoản.
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
                    <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-gray-100">
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

      {selectedQR && (() => {
        const p = payments.find(pay => pay.id === selectedQR)
        if (!p || !p.enrollment.course.teacherBankAccount) return null
        const bankAcc = p.enrollment.course.teacherBankAccount
        const bankId = resolveBankBin(bankAcc.bankName)
        const cleanPhone = p.enrollment.user.phone ? p.enrollment.user.phone.replace(/\D/g, '').slice(-6) : ''
        const standardContent = `SDT ${cleanPhone} HV ${p.enrollment.user.id} COC ${p.enrollment.course.id_khoa}`.toUpperCase()
        const effectiveAmount = p.enrollment.course.phi_coc || p.amount || 0
        const qrUrl = `https://img.vietqr.io/image/${bankId}-${bankAcc.accountNumber}-qr_only.png?amount=${effectiveAmount}&addInfo=${encodeURIComponent(standardContent)}&accountName=${encodeURIComponent(bankAcc.accountHolder)}`

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200 text-center relative mx-auto">
              <button 
                onClick={() => setSelectedQR(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 p-1.5 rounded-full transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
              
              <h3 className="text-base font-black text-gray-900 mb-1">Mã QR Chuyển Khoản</h3>
              <p className="text-xs text-gray-500 mb-4">{p.enrollment.course.name_lop}</p>
              
              <div className="relative w-60 h-60 mx-auto border-2 border-indigo-100 rounded-2xl overflow-hidden bg-gray-50 flex items-center justify-center mb-4 shadow-inner">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={qrUrl} 
                  alt="Mã QR Chuyển Khoản"
                  className="object-contain w-full h-full"
                />
              </div>
              
              <div className="bg-gray-50 rounded-2xl p-3 text-left text-xs space-y-2 border border-gray-100">
                <div>
                  <span className="text-gray-400 block text-[10px] font-bold uppercase">Ngân hàng</span>
                  <span className="font-bold text-gray-800">{bankAcc.bankName || 'N/A'}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-gray-400 block text-[10px] font-bold uppercase">Số tài khoản</span>
                    <span className="font-mono font-bold text-gray-800 break-all">{bankAcc.accountNumber}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] font-bold uppercase">Chủ tài khoản</span>
                    <span className="font-bold text-gray-800 uppercase">{bankAcc.accountHolder}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-gray-400 block text-[10px] font-bold uppercase">Số tiền</span>
                    <span className="font-bold text-red-600 text-sm">{effectiveAmount.toLocaleString()}đ</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] font-bold uppercase">Nội dung CK</span>
                    <span className="font-mono font-bold text-indigo-600 break-all">{standardContent}</span>
                  </div>
                </div>
              </div>
              
              <button
                onClick={() => setSelectedQR(null)}
                className="mt-5 w-full py-3 bg-black hover:bg-gray-800 text-yellow-400 font-bold rounded-2xl text-sm transition-colors shadow-lg"
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