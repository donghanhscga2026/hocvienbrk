'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import PaymentModal from './PaymentModal'
import UploadProofModal from '@/components/payment/UploadProofModal'
import { enrollInCourseAction } from '@/app/actions/course-actions'
import ShareModal from '@/components/share/ShareModal'
import { Share2 } from 'lucide-react'

// Chuyển URL thành link clickable (cho phần mô tả khóa học)
const makeLinksClickable = (html: string): string => {
    if (!html) return ''
    // Regex match URL: http/https, bao gồm cả zalo.me, facebook.com, etc.
    const urlRegex = /(\b(https?:\/\/)[^\s<]+)/gi
    return html.replace(urlRegex, (match) => {
        return `<a href="${match}" target="_blank" rel="noopener noreferrer" class="text-brk-accent hover:underline font-bold">${match}</a>`
    })
}

interface CourseCardProps {
    course: any
    isLoggedIn: boolean
    enrollment?: {
        status: string
        startedAt: Date | null
        completedCount: number
        totalLessons: number
        enrollmentId?: number
        payment?: {
            id: number
            status: string
            proofImage?: string | null
        }
    } | null
    isCourseOneActive?: boolean
    userPhone?: string | null
    userId?: number | null
    priority?: boolean
    darkMode?: boolean
    profileSlug?: string | null
}

export default function CourseCard({ course, isLoggedIn, enrollment, isCourseOneActive = false, userPhone = null, userId = null, priority = false, darkMode = false, profileSlug = null }: CourseCardProps) {
    const [showPayment, setShowPayment] = useState(false)
    const [showShare, setShowShare] = useState(false)
    const [loading, setLoading] = useState(false)
    const [affiliateCode, setAffiliateCode] = useState<string | null>(null)

    useEffect(() => {
        // Dùng != null để handle userId = 0 (ID hợp lệ)
        if (isLoggedIn && userId != null) {
            setAffiliateCode(String(userId))
        }
    }, [isLoggedIn, userId])

    // Override phi_coc nếu đã kích hoạt khóa 1
    const effectivePhiCoc = isCourseOneActive ? 0 : course.phi_coc

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

        if (effectivePhiCoc === 0) {
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
                        // Sau khi enroll thành công, component sẽ re-render do revalidatePath.
                        // Chúng ta cần đảm bảo setShowPayment(true) được giữ lại.
                        // Sử dụng timeout nhỏ để chạy sau chu kỳ re-render của Next.js
                        setTimeout(() => setShowPayment(true), 100)
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
            <div className="group overflow-hidden rounded-2xl shadow-lg transition-all hover:shadow-2xl flex flex-col h-full bg-brk-surface border-brk-outline">
                {/* Ảnh bìa - Đã tối ưu hóa */}
                <div className="relative aspect-[16/9] w-full overflow-hidden shrink-0 bg-brk-background">
                    <Image
                        src={course.link_anh_bia || 'https://i.postimg.cc/PJPkm7vB/1.jpg'}
                        alt={course.name_lop}
                        fill
                        priority={priority} // Ưu tiên load các card đầu tiên
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                </div>

                {/* Nội dung - Giữ nguyên 100% */}
                <div className="p-5 flex flex-col flex-grow">
                    {/* Title */}
                    <div className="mb-3 flex items-center gap-2.5">
                        <span className="text-2xl leading-none drop-shadow-sm select-none shrink-0">📘</span>
                        <h3 className="text-base sm:text-lg font-black leading-tight truncate flex-1 text-brk-on-surface"
                            style={{ fontFamily: 'var(--font-inter), sans-serif' }}>
                            {course.name_lop}
                        </h3>
                    </div>

                    {/* Badges + Trạng thái + Ngày bắt đầu */}
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                        <span className={`inline-block rounded-full px-3 py-1 text-[8px] font-black uppercase tracking-wider shadow-sm ${effectivePhiCoc === 0 ? 'bg-brk-accent text-brk-on-primary' : 'bg-brk-accent text-brk-on-primary'}`}>
                            {effectivePhiCoc === 0 ? 'Miễn phí' : 'Phí cam kết'}
                        </span>
                        <button
                            onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                setShowShare(true)
                            }}
                            className="inline-flex items-center gap-1.5 rounded-full bg-brk-surface px-3 py-1 text-[10px] font-black uppercase tracking-wider text-brk-primary shadow-sm border border-brk-primary/30 hover:bg-brk-primary/10 transition-colors"
                        >
                            <Share2 className="w-3 h-3" />
                            Chia sẻ
                        </button>
                        {isActive && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-brk-background-dark px-3 py-1 text-[10px] font-black uppercase tracking-wider text-brk-on-primary shadow-sm border border-brk-primary/50">
                                <span className="w-1.5 h-1.5 rounded-full bg-brk-on-primary animate-pulse shrink-0" />
                                Đã kích hoạt
                                {enrollment?.startedAt && (
                                    <span className="opacity-80 font-normal" suppressHydrationWarning>
                                        · Từ {new Date(enrollment.startedAt).toLocaleDateString('vi-VN')}
                                    </span>
                                )}
                            </span>
                        )}
                        {isPending && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-brk-accent px-3 py-1 text-[10px] font-black uppercase tracking-wider text-brk-on-primary shadow-sm border border-brk-accent/50">
                                <span className="w-1.5 h-1.5 rounded-full bg-brk-on-primary animate-pulse shrink-0" />
                                Chờ thanh toán
                            </span>
                        )}
                    </div>

                    {/* Mô tả - URL trong text sẽ được chuyển thành link clickable */}
                    <div
                        className="mb-5 flex-grow text-[14px] font-medium leading-relaxed text-justify break-words text-brk-on-surface [&_a]:text-brk-accent [&_a]:hover:underline [&_a]:font-bold"
                        dangerouslySetInnerHTML={{ __html: makeLinksClickable(course.mo_ta_ngan || '') }}
                    />

                    {/* Button */}
                    <button
                        onClick={handleAction}
                        disabled={loading}
                        className={`group/btn relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-full py-1.5 text-sm sm:text-base font-black shadow-xl transition-all active:scale-[0.97]
                            ${loading ? 'bg-brk-muted text-brk-on-surface cursor-not-allowed' :
                                isActive ? 'bg-brk-primary text-brk-on-primary hover:bg-brk-accent hover:brightness-110' :
                                isPending ? 'bg-brk-accent text-brk-on-primary hover:brightness-110' :
                                    'bg-brk-primary text-brk-on-primary hover:brightness-110'}`}
                    >
                        {loading ? (
                            <span className="flex items-center gap-2 relative z-10">
                                <svg className="h-5 w-5 animate-spin text-brk-on-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Đang kết nối...
                            </span>
                        ) : (
                            <>
                                {isActive && enrollment && enrollment.totalLessons > 0 && (
                                    <span
                                        className="absolute inset-0 transition-all duration-700"
                                        style={{ width: `${progressPct}%`, background: 'rgba(255,255,255,0.18)' }}
                                        aria-hidden="true"
                                    />
                                )}
                                <span className="relative z-10 flex items-center gap-2">
                                    <span>{isActive ? '📖' : isPending ? '💰' : '⚡'}</span>
                                    <span>
                                        {isActive ? 'Vào học tiếp' : isPending ? 'Xem thông tin thanh toán' : effectivePhiCoc === 0 ? 'Kích hoạt miễn phí' : 'Kích hoạt ngay'}
                                        {isActive && enrollment && enrollment.totalLessons > 0 && (
                                            <span className="ml-1.5 font-normal opacity-90 text-[12px]">
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
                        <p className="mt-3 text-center text-xs font-bold text-brk-accent animate-pulse italic">
                            Đang chờ thanh toán...
                        </p>
                    )}
                </div>
            </div>

            {showPayment && (
                <PaymentModal
                    course={course}
                    enrollment={enrollment}
                    isCourseOneActive={isCourseOneActive}
                    userPhone={userPhone}
                    userId={userId}
                    onClose={() => setShowPayment(false)}
                />
            )}

            <ShareModal
                isOpen={showShare}
                onClose={() => setShowShare(false)}
                course={course}
                affiliateCode={affiliateCode}
                profileSlug={profileSlug}
                shareType="course"
            />
        </>
    )
}