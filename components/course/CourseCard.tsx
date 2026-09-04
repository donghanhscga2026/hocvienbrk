'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import PaymentModal from './PaymentModal'
import RegistrationFlowModal from '@/components/course-page/RegistrationFlowModal'
import UploadProofModal from '@/components/payment/UploadProofModal'
import { enrollInCourseAction, getBrkMbvBalanceAction } from '@/app/actions/course-actions'
import { getClientRef } from '@/lib/affiliate/get-client-ref'
import ShareModal from '@/components/share/ShareModal'
import LessonTocModal from './LessonTocModal'
import { Share2, BookOpen, Users, ChevronDown, ChevronUp } from 'lucide-react'

// Chuyển URL thành link clickable (cho phần mô tả khóa học)
const makeLinksClickable = (html: string): string => {
    if (!html) return ''
    // 1. Convert newlines to <br />
    let processed = html.replace(/\n/g, '<br />')
    // 2. Make URLs clickable
    const urlRegex = /(\b(https?:\/\/)[^\s<]+)/gi
    processed = processed.replace(urlRegex, (match) => {
        return `<a href="${match}" target="_blank" rel="noopener noreferrer" class="text-brk-accent hover:underline font-bold">${match}</a>`
    })
    return processed
}

// Dùng chung 1 request lấy số dư MBV cho tất cả card (tránh gọi trùng server action)
let sharedMbvBalancePromise: Promise<number> | null = null
const getSharedMbvBalance = () => {
    if (!sharedMbvBalancePromise) {
        sharedMbvBalancePromise = getBrkMbvBalanceAction()
            .then(bal => {
                sharedMbvBalancePromise = null
                return bal
            })
            .catch(err => {
                sharedMbvBalancePromise = null
                throw err
            })
    }
    return sharedMbvBalancePromise
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
    userPhone?: string | null
    userId?: number | null
    priority?: boolean
    darkMode?: boolean
    profileSlug?: string | null
}

export default function CourseCard({ course, isLoggedIn, enrollment: propEnrollment, userPhone = null, userId = null, priority = false, darkMode = false, profileSlug = null }: CourseCardProps) {
    const router = useRouter()
    const [showPayment, setShowPayment] = useState(false)
    const [showRegistrationModal, setShowRegistrationModal] = useState(false)
    const [showShare, setShowShare] = useState(false)
    const [localEnrollment, setLocalEnrollment] = useState<any>(null)
    const enrollment = localEnrollment || propEnrollment
    const [showToc, setShowToc] = useState(false)
    const [loading, setLoading] = useState(false)
    const [affiliateCode, setAffiliateCode] = useState<string | null>(null)

    // ✅ Mô tả mở rộng và tự động co lại sau 5 giây không tương tác
    const [descExpanded, setDescExpanded] = useState(false)
    const timeoutRef = React.useRef<NodeJS.Timeout | null>(null)

    const resetCollapseTimer = React.useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
        }
        if (descExpanded) {
            timeoutRef.current = setTimeout(() => {
                setDescExpanded(false)
            }, 5000)
        }
    }, [descExpanded])

    useEffect(() => {
        if (descExpanded) {
            resetCollapseTimer()
        }
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current)
        }
    }, [descExpanded, resetCollapseTimer])

    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current)
        }
    }, [])

    const [voucherBalance, setVoucherBalance] = useState(0)

    useEffect(() => {
        // Dùng != null để handle userId = 0 (ID hợp lệ)
        if (isLoggedIn && userId != null) {
            setAffiliateCode(String(userId))
            
            // Lấy số dư ví MBV từ server action (dùng chung 1 request giữa các card)
            getSharedMbvBalance()
                .then(bal => setVoucherBalance(bal))
                .catch(err => console.error("Error fetching MBDT balance:", err))
        }
    }, [isLoggedIn, userId])

    // Use phi_coc directly — server handles voucher logic
    const effectivePhiCoc = course.phi_coc

    const feeTypeDisplay = (() => {
        const ft = course.feeType || 'MIEN_PHI'
        switch (ft) {
            case 'PHI_CAM_KET': return { icon: '💰', color: 'text-brk-primary', label: 'Phí cam kết' }
            case 'PHI_TUY_TINH': return { icon: '💝', color: 'text-yellow-500', label: 'Phí tùy tâm' }
            case 'PHI_DONG_HANH': return { icon: '🤝', color: 'text-green-500', label: 'Phí đồng hành' }
            case 'PHI_TOI_THIEU': return { icon: '📌', color: 'text-orange-500', label: 'Phí tối thiểu' }
            default: return { icon: '📘', color: 'text-brk-accent', label: 'Miễn phí' }
        }
    })()

    const isActive = enrollment?.status === 'ACTIVE'
    const isPending = enrollment?.status === 'PENDING'

    // Sửa lỗi hydration: Format ngày chỉ ở client side
    const [formattedStartDate, setFormattedStartDate] = useState('')
    useEffect(() => {
        if (enrollment?.startedAt) {
            setFormattedStartDate(new Date(enrollment.startedAt).toLocaleDateString('vi-VN'))
        }
    }, [enrollment?.startedAt])

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
                const res = await enrollInCourseAction(course.id, getClientRef())
                if (res.success) {
                    window.location.href = `/courses/${course.id_khoa}/learn`
                }
            } catch (err: any) {
                alert(err.message)
            } finally {
                setLoading(false)
            }
        } else {
            // Trường hợp có học phí cọc: Mở RegistrationFlowModal (hỗ trợ áp dụng ví MBV & tự động kích hoạt)
            setShowRegistrationModal(true)
        }
    }

    const progressPct = enrollment && enrollment.totalLessons > 0
        ? Math.round((enrollment.completedCount / enrollment.totalLessons) * 100)
        : 0

    return (
        <>
            <div 
                onMouseMove={resetCollapseTimer}
                onTouchStart={resetCollapseTimer}
                className="group overflow-hidden rounded-2xl shadow-lg transition-all hover:shadow-2xl flex flex-col h-full bg-brk-surface border-brk-outline"
            >
                {/* Ảnh bìa - Đã tối ưu hóa */}
                <Link
                    href={`/khoa-hoc/${course.id_khoa || course.id}`}
                    className="relative block aspect-[16/9] w-full overflow-hidden shrink-0 bg-brk-background"
                    title={course.name_lop}
                >
                    <Image
                        src={course.link_anh_bia || '/og-image.png'}
                        alt={course.name_lop}
                        fill
                        priority={priority} // Ưu tiên load các card đầu tiên
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                </Link>

                {/* Nội dung - Giữ nguyên 100% */}
                <div className="p-3 flex flex-col flex-grow">
                    {/* Title */}
                    <div className="mb-3 flex items-center gap-2.5">
                        <span className={`text-2xl leading-none drop-shadow-sm select-none shrink-0 ${feeTypeDisplay.color}`}>{feeTypeDisplay.icon}</span>
                        <h3 className="text-base sm:text-lg font-black leading-tight flex-1 text-brk-on-surface"
                            style={{ fontFamily: 'var(--font-be-vietnam-pro), sans-serif' }}>
                            {course.name_lop}
                        </h3>
                    </div>

                    {/* Badges - [Số tiền/Dạng phí] [Chia sẻ] [Kích hoạt] [Mục lục] */}
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                        {!isActive && (
                            effectivePhiCoc === 0 ? (
                                <span className="inline-block rounded-full px-2 py-0.5 text-[10px] font-black tracking-wider shadow-sm bg-brk-accent text-brk-on-primary">
                                    Miễn phí
                                </span>
                            ) : (
                                <>
                                    {course.voucherConfig === 'WALLET' && course.allowMbvDeduction && voucherBalance >= effectivePhiCoc ? (
                                        <>
                                            <span className="inline-block rounded-full px-2.5 py-0.5 text-xs font-black tracking-wider shadow-sm bg-emerald-50 text-emerald-700 border border-emerald-200 line-through decoration-red-500 decoration-2">
                                                {effectivePhiCoc.toLocaleString('vi-VN')}đ
                                            </span>
                                            <span className="inline-block rounded-full px-2.5 py-0.5 text-xs font-black tracking-wider shadow-sm bg-brk-accent text-brk-on-primary animate-pulse">
                                                0đ (-{effectivePhiCoc.toLocaleString('vi-VN')} MBV)
                                            </span>
                                        </>
                                    ) : course.voucherConfig === 'WALLET' && course.allowMbvDeduction && voucherBalance > 0 ? (
                                        <>
                                            <span className="relative inline-block rounded-full px-2.5 py-0.5 text-xs font-black tracking-wider shadow-sm bg-blue-50 text-blue-600 border border-blue-200 overflow-hidden">
                                                {effectivePhiCoc.toLocaleString('vi-VN')}đ
                                                <span className="absolute left-1 right-0 h-[1.5px] bg-red-400" style={{ top: '50%' }} />
                                            </span>
                                            <span className="inline-block rounded-full px-2.5 py-0.5 text-xs font-black tracking-wider shadow-sm bg-amber-500 text-white">
                                                {(effectivePhiCoc - voucherBalance).toLocaleString('vi-VN')}đ (Đã -{voucherBalance.toLocaleString('vi-VN')} MBV)
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="inline-block rounded-full px-2.5 py-0.5 text-xs font-black tracking-wider shadow-sm bg-red-50 text-red-600 border border-red-200">
                                                {effectivePhiCoc.toLocaleString('vi-VN')}đ
                                            </span>
                                            <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-black tracking-wider shadow-sm bg-brk-surface border border-brk-primary/30 ${feeTypeDisplay.color}`}>
                                                {feeTypeDisplay.label}
                                            </span>
                                        </>
                                    )}
                                </>
                            )
                        )}
                        {/* Số bài học */}
                        <button
                            onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                setShowToc(true)
                            }}
                            className="shrink-0 inline-flex items-center gap-1 rounded-full bg-brk-surface px-2.5 py-0.5 text-[10px] font-black tracking-wider text-brk-primary shadow-sm border border-brk-primary/30 hover:bg-brk-primary/10 transition-colors"
                        >
                            {course._count?.lessons ?? 0} bài
                        </button>

                        {/* Số thành viên */}
                        <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-brk-background px-2.5 py-0.5 text-[10px] font-black tracking-wider text-brk-on-surface shadow-sm border border-brk-outline">
                            <Users className="w-3 h-3" />
                            {(course.activeStudentCount ?? course._count?.enrollments ?? 0).toLocaleString('vi-VN')} thành viên
                        </span>

                        {/* Chia sẻ */}
                        <button
                            onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                setShowShare(true)
                            }}
                            className="shrink-0 inline-flex items-center gap-1 rounded-full bg-brk-primary px-2.5 py-0.5 text-[10px] font-black tracking-wider text-brk-on-primary shadow-sm hover:brightness-110 transition-colors ml-auto"
                        >
                            <Share2 className="w-2.5 h-2.5" />
                            Chia sẻ
                        </button>

                        {/* Chờ thanh toán (Nếu có) */}
                        {isPending && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-brk-accent px-2.5 py-0.5 text-[10px] font-black tracking-wider text-brk-on-primary shadow-sm border border-brk-accent/50">
                                <span className="w-1.5 h-1.5 rounded-full bg-brk-on-primary animate-pulse shrink-0" />
                                Chờ thanh toán
                            </span>
                        )}
                    </div>

                    {/* Mô tả - Dùng line-clamp-3 mặc định và mở rộng khi descExpanded */}
                    {course.mo_ta_ngan && (
                        <div className="mb-5 flex-grow">
                            <div
                                className={`text-[14px] font-medium leading-relaxed text-justify break-words text-brk-on-surface [&_a]:text-brk-accent [&_a]:hover:underline [&_a]:font-bold transition-all duration-300 ${
                                    descExpanded ? '' : 'line-clamp-3'
                                }`}
                                dangerouslySetInnerHTML={{ __html: makeLinksClickable(course.mo_ta_ngan) }}
                            />
                        </div>
                    )}

                    {/* Hàng nút hành động dưới chân card */}
                    <div className="flex gap-2 w-full mt-auto">
                        {/* Nút Xem thêm / Thu gọn mô tả ngắn (Bên trái) */}
                        {course.mo_ta_ngan && (
                            <button
                                onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    setDescExpanded(!descExpanded)
                                }}
                                className="shrink-0 flex items-center justify-center gap-1 rounded-full px-3 py-2 text-xs sm:text-sm font-black transition-all active:scale-[0.97] bg-brk-primary/10 text-brk-primary border border-brk-primary/30 hover:bg-brk-primary/20 shadow-md"
                            >
                                <span>{descExpanded ? 'Thu gọn' : 'Xem thêm'}</span>
                                {descExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            </button>
                        )}

                        {/* Nút hành động chính (Bên phải) */}
                        <button
                            onClick={handleAction}
                            disabled={loading}
                            className={`group/btn relative flex flex-1 items-center justify-center gap-1.5 overflow-hidden rounded-full py-2 text-xs sm:text-sm font-black shadow-md transition-all active:scale-[0.97]
                                ${loading ? 'bg-brk-muted text-brk-on-surface cursor-not-allowed' :
                                    isActive ? 'bg-brk-primary text-brk-on-primary hover:bg-brk-accent hover:brightness-110' :
                                        isPending ? 'bg-brk-accent text-brk-on-primary hover:brightness-110' :
                                            'bg-brk-primary text-brk-on-primary hover:brightness-110'}`}
                        >
                            {loading ? (
                                <span className="flex items-center gap-2 relative z-10">
                                    <svg className="h-4 w-4 animate-spin text-brk-on-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
                                    <span className="relative z-10 flex items-center justify-center text-center">
                                        <span>
                                            {isActive ? 'Vào học tiếp' : isPending ? 'Thanh toán' : effectivePhiCoc === 0 ? 'Kích hoạt miễn phí' : 'Kích hoạt ngay'}
                                            {isActive && enrollment && enrollment.totalLessons > 0 && (
                                                <span className="ml-1 font-normal opacity-90 text-[10px] whitespace-nowrap">
                                                    ({enrollment.completedCount}/{enrollment.totalLessons})
                                                </span>
                                            )}
                                        </span>
                                    </span>
                                </>
                            )}
                        </button>
                    </div>


                </div>
            </div>

            {showPayment && (
                <PaymentModal
                    course={course}
                    enrollment={enrollment}
                    userPhone={userPhone}
                    userId={userId}
                    onClose={() => setShowPayment(false)}
                />
            )}

            {showRegistrationModal && (
                <RegistrationFlowModal
                    course={course}
                    userPhone={userPhone}
                    userId={userId}
                    initialEnrollment={enrollment}
                    onClose={() => setShowRegistrationModal(false)}
                    onEnrolled={(newEnroll) => {
                        setLocalEnrollment(newEnroll)
                        getBrkMbvBalanceAction().then(bal => setVoucherBalance(bal)).catch(() => {})
                        router.refresh()
                    }}
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

            <LessonTocModal
                isOpen={showToc}
                onClose={() => setShowToc(false)}
                courseId={course.id}
                courseName={course.name_lop}
            />
        </>
    )
}