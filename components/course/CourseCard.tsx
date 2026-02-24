
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
            <div className="group overflow-hidden rounded-2xl bg-white shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl border border-gray-100 flex flex-col h-full">
                {/* Ảnh bìa */}
                <div className="relative h-48 w-full overflow-hidden shrink-0">
                    <Image
                        src={course.link_anh_bia || 'https://i.postimg.cc/PJPkm7vB/1.jpg'}
                        alt={course.name_lop}
                        fill
                        priority={priority}
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    {/* Trạng thái Miễn phí/Có phí */}
                    <div className="absolute left-4 top-4 flex gap-2">
                        <span className={`rounded-md px-3 py-1 text-[10px] font-bold uppercase text-white shadow-sm ${course.phi_coc === 0 ? 'bg-green-500' : 'bg-orange-500'}`}>
                            {course.phi_coc === 0 ? 'Miễn phí' : 'Có phí'}
                        </span>
                        {status === 'ACTIVE' && (
                            <span className="rounded-md bg-blue-600 px-3 py-1 text-[10px] font-bold uppercase text-white shadow-sm">
                                Đã sở hữu
                            </span>
                        )}
                    </div>
                </div>

                {/* Nội dung */}
                <div className="p-5 flex flex-col flex-grow">
                    <div className="mb-2 flex items-center gap-2 text-blue-600">
                        <div className="h-2 w-2 rounded-full bg-blue-600"></div>
                        <h3 className="text-lg font-bold text-gray-800 line-clamp-2">{course.name_lop}</h3>
                    </div>

                    <p className="mb-6 flex-grow text-sm text-gray-600 leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: course.mo_ta_ngan || '' }} />

                    <button
                        onClick={handleAction}
                        disabled={loading}
                        className={`w-full rounded-xl py-3.5 font-bold text-white shadow-sm transition-all active:scale-[0.98] ${loading ? 'bg-gray-400 cursor-not-allowed' :
                            status === 'ACTIVE' ? 'bg-[#7c3aed] hover:bg-purple-700' :
                                course.phi_coc === 0
                                    ? 'bg-blue-600 hover:bg-blue-700'
                                    : 'bg-orange-500 hover:bg-orange-600'
                            }`}
                    >
                        {loading ? 'Đang kết nối...' :
                            status === 'ACTIVE' ? '🚀 Vào học ngay' :
                                course.phi_coc === 0 ? '📘 Đăng ký miễn phí' : '⚡ Kích hoạt khóa học'}
                    </button>

                    {status === 'PENDING' && !loading && (
                        <p className="mt-2 text-center text-[11px] font-medium text-orange-600 animate-pulse italic">
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
