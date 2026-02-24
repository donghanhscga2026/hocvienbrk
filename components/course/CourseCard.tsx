
'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import PaymentModal from './PaymentModal'
import { enrollInCourseAction, getEnrollmentStatus } from '@/app/actions/course-actions'

interface CourseCardProps {
    course: any
    isLoggedIn: boolean
    priority?: boolean
}

export default function CourseCard({ course, isLoggedIn, priority = false }: CourseCardProps) {
    const [status, setStatus] = useState<string | null>(null)
    const [showPayment, setShowPayment] = useState(false)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (isLoggedIn) {
            getEnrollmentStatus(course.id).then(setStatus)
        }
    }, [course.id, isLoggedIn])

    const handleAction = async (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()

        if (!isLoggedIn) {
            alert('Vui lòng Đăng nhập / Đăng ký tài khoản miễn phí để tiếp tục!')
            window.location.href = '/login'
            return
        }

        if (status === 'ACTIVE') {
            window.location.href = `/courses/${course.id_khoa}`
            return
        }

        if (course.phi_coc === 0) {
            setLoading(true)
            try {
                const res = await enrollInCourseAction(course.id)
                if (res.success) {
                    setStatus(res.status)
                    // Chuyển hướng sau khi đăng ký thành công
                    window.location.href = `/courses/${course.id_khoa}`
                }
            } catch (err: any) {
                alert(err.message)
            } finally {
                setLoading(false)
            }
        } else {
            // Khóa học có phí
            if (status === 'PENDING') {
                setShowPayment(true)
            } else {
                // Chưa đăng ký -> Tạo enrollment PENDING
                setLoading(true)
                try {
                    const res = await enrollInCourseAction(course.id)
                    if (res.success) {
                        setStatus(res.status)
                        setShowPayment(true)
                    }
                } catch (err: any) {
                    alert(err.message)
                } finally {
                    setLoading(false)
                }
            }
        }
    }

    return (
        <>
            <div className="group overflow-hidden rounded-2xl bg-white shadow-lg transition-all hover:shadow-2xl border border-gray-100 flex flex-col h-full">
                {/* Ảnh bìa - Tối ưu tỉ lệ để không cắt nội dung */}
                <div className="relative h-48 sm:h-56 w-full overflow-hidden shrink-0 bg-[#f8fafc]">
                    <Image
                        src={course.link_anh_bia || 'https://i.postimg.cc/PJPkm7vB/1.jpg'}
                        alt={course.name_lop}
                        fill
                        priority={priority}
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-contain p-1 transition-transform duration-500 group-hover:scale-105"
                    />
                </div>

                {/* Nội dung */}
                <div className="p-5 flex flex-col flex-grow">
                    {/* Header: Icon + Title - Căn chỉnh hoàn hảo */}
                    <div className="mb-4 flex items-center gap-2.5">
                        <span className="text-2xl sm:text-2xl leading-none drop-shadow-sm select-none shrink-0">📘</span>
                        <h3
                            className="text-base sm:text-lg font-black text-black leading-tight truncate flex-1"
                            style={{ fontFamily: 'var(--font-inter), sans-serif' }}
                        >
                            {course.name_lop}
                        </h3>
                    </div>

                    {/* Trạng thái Phí & Đã sở hữu */}
                    <div className="mb-4 flex flex-wrap gap-2">
                        <span className={`inline-block rounded-full px-4 py-1 sm:px-4 sm:py-1.5 text-[10px] sm:text-[11px] font-black uppercase tracking-wider shadow-sm ${course.phi_coc === 0 ? 'bg-yellow-400 text-gray-900 font-extrabold' : 'bg-red-600 text-white'}`}>
                            {course.phi_coc === 0 ? 'Miễn phí' : 'Phí cam kết'}
                        </span>
                        {status === 'ACTIVE' && (
                            <span className="inline-block rounded-full bg-sky-500 px-4 py-1 sm:px-4 sm:py-1.5 text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-white shadow-sm border border-sky-400">
                                Đã kích hoạt
                            </span>
                        )}
                    </div>

                    {/* Mô tả */}
                    <p className="mb-6 flex-grow text-[14px] font-medium text-gray-500 leading-relaxed line-clamp-4"
                        dangerouslySetInnerHTML={{ __html: course.mo_ta_ngan || '' }} />

                    {/* Button */}
                    <button
                        onClick={handleAction}
                        disabled={loading}
                        className={`group/btn relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-full py-3.5 text-sm sm:text-base font-black shadow-xl transition-all active:scale-[0.97] ${loading ? 'bg-gray-400 text-white cursor-not-allowed' :
                            status === 'ACTIVE' ? 'bg-green-600 text-white hover:bg-green-700 hover:shadow-green-200' :
                                course.phi_coc === 0
                                    ? 'bg-sky-500 text-white hover:bg-sky-600 hover:shadow-sky-200'
                                    : 'bg-sky-500 text-white hover:bg-sky-600 hover:shadow-sky-200'
                            }`}
                    >
                        {loading ? (
                            <span className="flex items-center gap-2">
                                <svg className="h-5 w-5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Đang kết nối...
                            </span>
                        ) : (
                            <>
                                <span>{status === 'ACTIVE' ? '🚀' : '⚡'}</span>
                                <span>
                                    {status === 'ACTIVE' ? 'Vào học ngay' :
                                        course.phi_coc === 0 ? 'Kích hoạt miễn phí' : 'Kích hoạt ngay'}
                                </span>
                                <span>{status === 'ACTIVE' ? '' : '🚀'}</span>
                            </>
                        )}
                    </button>

                    {status === 'PENDING' && !loading && (
                        <p className="mt-3 text-center text-xs font-bold text-orange-600 animate-pulse italic">
                            Đang chờ thanh toán...
                        </p>
                    )}
                </div>
            </div>

            {showPayment && (
                <PaymentModal
                    course={course}
                    onClose={() => setShowPayment(false)}
                />
            )}
        </>
    )
}
