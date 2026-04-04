'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { 
    ChevronDown, ChevronUp, Star, BookOpen, Users, Clock, 
    Check, Play, GraduationCap, MessageSquare, ArrowRight
} from 'lucide-react'
import { enrollInCourseAction } from '@/app/actions/course-actions'
import { useRouter } from 'next/navigation'

interface CourseLesson {
    id: string
    title: string
    order: number
}

interface CourseTestimonial {
    id: number
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
    }
    lessons: CourseLesson[]
    testimonials: CourseTestimonial[]
    enrollment?: { status: string } | null
    isCourseOneActive: boolean
    userPhone: string | null
    userId: number | null
    session: any
}

const DEMO_TESTIMONIALS: CourseTestimonial[] = [
    {
        id: 0,
        name: "Nguyễn Văn A",
        role: "Học viên khóa 1",
        content: "Khóa học rất bổ ích, giáo viên dạy dễ hiểu và chi tiết. Tôi đã áp dụng được nhiều kiến thức vào công việc.",
        rating: 5
    },
    {
        id: 1,
        name: "Trần Thị B",
        role: "Học viên khóa 2", 
        content: "Nội dung phong phú, cập nhật thường xuyên. Đội ngũ hỗ trợ nhiệt tình, giải đáp thắc mắc nhanh chóng.",
        rating: 5
    },
    {
        id: 2,
        name: "Lê Văn C",
        role: "Học viên khóa 3",
        content: "Sau khi hoàn thành khóa học, tôi tự tin hơn trong công việc. Cảm ơn Học viện BRK đã tạo ra khóa học chất lượng!",
        rating: 5
    }
]

export default function CourseLandingTemplate({
    course,
    lessons,
    testimonials,
    enrollment,
    isCourseOneActive,
    userPhone,
    userId,
    session
}: CourseLandingTemplateProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [showAllLessons, setShowAllLessons] = useState(false)
    
    const isEnrolled = enrollment?.status === 'ACTIVE'
    const isPending = enrollment?.status === 'PENDING'
    const effectivePhiCoc = isCourseOneActive ? 0 : course.phi_coc
    
    const displayLessons = showAllLessons ? lessons : lessons.slice(0, 3)
    const hasMoreLessons = lessons.length > 3
    
    const displayTestimonials = testimonials.length > 0 ? testimonials : DEMO_TESTIMONIALS
    
    const estimatedHours = Math.max(1, Math.ceil(lessons.length * 0.5))
    
    const handleEnroll = async () => {
        if (!session) {
            router.push(`/register?redirect=${course.id_khoa}`)
            return
        }
        
        setLoading(true)
        try {
            const res = await enrollInCourseAction(course.id)
            if (res.success) {
                router.push(`/courses/${course.id_khoa}/learn`)
            } else {
                alert((res as any).message || 'Có lỗi xảy ra')
            }
        } catch (err: any) {
            alert(err.message || 'Có lỗi xảy ra')
        } finally {
            setLoading(false)
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
            {/* Hero Section */}
            <section className="relative min-h-[70vh] flex items-center">
                <div className="absolute inset-0 bg-gradient-to-br from-brk-primary/90 via-brk-primary/80 to-brk-accent/70" />
                {course.link_anh_bia && (
                    <div className="absolute inset-0">
                        <Image
                            src={course.link_anh_bia}
                            alt={course.name_lop}
                            fill
                            className="object-cover opacity-30"
                            priority
                        />
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-brk-background via-transparent to-transparent" />
                
                <div className="relative z-10 container mx-auto px-4 py-20">
                    <div className="max-w-3xl">
                        {course.category && (
                            <span className="inline-block px-4 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-white text-xs font-bold uppercase tracking-wider mb-6">
                                {course.category}
                            </span>
                        )}
                        <h1 className="text-4xl md:text-6xl font-black text-white mb-6 leading-tight">
                            {course.name_lop}
                        </h1>
                        {course.name_khoa && (
                            <div className="flex items-center gap-2 text-white/90 mb-6">
                                <GraduationCap className="w-5 h-5" />
                                <span className="font-medium">{course.name_khoa}</span>
                            </div>
                        )}
                        <div className="flex flex-wrap items-center gap-4 text-white/80 text-sm">
                            <div className="flex items-center gap-2">
                                <BookOpen className="w-5 h-5" />
                                <span>{lessons.length} bài học</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Clock className="w-5 h-5" />
                                <span>~{estimatedHours} giờ</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Users className="w-5 h-5" />
                                <span>Học viên đang học</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
            
            {/* CTA Section */}
            <section className="relative -mt-20 z-20">
                <div className="container mx-auto px-4">
                    <div className="max-w-lg ml-auto">
                        <div className="bg-brk-surface rounded-3xl shadow-2xl border border-brk-outline p-6 md:p-8">
                            {course.link_anh_bia && (
                                <div className="relative aspect-video w-full rounded-2xl overflow-hidden mb-4">
                                    <Image
                                        src={course.link_anh_bia}
                                        alt={course.name_lop}
                                        fill
                                        className="object-cover"
                                    />
                                </div>
                            )}
                            
                            <div className="mb-4">
                                <h3 className="text-xl font-black text-brk-on-surface mb-1">
                                    {course.name_lop}
                                </h3>
                                {effectivePhiCoc === 0 ? (
                                    <span className="inline-block px-3 py-1 bg-brk-accent text-brk-on-primary text-xs font-bold uppercase rounded-full">
                                        Miễn phí
                                    </span>
                                ) : (
                                    <p className="text-2xl font-black text-brk-accent">
                                        {effectivePhiCoc.toLocaleString('vi-VN')}đ
                                    </p>
                                )}
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
                                <div className="mb-4 p-3 bg-brk-accent/10 rounded-xl border border-brk-accent/30">
                                    <p className="text-brk-accent text-sm font-medium flex items-center gap-2">
                                        <span className="w-2 h-2 bg-brk-accent rounded-full animate-pulse" />
                                        Đang chờ thanh toán...
                                    </p>
                                </div>
                            )}
                            
                            {getCTAButton()}
                            
                            {!session && (
                                <p className="mt-3 text-center text-xs text-brk-muted">
                                    Đăng nhập để xem tiến độ học tập
                                </p>
                            )}
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
                                {lessons.length} bài học • ~{estimatedHours} giờ
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
                        
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {displayTestimonials.slice(0, 3).map((testimonial) => (
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
                                        <div className="w-10 h-10 rounded-full bg-brk-primary/10 flex items-center justify-center text-brk-primary font-bold">
                                            {testimonial.name.charAt(0)}
                                        </div>
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
                    </div>
                </div>
            </section>
            
            {/* Final CTA Section */}
            <section className="py-16 bg-brk-surface">
                <div className="container mx-auto px-4 text-center">
                    <div className="max-w-2xl mx-auto">
                        <h2 className="text-3xl font-black text-brk-on-surface mb-4">
                            Sẵn sàng bắt đầu?
                        </h2>
                        <p className="text-brk-muted mb-8">
                            Đăng ký ngay hôm nay để nhận hoa hồng từ người giới thiệu
                        </p>
                        {getCTAButton()}
                    </div>
                </div>
            </section>
            
            {/* Footer */}
            <footer className="py-8 text-center text-brk-muted text-sm">
                <p>© 2026 Học viện BRK. All rights reserved.</p>
            </footer>
        </div>
    )
}
