'use client'

import { useEffect, useState } from 'react'
import { getPendingPayments, getAllPayments, verifyPaymentAction, rejectPaymentAction } from '@/app/actions/payment-actions'
import Image from 'next/image'

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

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý thanh toán</h1>
          <p className="text-gray-600">Xem và xác nhận thanh toán khóa học</p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('PENDING')}
            className={`px-4 py-2 rounded-lg font-medium ${
              filter === 'PENDING' 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Chờ xác nhận
          </button>
          <button
            onClick={() => setFilter('ALL')}
            className={`px-4 py-2 rounded-lg font-medium ${
              filter === 'ALL' 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Tất cả
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải...</p>
        </div>
      ) : payments.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <p className="text-gray-500">Không có thanh toán nào</p>
        </div>
      ) : (
        <div className="space-y-4">
          {payments.map((payment) => (
            <div key={payment.id} className="bg-white border rounded-xl p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusColors[payment.status]}`}>
                      {payment.status === 'PENDING' ? '⏳ Chờ xác nhận' :
                       payment.status === 'VERIFIED' ? '✓ Đã xác nhận' :
                       payment.status === 'REJECTED' ? '✗ Từ chối' : 'Đã hủy'}
                    </span>
                    <span className="text-sm text-gray-500">
                      #{payment.id} • {new Date(payment.createdAt).toLocaleString('vi-VN')}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Học viên</p>
                      <p className="font-medium">{payment.enrollment.user.name || 'N/A'}</p>
                      <p className="text-sm text-gray-600">{payment.enrollment.user.email}</p>
                      {payment.enrollment.user.phone && (
                        <p className="text-sm text-gray-500">📱 {payment.enrollment.user.phone}</p>
                      )}
                    </div>
                    
                    <div>
                      <p className="text-xs text-gray-500">Khóa học</p>
                      <p className="font-medium">{payment.enrollment.course.name_lop}</p>
                      <p className="text-sm text-gray-500">Mã: {payment.enrollment.course.id_khoa}</p>
                      <p className="text-sm text-gray-500">Phí: {payment.enrollment.course.phi_coc.toLocaleString()}đ</p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500">Thông tin chuyển khoản</p>
                      {payment.amount > 0 && (
                        <p className="font-medium text-green-600">Số tiền: {payment.amount.toLocaleString()}đ</p>
                      )}
                      {payment.phone && <p className="text-sm">📱 {payment.phone}</p>}
                      {payment.bankName && <p className="text-sm">🏦 {payment.bankName}</p>}
                      {payment.content && <p className="text-sm text-gray-600">ND: {payment.content}</p>}
                      {payment.verifyMethod && (
                        <p className="text-xs text-gray-500 mt-1">
                          Cách xác nhận: {
                            payment.verifyMethod === 'AUTO_EMAIL' ? 'Tự động email' :
                            payment.verifyMethod === 'MANUAL_UPLOAD' ? 'Upload biên lai' :
                            'Thủ công'
                          }
                        </p>
                      )}
                    </div>
                  </div>

                  {payment.proofImage && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                      <p className="text-xs text-blue-600 font-medium mb-2">📎 Biên lai đã upload:</p>
                      <div className="relative w-48 h-36 border rounded-lg overflow-hidden">
                        <Image
                          src={payment.proofImage}
                          alt="Biên lai"
                          fill
                          className="object-cover"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {payment.status === 'PENDING' && (
                  <div className="flex flex-col gap-2 ml-4">
                    <button
                      onClick={() => handleVerify(payment.id)}
                      disabled={actionLoading === payment.id}
                      className="px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 disabled:opacity-50"
                    >
                      {actionLoading === payment.id ? '...' : '✓ Xác nhận'}
                    </button>
                    <button
                      onClick={() => handleReject(payment.id)}
                      disabled={actionLoading === payment.id}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 disabled:opacity-50"
                    >
                      {actionLoading === payment.id ? '...' : '✗ Từ chối'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
