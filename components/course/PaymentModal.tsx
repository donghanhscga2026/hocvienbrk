
'use client'

import React from 'react'
import Image from 'next/image'

interface PaymentModalProps {
    course: any
    onClose: () => void
}

export default function PaymentModal({ course, onClose }: PaymentModalProps) {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="relative w-full max-w-2xl animate-in zoom-in-95 duration-200 overflow-hidden rounded-3xl bg-white shadow-2xl">
                {/* Header Tím */}
                <div className="bg-[#7c3aed] px-8 py-6 text-white">
                    <h2 className="text-2xl font-bold">Kích hoạt khóa học</h2>
                    <p className="text-purple-100 italic opacity-90">{course.name_lop}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8">
                    {/* Cột trái: QR Code */}
                    <div className="flex flex-col items-center justify-center text-center">
                        <div className="relative mb-4 h-56 w-56 overflow-hidden rounded-xl border-4 border-purple-100 p-2 shadow-inner">
                            <Image
                                src={course.link_qrcode || `https://img.vietqr.io/image/${course.bank_stk}-${course.stk}-compact.png?amount=${course.phi_coc}&addInfo=${course.noidung_stk}`}
                                alt="QR Code Thanh toán"
                                fill
                                className="object-contain"
                            />
                        </div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Quét mã QR để thanh toán nhanh
                        </p>
                    </div>

                    {/* Cột phải: Thông tin STK */}
                    <div className="flex flex-col justify-center space-y-4">
                        <div className="rounded-2xl bg-gray-50 p-5 border border-gray-100">
                            <p className="text-sm font-semibold text-gray-400">Số tiền cần đóng:</p>
                            <p className="text-3xl font-black text-[#7c3aed]">
                                {course.phi_coc?.toLocaleString()}đ
                            </p>
                        </div>

                        <div className="space-y-3 px-1">
                            <div>
                                <span className="block text-xs font-bold text-gray-400 uppercase">Ngân hàng</span>
                                <span className="font-bold text-gray-800">{course.bank_stk || 'N/A'}</span>
                            </div>
                            <div>
                                <span className="block text-xs font-bold text-gray-400 uppercase">Số tài khoản</span>
                                <span className="font-bold text-gray-800 select-all">{course.stk || 'N/A'}</span>
                            </div>
                            <div>
                                <span className="block text-xs font-bold text-gray-400 uppercase">Chủ tài khoản</span>
                                <span className="font-bold text-gray-800">{course.name_stk || 'N/A'}</span>
                            </div>
                            <div>
                                <span className="block text-xs font-bold text-gray-400 uppercase">Nội dung chuyển khoản</span>
                                <span className="inline-block rounded bg-purple-50 px-2 py-1 font-mono font-bold text-[#7c3aed] select-all border border-purple-100">
                                    {course.noidung_stk || 'Kich hoat khoa hoc'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Tips */}
                <div className="bg-orange-50 px-8 py-4 text-center">
                    <p className="text-sm font-medium text-orange-700">
                        🚀 Sau khi chuyển khoản thành công, khóa học sẽ được kích hoạt tự động hoặc bác có thể nhắn Zalo hỗ trợ.
                    </p>
                </div>

                {/* Nút đóng */}
                <div className="border-t p-4 flex justify-end">
                    <button
                        onClick={onClose}
                        className="rounded-xl px-6 py-2.5 font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                        Để sau
                    </button>
                </div>

                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
                >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>
    )
}
