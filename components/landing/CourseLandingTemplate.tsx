'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { 
    ChevronDown, ChevronUp, Star, BookOpen, Users, Clock, 
    Check, Play, GraduationCap, MessageSquare, ArrowRight, Link2
} from 'lucide-react'
import { enrollInCourseAction, checkEnrollmentStatusAction } from '@/app/actions/course-actions'
import { getClientRef } from '@/lib/affiliate/get-client-ref'
import { useRouter } from 'next/navigation'
import MainHeader from '@/components/layout/MainHeader'
import PaymentModal from '@/components/course/PaymentModal'

interface CourseLesson {
    id: string
    title: string
    order: number
}

interface CourseTestimonial {
    id: string
    name: string
    role?: string | null
    avatar?: string | null
    content: string
    rating?: number | null
}

interface CourseLandingTemplateProps {
    course: {
        id: number
        id_khoa: string
        name_lop: string
        name_khoa?: string | null
        mo_ta_ngan?: string | null
        mo_ta_dai?: string | null
        link_anh_bia?: string | null
        phi_coc: number
        category?: string | null
        courseCategory?: { name: string } | null
    }
    lessons: CourseLesson[]
    testimonials: CourseTestimonial[]
    enrollment?: { status: string } | null
    userPhone: string | null
    userId: number | null
    session: any
    totalHours: number
    activeStudentCount: number
}

export default function CourseLandingTemplate({
    course,
    lessons,
    testimonials,
    enrollment,
    userPhone,
    userId,
    session,
    totalHours,
    activeStudentCount
}: CourseLandingTemplateProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [showAllLessons, setShowAllLessons] = useState(false)
    const [copied, setCopied] = useState(false)
    const [showPayment, setShowPayment] = useState(false)
    const [localEnrollment, setLocalEnrollment] = useState<any>(null)
    const [hasActivated, setHasActivated] = useState(false)
    const [showActivatedToast, setShowActivatedToast] = useState(false)
    
    const effectiveEnrollment = localEnrollment || enrollment
    const isEnrolled = effectiveEnrollment?.status === 'ACTIVE'
    const isPending = effectiveEnrollment?.status === 'PENDING'
    const effectivePhiCoc = course.phi_coc

    // Polling: tự động kiểm tra trạng thái ghi danh sau thanh toán
    useEffect(() => {
        if (!course?.id || hasActivated || isEnrolled) return
        const interval = setInterval(async () => {
            try {
                const res = await checkEnrollmentStatusAction(course.id)
                if (res.status === 'ACTIVE' && !hasActivated) {
                    setHasActivated(true)
                    setShowPayment(false)
                    setShowActivatedToast(true)
                    setLocalEnrollment((prev: any) => prev ? { ...prev, status: 'ACTIVE' } : { status: 'ACTIVE' })
                    router.refresh()
                }
            } catch {}
        }, 10_000)
        const timeout = setTimeout(() => clearInterval(interval), 20 * 60 * 1000)
        return () => { clearInterval(interval); clearTimeout(timeout) }
    }, [course?.id, hasActivated, isEnrolled])
    
    const displayLessons = showAllLessons ? lessons : lessons.slice(0, 3)
    const hasMoreLessons = lessons.length > 3
    
    const handleEnroll = async () => {
        if (!session) {
            router.push(`/register?redirect=khoa-hoc/${course.id_khoa}`)
            return
        }
        
        setLoading(true)
        try {
            const res: any = await enrollInCourseAction(course.id, getClientRef())
            if (res.success) {
                if (res.enrollment) {
                    setLocalEnrollment(res.enrollment)
                }
                if (effectivePhiCoc === 0) {
                    router.push(`/courses/${course.id_khoa}/learn`)
                } else {
                    setTimeout(() => setShowPayment(true), 100)
                }
            } else {
                alert((res as any).message || 'Có lỗi xảy ra')
            }
        } catch (err: any) {
            alert(err.message || 'Có lỗi xảy ra')
        } finally {
            setLoading(false)
        }
    }
    
    const handleCopyShareLink = async () => {
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
        const link = `${baseUrl}/khoa-hoc/${encodeURIComponent(course.id_khoa)}${userId ? `?ref=${userId}` : ''}`
        try {
            await navigator.clipboard.writeText(link)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch {
            // fallback
        }
    }
    
    const getCTAButton = () => {
        if (isEnrolled) {
            return (
                <button
                    onClick={() => router.push(`/courses/${course.id_khoa}/learn`)}
                    className="w-full bg-brk-primary text-brk-on-primary py-4 rounded-2xl font-black text-lg uppercase tracking-wide hover:brightness-110 transition-all flex items-center justify-center gap-3 shadow-xl shadow-brk-primary/20"
                >
                    <Play className="w-6 h-6" />
                    Vào học ngay
                </button>
            )
        }
        
        if (effectivePhiCoc === 0) {
            return (
                <button
                    onClick={handleEnroll}
                    disabled={loading}
                    className="w-full bg-brk-accent text-brk-on-primary py-4 rounded-2xl font-black text-lg uppercase tracking-wide hover:brightness-110 transition-all flex items-center justify-center gap-3 shadow-xl shadow-brk-accent/20 disabled:opacity-50"
                >
                    {loading ? (
                        <span className="animate-spin">⟳</span>
                    ) : (
                        <>
                            <Check className="w-6 h-6" />
                            Kích hoạt miễn phí
                        </>
                    )}
                </button>
            )
        }
        
        return (
            <button
                onClick={handleEnroll}
                disabled={loading}
                className="w-full bg-brk-primary text-brk-on-primary py-4 rounded-2xl font-black text-lg uppercase tracking-wide hover:brightness-110 transition-all flex items-center justify-center gap-3 shadow-xl shadow-brk-primary/20 disabled:opacity-50"
            >
                {loading ? (
                    <span className="animate-spin">⟳</span>
                ) : (
                    <>
                        <ArrowRight className="w-6 h-6" />
                        Kích hoạt ngay - {effectivePhiCoc.toLocaleString('vi-VN')}đ
                    </>
                )}
            </button>
        )
    }
    
    return (
        <div className="min-h-screen bg-brk-background">
            <MainHeader title="" />
            
            {/* CTA Section */}
            <section className="py-8 pt-20">
                <div className="container mx-auto px-4">
                    <div className="max-w-lg mx-auto">
                        <div className="bg-brk-surface rounded-3xl shadow-2xl border border-brk-outline p-6 md:p-8">
                            {course.link_anh_bia && (
                                <div className="relative aspect-video w-full rounded-2xl overflow-hidden mb-4 bg-brk-background">
                                    <Image
                                        src={course.link_anh_bia}
                                        alt={course.name_lop}
                                        fill
                                        className="object-contain"
                                    />
                                </div>
                            )}
                            
                            <div className="mb-4">
                                <h1 className="text-2xl md:text-3xl font-black text-brk-on-surface mb-1">
                                    {course.name_lop}
                                </h1>
                                {course.name_khoa && (
                                    <p className="text-sm text-brk-muted">{course.name_khoa}</p>
                                )}
                                <div className="mt-2">
                                    {effectivePhiCoc === 0 ? (
                                        <span className="inline-block px-3 py-1 bg-brk-accent text-brk-on-primary text-xs font-bold uppercase rounded-full">
                                            Miễn phí
                                        </span>
                                    ) : (
                                        <p className="text-2xl font-black text-brk-primary">
                                            {effectivePhiCoc.toLocaleString('vi-VN')}đ
                                        </p>
                                    )}
                                </div>
                            </div>
                            
                            {isEnrolled && (
                                <div className="mb-4 p-3 bg-brk-primary/10 rounded-xl border border-brk-primary/30">
                                    <p className="text-brk-primary text-sm font-medium flex items-center gap-2">
                                        <span className="w-2 h-2 bg-brk-primary rounded-full animate-pulse" />
                                        Bạn đã kích hoạt khóa học này
                                    </p>
                                </div>
                            )}
                            
                            {isPending && (
                                <div className="mb-4 p-3 bg-brk-primary/10 rounded-xl border border-brk-primary/30">
                                    <p className="text-brk-primary text-sm font-medium flex items-center gap-2">
                                        <span className="w-2 h-2 bg-brk-primary rounded-full animate-pulse" />
                                        Đang chờ thanh toán...
                                    </p>
                                </div>
                            )}
                            
                            {getCTAButton()}

                            {isEnrolled && (
                                <button
                                    onClick={handleCopyShareLink}
                                    className="w-full mt-3 bg-white border-2 border-brk-primary text-brk-primary py-3 rounded-2xl font-bold text-sm hover:bg-brk-primary/5 transition-all flex items-center justify-center gap-2"
                                >
                                    <Link2 className="w-4 h-4" />
                                    {copied ? '✓ Đã sao chép' : 'Chia sẻ link giới thiệu'}
                                </button>
                            )}

                            {!session && (
                                <p className="mt-3 text-center text-xs text-brk-muted">
                                    Đăng nhập để xem tiến độ học tập
                                </p>
                            )}

                            {/* Stats */}
                            <div className="mt-6 pt-6 border-t border-brk-outline">
                                <div className="flex items-center justify-center gap-6 text-sm text-brk-muted">
                                    <div className="flex items-center gap-2">
                                        <BookOpen className="w-4 h-4" />
                                        <span>{lessons.length} bài học</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-4 h-4" />
                                        <span>{totalHours} giờ</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Users className="w-4 h-4" />
                                        <span>{activeStudentCount} học viên</span>
                                    </div>
                                </div>
                                {(course.courseCategory?.name || course.category) && (
                                    <div className="flex items-center justify-center gap-2 mt-3">
                                        <span className="px-3 py-1 bg-brk-primary/10 text-brk-primary text-xs font-bold uppercase rounded-full">
                                            {course.courseCategory?.name || course.category}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>
            
            {/* Overview Section */}
            <section className="py-16">
                <div className="container mx-auto px-4">
                    <div className="max-w-4xl">
                        <h2 className="text-2xl font-black text-brk-on-surface mb-6">
                            Giới thiệu khóa học
                        </h2>
                        <div 
                            className="text-brk-on-surface leading-relaxed whitespace-pre-line"
                            dangerouslySetInnerHTML={{ __html: course.mo_ta_ngan || 'Khóa học đang được cập nhật...' }}
                        />
                    </div>
                </div>
            </section>
            
            {/* Curriculum Section */}
            {lessons.length > 0 && (
                <section className="py-16 bg-brk-surface">
                    <div className="container mx-auto px-4">
                        <div className="max-w-4xl">
                            <h2 className="text-2xl font-black text-brk-on-surface mb-6">
                                Nội dung khóa học
                            </h2>
                            <p className="text-brk-muted mb-6">
                                {lessons.length} bài học • {totalHours} giờ
                            </p>
                            
                            <div className="space-y-3">
                                {displayLessons.map((lesson, index) => (
                                    <div 
                                        key={lesson.id}
                                        className="flex items-center gap-4 p-4 bg-brk-background rounded-xl border border-brk-outline"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-brk-primary/10 flex items-center justify-center text-brk-primary font-bold text-sm">
                                            {index + 1}
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-medium text-brk-on-surface">
                                                {lesson.title}
                                            </h4>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            
                            {hasMoreLessons && (
                                <button
                                    onClick={() => setShowAllLessons(!showAllLessons)}
                                    className="mt-4 flex items-center gap-2 text-brk-primary font-medium hover:underline"
                                >
                                    {showAllLessons ? (
                                        <>
                                            <ChevronUp className="w-5 h-5" />
                                            Thu gọn
                                        </>
                                    ) : (
                                        <>
                                            <ChevronDown className="w-5 h-5" />
                                            Xem thêm {lessons.length - 3} bài học
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </section>
            )}
            
            {/* Testimonials Section */}
            <section className="py-16">
                <div className="container mx-auto px-4">
                    <div className="max-w-4xl">
                        <h2 className="text-2xl font-black text-brk-on-surface mb-6">
                            Học viên nói gì về khóa học
                        </h2>
                        
                        {testimonials.length > 0 ? (
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {testimonials.slice(0, 3).map((testimonial) => (
                                    <div 
                                        key={testimonial.id}
                                        className="bg-brk-surface rounded-2xl p-6 border border-brk-outline"
                                    >
                                        <div className="flex items-center gap-1 mb-4">
                                            {[...Array(testimonial.rating || 5)].map((_, i) => (
                                                <Star key={i} className="w-4 h-4 fill-brk-accent text-brk-accent" />
                                            ))}
                                        </div>
                                        <p className="text-brk-on-surface mb-4 leading-relaxed">
                                            "{testimonial.content}"
                                        </p>
                                        <div className="flex items-center gap-3">
                                            {testimonial.avatar ? (
                                                <Image
                                                    src={testimonial.avatar}
                                                    alt={testimonial.name}
                                                    width={40}
                                                    height={40}
                                                    className="w-10 h-10 rounded-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-brk-primary/10 flex items-center justify-center text-brk-primary font-bold">
                                                    {testimonial.name.charAt(0)}
                                                </div>
                                            )}
                                            <div>
                                                <p className="font-medium text-brk-on-surface text-sm">
                                                    {testimonial.name}
                                                </p>
                                                {testimonial.role && (
                                                    <p className="text-brk-muted text-xs">
                                                        {testimonial.role}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 px-4 bg-brk-surface rounded-2xl border border-brk-outline">
                                <MessageSquare className="w-12 h-12 mx-auto text-brk-muted mb-4" />
                                <h3 className="text-lg font-bold text-brk-on-surface mb-2">
                                    Chưa có chia sẻ nào
                                </h3>
                                <p className="text-brk-muted max-w-md mx-auto leading-relaxed">
                                    Hãy tham gia khóa học và để lại cảm nhận của bạn để giúp cộng đồng học viên có thêm động lực nhé!
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </section>
            
            {/* Final CTA - Share Section */}
            <section className="py-16 bg-brk-surface">
                <div className="container mx-auto px-4 text-center">
                    <div className="max-w-2xl mx-auto">
                        {isEnrolled ? (
                            <>
                                <Link2 className="w-12 h-12 mx-auto text-brk-primary mb-4" />
                                <h2 className="text-3xl font-black text-brk-on-surface mb-4">
                                    Chia sẻ khóa học này
                                </h2>
                                <p className="text-brk-muted mb-8 leading-relaxed">
                                    Giới thiệu khóa học đến bạn bè và nhận tri ân tương xứng
                                </p>
                                <button
                                    onClick={handleCopyShareLink}
                                    className="inline-flex items-center gap-2 bg-brk-primary text-brk-on-primary px-8 py-4 rounded-2xl font-black text-lg hover:brightness-110 transition-all shadow-xl shadow-brk-primary/20"
                                >
                                    {copied ? (
                                        <>Đã sao chép!</>
                                    ) : (
                                        <>
                                            <Link2 className="w-5 h-5" />
                                            Sao chép link giới thiệu
                                        </>
                                    )}
                                </button>
                            </>
                        ) : (
                            <>
                                <h2 className="text-3xl font-black text-brk-on-surface mb-4">
                                    Sẵn sàng bắt đầu?
                                </h2>
                                <p className="text-brk-muted mb-8 leading-relaxed">
                                    Tham gia khóa học để chia sẻ và nhận tri ân tương xứng
                                </p>
                                {getCTAButton()}
                            </>
                        )}
                    </div>
                </div>
            </section>
            
            {/* Footer */}
            <footer className="py-8 text-center text-brk-muted text-sm">
                <p>© 2026 Học viện BRK. All rights reserved.</p>
            </footer>

            {showPayment && (
                <PaymentModal
                    course={course}
                    enrollment={effectiveEnrollment}
                    userPhone={userPhone}
                    userId={userId}
                    onClose={() => setShowPayment(false)}
                />
            )}

            {showActivatedToast && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-green-500 text-white px-6 py-3 rounded-xl shadow-xl flex items-center gap-3 animate-bounce">
                    <Check className="w-5 h-5" />
                    <span className="font-bold">Kích hoạt thành công! Bạn có thể vào học ngay.</span>
                    <button onClick={() => setShowActivatedToast(false)} className="ml-2 opacity-70 hover:opacity-100 text-lg leading-none">&times;</button>
                </div>
            )}
        </div>
    )
}
