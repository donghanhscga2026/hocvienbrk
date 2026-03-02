
'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import PaymentModal from './PaymentModal'
import { enrollInCourseAction } from '@/app/actions/course-actions'

interface CourseCardProps {
    course: any
    isLoggedIn: boolean
    enrollment?: {
        status: string
        startedAt: Date | null
        completedCount: number
        totalLessons: number
    } | null
    priority?: boolean
    darkMode?: boolean
}

export default function CourseCard({ course, isLoggedIn, enrollment, priority = false, darkMode = false }: CourseCardProps) {
    const [showPayment, setShowPayment] = useState(false)
    const [loading, setLoading] = useState(false)

    const isActive = enrollment?.status === 'ACTIVE'
    const isPending = enrollment?.status === 'PENDING'

    const handleAction = async (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()

        if (!isLoggedIn) {
            alert('Vui lòng Đăng nhập / Đăng ký tài khoản miễn phí để tiếp tục!')
            window.location.href = '/login'
            return
        }

        if (isActive) {
            window.location.href = `/courses/${course.id_khoa}/learn`
            return
        }

        if (course.phi_coc === 0) {
            setLoading(true)
            try {
                const res = await enrollInCourseAction(course.id)
                if (res.success) {
                    window.location.href = `/courses/${course.id_khoa}/learn`
                }
            } catch (err: any) {
                alert(err.message)
            } finally {
                setLoading(false)
            }
        } else {
            if (isPending) {
                setShowPayment(true)
            } else {
                setLoading(true)
                try {
                    const res = await enrollInCourseAction(course.id)
                    if (res.success) {
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

    const progressPct = enrollment && enrollment.totalLessons > 0
        ? Math.round((enrollment.completedCount / enrollment.totalLessons) * 100)
        : 0

    return (
        <>
            <div className={`group overflow-hidden rounded-2xl shadow-lg transition-all hover:shadow-2xl flex flex-col h-full ${darkMode ? 'bg-zinc-900 border border-zinc-800' : 'bg-white border border-gray-100'}`}>
                {/* Ảnh bìa */}
                <div className="relative aspect-[16/9] w-full overflow-hidden shrink-0">
                    <Image
                        src={course.link_anh_bia || 'https://i.postimg.cc/PJPkm7vB/1.jpg'}
                        alt={course.name_lop}
                        fill
                        priority={priority}
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                </div>

                {/* Nội dung */}
                <div className="p-5 flex flex-col flex-grow">
                    {/* Title */}
                    <div className="mb-3 flex items-center gap-2.5">
                        <span className="text-2xl leading-none drop-shadow-sm select-none shrink-0">📘</span>
                        <h3 className={`text-base sm:text-lg font-black leading-tight truncate flex-1 ${darkMode ? 'text-white' : 'text-black'}`}
                            style={{ fontFamily: 'var(--font-inter), sans-serif' }}>
                            {course.name_lop}
                        </h3>
                    </div>

                    {/* Badges + Trạng thái + Ngày bắt đầu */}
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                        <span className={`inline-block rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider shadow-sm ${course.phi_coc === 0 ? 'bg-yellow-400 text-gray-900' : 'bg-red-600 text-white'}`}>
                            {course.phi_coc === 0 ? 'Miễn phí' : 'Phí cam kết'}
                        </span>
                        {isActive && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-sm border border-sky-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse shrink-0" />
                                Đã kích hoạt
                                {enrollment?.startedAt && (
                                    <span className="opacity-80 font-normal">
                                        · Từ {new Date(enrollment.startedAt).toLocaleDateString('vi-VN')}
                                    </span>
                                )}
                            </span>
                        )}
                    </div>

                    {/* Mô tả */}
                    <div
  className={`mb-5 flex-grow text-[14px] font-medium leading-relaxed text-justify break-words ${
    darkMode ? 'text-gray-300' : 'text-gray-500'
  }`}
  dangerouslySetInnerHTML={{ __html: course.mo_ta_ngan || '' }}
/>

                    {/* Button */}
                    <button
                        onClick={handleAction}
                        disabled={loading}
                        className={`group/btn relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-full py-3.5 text-sm sm:text-base font-black shadow-xl transition-all active:scale-[0.97]
                            ${loading ? 'bg-gray-400 text-white cursor-not-allowed' :
                                isActive ? 'bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-emerald-200' :
                                    'bg-sky-500 text-white hover:bg-sky-600 hover:shadow-sky-200'}`}
                    >
                        {loading ? (
                            <span className="flex items-center gap-2 relative z-10">
                                <svg className="h-5 w-5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Đang kết nối...
                            </span>
                        ) : (
                            <>
                                {/* Thanh tiến trình nền trong nút (chỉ khi Active) */}
                                {isActive && enrollment && enrollment.totalLessons > 0 && (
                                    <span
                                        className="absolute inset-0 transition-all duration-700"
                                        style={{ width: `${progressPct}%`, background: 'rgba(255,255,255,0.18)' }}
                                        aria-hidden="true"
                                    />
                                )}
                                {/* Nội dung nút */}
                                <span className="relative z-10 flex items-center gap-2">
                                    <span>{isActive ? '📖' : '⚡'}</span>
                                    <span>
                                        {isActive ? 'Vào học tiếp' : course.phi_coc === 0 ? 'Kích hoạt miễn phí' : 'Kích hoạt ngay'}
                                        {isActive && enrollment && enrollment.totalLessons > 0 && (
                                            <span className="ml-1.5 font-normal opacity-90 text-[11px]">
                                                {enrollment.completedCount}/{enrollment.totalLessons} bài · {progressPct}%
                                            </span>
                                        )}
                                    </span>
                                    <span>{isActive ? '▶' : '🚀'}</span>
                                </span>
                            </>
                        )}
                    </button>

                    {isPending && !loading && (
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
