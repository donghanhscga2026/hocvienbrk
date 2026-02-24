
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
            <div className="group overflow-hidden rounded-3xl bg-white shadow-md transition-all hover:shadow-xl border border-gray-100 flex flex-col h-full">
                {/* Ảnh bìa */}
                <div className="relative h-64 w-full overflow-hidden shrink-0">
                    <Image
                        src={course.link_anh_bia || 'https://i.postimg.cc/PJPkm7vB/1.jpg'}
                        alt={course.name_lop}
                        fill
                        priority={priority}
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    {status === 'ACTIVE' && (
                        <div className="absolute right-4 top-4">
                            <span className="rounded-full bg-blue-600/90 backdrop-blur-sm px-3 py-1 text-[10px] font-bold uppercase text-white shadow-sm">
                                Đã sở hữu
                            </span>
                        </div>
                    )}
                </div>

                {/* Nội dung */}
                <div className="p-6 flex flex-col flex-grow">
                    {/* Header: Icon + Title */}
                    <div className="mb-3 flex items-start gap-3">
                        <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-md">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                        </div>
                        <h3 className="text-xl font-extrabold text-[#111827] leading-tight line-clamp-2">{course.name_lop}</h3>
                    </div>

                    {/* Trạng thái Phí */}
                    <div className="mb-4">
                        <span className={`inline-block rounded-full px-4 py-1.5 text-[11px] font-black uppercase tracking-wider text-white shadow-sm ${course.phi_coc === 0 ? 'bg-green-500' : 'bg-[#f59e0b]'}`}>
                            {course.phi_coc === 0 ? 'Miễn phí' : 'Có phí'}
                        </span>
                    </div>

                    {/* Mô tả */}
                    <p className="mb-8 flex-grow text-[15px] font-medium text-gray-500 leading-relaxed line-clamp-4"
                        dangerouslySetInnerHTML={{ __html: course.mo_ta_ngan || '' }} />

                    {/* Button */}
                    <button
                        onClick={handleAction}
                        disabled={loading}
                        className={`group/btn relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-full py-4 text-base font-black text-white shadow-lg transition-all active:scale-[0.97] ${loading ? 'bg-gray-400 cursor-not-allowed' :
                            status === 'ACTIVE' ? 'bg-[#7c3aed] hover:bg-purple-700 hover:shadow-purple-200' :
                                course.phi_coc === 0
                                    ? 'bg-blue-600 hover:bg-blue-700 hover:shadow-blue-200'
                                    : 'bg-[#f59e0b] hover:bg-orange-600 hover:shadow-orange-200'
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
                                        course.phi_coc === 0 ? 'Đăng ký miễn phí' : 'Kích hoạt ngay'}
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
