
'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import UploadProofModal from '@/components/payment/UploadProofModal'

interface PaymentModalProps {
    course: any
    enrollment?: {
        id?: number
        status: string
        payment?: {
            id?: number
            status: string
            proofImage?: string | null
            verifyMethod?: string | null
            verifiedAt?: string | null
            qrCodeUrl?: string | null
            transferContent?: string | null
            amount?: number | null
            bankName?: string | null
            accountNumber?: string | null
        }
    } | null
    isCourseOneActive?: boolean
    userPhone?: string | null
    userId?: number | null
    onClose: () => void
    onUploadProof?: (enrollmentId: number) => void
}

export default function PaymentModal({ course, enrollment, isCourseOneActive = false, userPhone = null, userId = null, onClose, onUploadProof }: PaymentModalProps) {
    const [showUploadModal, setShowUploadModal] = useState(false)
    const [showFullQR, setShowFullQR] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [uploaded, setUploaded] = useState(!!enrollment?.payment?.proofImage)
    
    const payment = enrollment?.payment
    const paymentStatus = payment?.status
    const isVerified = paymentStatus === 'VERIFIED'
    const isPending = paymentStatus === 'PENDING' || paymentStatus === undefined
    
    // QR từ VietQR API hoặc fallback
    const effectiveAmount = isCourseOneActive ? 0 : (payment?.amount || course.phi_coc || 0)
    
    // Format nội dung thống nhất với lib/vietqr: SDT [6_cuối] HV [userId] COC [courseCode]
    const cleanPhone = userPhone ? userPhone.replace(/\D/g, '').slice(-6) : ''
    const effectiveContent = payment?.transferContent || `SDT ${cleanPhone} HV ${userId} COC ${course.id_khoa}`.toUpperCase().slice(0, 50)
    
    // Mã BIN ngân hàng (Sacombank mặc định)
    const bankMap: Record<string, string> = { 'SACOMBANK': '970403', 'VCB': '970436', 'ACB': '970416', 'MB': '970422', 'TCB': '970407' }
    const bankId = bankMap[course.bank_stk?.toUpperCase()] || '970403'

    const qrCodeUrl = payment?.qrCodeUrl || course.link_qrcode || `https://img.vietqr.io/image/${bankId}-${course.stk}-qr_only.png?amount=${effectiveAmount}&addInfo=${encodeURIComponent(effectiveContent)}&accountName=${encodeURIComponent(course.name_stk || '')}`
    
    const handleUploadSuccess = () => {
        setUploaded(true)
        window.location.reload()
    }

    const handleUploadClick = () => {
        setShowUploadModal(true)
    }

    return (
        <>
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-2 sm:p-4 backdrop-blur-sm">
            <div className="relative w-full max-w-2xl max-h-[95vh] flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden rounded-2xl sm:rounded-3xl bg-white shadow-2xl">
                {/* Header Tím - Cố định */}
                <div className="bg-[#7c3aed] px-4 py-3 sm:px-6 sm:py-3 text-white shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0 pr-4">
                            <h2 className="text-base sm:text-lg font-bold leading-tight truncate">Kích hoạt khóa học</h2>
                            <p className="text-[10px] sm:text-xs text-purple-100 italic opacity-90 truncate">{course.name_lop}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            {enrollment?.payment && (
                                <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                                    isVerified 
                                        ? 'bg-green-500 text-white' 
                                        : 'bg-yellow-500 text-white'
                                }`}>
                                    {isVerified ? '✓ Xong' : '⏳ Chờ'}
                                </div>
                            )}
                            <button
                                onClick={onClose}
                                className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-bold transition-colors border border-white/30"
                            >
                                Để sau
                            </button>
                        </div>
                    </div>
                </div>

                {/* Nội dung có thể cuộn */}
                <div className="overflow-y-auto flex-1 custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 p-4 sm:p-6">
                        {/* Cột trái: QR Code */}
                        <div className="flex flex-col items-center justify-center text-center">
                            <div 
                                onClick={() => setShowFullQR(true)}
                                className="group relative cursor-zoom-in"
                                title="Nhấn để phóng to mã QR"
                            >
                                <div className="relative mb-2 h-40 w-40 sm:h-48 sm:w-48 overflow-hidden rounded-xl border-2 border-purple-100 p-1 shadow-inner bg-white group-hover:border-purple-300 transition-colors">
                                    <Image
                                        src={qrCodeUrl}
                                        alt="QR Code Thanh toán"
                                        fill
                                        className="object-contain"
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 flex items-center justify-center transition-all">
                                        <span className="opacity-0 group-hover:opacity-100 bg-white/90 text-[#7c3aed] text-[10px] font-bold px-2 py-1 rounded-full shadow-sm">
                                            🔍 Phóng to
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <p className="text-[9px] sm:text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                                Nhấn vào mã QR để phóng to/tải về
                            </p>
                        </div>

                        {/* Cột phải: Thông tin STK */}
                        <div className="flex flex-col justify-center space-y-2 sm:space-y-2.5">
                            <div className="rounded-xl bg-gray-50 px-3 py-1.5 border border-gray-100">
                                <p className="text-[9px] sm:text-[10px] font-semibold text-gray-400 uppercase">Tiền cọc cam kết:</p>
                                <p className="text-lg sm:text-xl font-black text-[#7c3aed]">
                                    {effectiveAmount?.toLocaleString()}đ
                                </p>
                                {isCourseOneActive && (
                                    <p className="text-[9px] font-bold text-green-600 italic">
                                        * Miễn phí (Đã có khóa 86 ngày)
                                    </p>
                                )}
                            </div>

                            <div className="space-y-1.5 sm:space-y-2 px-1">
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase leading-none mb-0.5">Ngân hàng</span>
                                        <span className="text-xs sm:text-sm font-bold text-gray-800 truncate">{payment?.bankName || course.bank_stk || 'N/A'}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase leading-none mb-0.5">Số tài khoản</span>
                                        <span className="text-xs sm:text-sm font-bold text-gray-800 select-all">{payment?.accountNumber || course.stk || 'N/A'}</span>
                                    </div>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase leading-none mb-0.5">Chủ tài khoản</span>
                                    <span className="text-xs sm:text-sm font-bold text-gray-800">{course.name_stk || 'N/A'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase leading-none shrink-0">Nội dung:</span>
                                    <span className="inline-block rounded bg-purple-50 px-2 py-0.5 text-xs sm:text-sm font-mono font-bold text-[#7c3aed] select-all border border-purple-100">
                                        {effectiveContent}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Trạng thái thanh toán */}
                    {enrollment?.payment && (
                        <div className="px-4 sm:px-6 pb-2">
                            <div className={`rounded-xl p-3 ${
                                isVerified ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'
                            }`}>
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                    <div>
                                        <p className={`text-xs sm:text-sm font-bold ${isVerified ? 'text-green-700' : 'text-yellow-700'}`}>
                                            {isVerified ? '✓ Đã xác nhận' : '⏳ Chờ xác nhận'}
                                        </p>
                                        {!isVerified && (
                                            <p className="text-[10px] sm:text-xs text-yellow-600 mt-0.5">
                                                Chuyển khoản đúng nội dung hoặc upload biên lai
                                            </p>
                                        )}
                                    </div>
                                    {!isVerified && (
                                        <button
                                            onClick={handleUploadClick}
                                            disabled={uploading}
                                            className="w-full sm:w-auto px-3 py-1.5 bg-[#7c3aed] text-white rounded-lg text-xs font-bold hover:bg-[#6d28d9] transition-colors disabled:opacity-50"
                                        >
                                            {uploading ? '...' : '📤 Upload biên lai'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Footer Tips - Đẩy lên cao hơn */}
                    <div className="bg-orange-50 px-4 py-2 sm:px-6 sm:py-2 text-center shrink-0">
                        <p className="text-[10px] sm:text-xs font-medium text-orange-700 leading-tight">
                            🚀 Hệ thống sẽ tự động kích hoạt sau 10-15 phút khi nhận được chuyển khoản đúng nội dung.
                        </p>
                    </div>
                </div>
            </div>
        </div>

        {showUploadModal && enrollment && enrollment.id && (
            <UploadProofModal
                enrollmentId={enrollment.id}
                onClose={() => setShowUploadModal(false)}
                onSuccess={handleUploadSuccess}
            />
        )}

        {/* Modal Phóng to QR */}
        {showFullQR && (
            <div 
                className="fixed inset-0 z-[200] bg-black/95 flex flex-col items-center justify-center p-4 animate-in fade-in duration-200"
                onClick={() => setShowFullQR(false)}
            >
                <div className="relative w-full max-w-sm flex flex-col items-center" onClick={e => e.stopPropagation()}>
                    <div className="relative aspect-square w-full bg-white rounded-2xl p-4 shadow-2xl">
                        <Image
                            src={qrCodeUrl}
                            alt="QR Code Large"
                            fill
                            className="object-contain p-2"
                        />
                    </div>
                    
                    <div className="mt-6 flex gap-4 w-full px-2">
                        <a 
                            href={qrCodeUrl}
                            download={`QR_Payment_${course.id_khoa}.png`}
                            className="flex-1 bg-white text-black py-3 rounded-xl font-bold text-sm text-center shadow-lg active:scale-95 transition-transform"
                        >
                            📥 Tải ảnh
                        </a>
                        <button 
                            onClick={() => setShowFullQR(false)}
                            className="flex-1 bg-white/20 text-white py-3 rounded-xl font-bold text-sm border border-white/30 backdrop-blur-md active:scale-95 transition-transform"
                        >
                            ✕ Đóng lại
                        </button>
                    </div>

                    <p className="mt-4 text-white/60 text-[10px] text-center px-4">
                        Sau khi tải ảnh, hãy mở ứng dụng Ngân hàng và quét mã QR từ thư viện ảnh của bạn.
                    </p>
                </div>
            </div>
        )}
        </>
    )
}
