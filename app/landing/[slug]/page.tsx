import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { auth } from '@/auth'
import { cookies } from 'next/headers'
import prisma from '@/lib/prisma'
import {
    HeroCTATemplate,
    FeatureGridTemplate,
    VideoIntroTemplate,
    WebinarRegTemplate,
    TestimonialTemplate,
} from '@/lib/landing/templates'
import CourseLandingTemplate from '@/components/landing/CourseLandingTemplate'
import type { 
    HeroCTATemplateProps,
    FeatureGridTemplateProps,
    VideoIntroTemplateProps,
    WebinarRegTemplateProps,
    TestimonialTemplateProps
} from '@/lib/landing/templates'

interface LandingPageProps {
    params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: LandingPageProps): Promise<Metadata> {
    const { slug } = await params
    
    const landing = await (prisma as any).landingPage.findUnique({
        where: { slug }
    })
    
    if (landing) {
        return {
            title: landing.title,
            description: landing.subtitle || landing.description || undefined,
            openGraph: {
                title: landing.title,
                description: landing.subtitle || undefined,
                images: landing.heroImage ? [landing.heroImage] : undefined,
            },
        }
    }
    
    const course = await prisma.course.findUnique({
        where: { id_khoa: slug }
    })
    
    if (course) {
        return {
            title: course.name_lop,
            description: course.mo_ta_ngan || undefined,
            openGraph: {
                title: course.name_lop,
                description: course.mo_ta_ngan || undefined,
                images: course.link_anh_bia ? [course.link_anh_bia] : undefined,
            },
        }
    }
    
    return { title: 'Không tìm thấy' }
}

export default async function LandingPage({ params }: LandingPageProps) {
    const { slug } = await params
    
    const landing = await (prisma as any).landingPage.findUnique({
        where: { 
            slug,
            isActive: true 
        },
        include: {
            course: true
        }
    })
    
    if (landing) {
        return renderLandingPage(landing, slug)
    }
    
    const course = await prisma.course.findUnique({
        where: { id_khoa: slug }
    })
    
    if (!course) {
        notFound()
    }
    
    return renderCourseLanding(slug, course)
}

async function renderCourseLanding(slug: string, courseData: any) {
    const courseId = courseData.id
    const session = await auth()
    
    let userId: number | null = null
    let userPhone: string | null = null
    
    if (session?.user?.id) {
        userId = parseInt(session.user.id)
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { phone: true }
        })
        userPhone = user?.phone || null
    }
    
    const enrollment = userId 
        ? await prisma.enrollment.findFirst({
            where: { userId, courseId }
        })
        : null
    
    const courseOneEnrollment = userId
        ? await prisma.enrollment.findFirst({
            where: { userId, courseId: 1 }
        })
        : null
    const isCourseOneActive = courseOneEnrollment?.status === 'ACTIVE'
    
    const lessons = await prisma.lesson.findMany({
        where: { courseId },
        orderBy: { order: 'asc' },
        select: { id: true, title: true, order: true }
    })
    
    const testimonials = await (prisma as any).courseTestimonial.findMany({
        where: { courseId, isActive: true },
        take: 3,
        orderBy: { isFeatured: 'desc' }
    })
    
    return (
        <CourseLandingTemplate
            course={courseData}
            lessons={lessons}
            testimonials={testimonials}
            enrollment={enrollment}
            isCourseOneActive={isCourseOneActive}
            userPhone={userPhone}
            userId={userId}
            session={session}
        />
    )
}

async function renderLandingPage(landing: any, slug: string) {
    const config = typeof landing.config === 'object' && landing.config !== null
        ? landing.config as Record<string, unknown>
        : {}
    
    const features = Array.isArray(config.features) 
        ? config.features as string[] 
        : []
    
    ;(prisma as any).landingPage.update({
        where: { id: landing.id },
        data: { viewCount: { increment: 1 } }
    }).catch(console.error)
    
    switch (landing.template) {
        case 'hero-cta':
            return (
                <HeroCTATemplate
                    title={landing.title}
                    subtitle={landing.subtitle || undefined}
                    description={landing.description || undefined}
                    heroImage={landing.heroImage || undefined}
                    ctaText={landing.ctaText}
                    ctaLink={landing.ctaLink || undefined}
                    features={features}
                    config={{
                        backgroundColor: config.backgroundColor as string | undefined,
                        textColor: config.textColor as string | undefined,
                        accentColor: config.accentColor as string | undefined,
                        heroOverlay: config.heroOverlay as boolean | undefined,
                    }}
                />
            )
            
        case 'feature-grid':
            const featureItems = features.map(f => ({
                title: f,
                icon: 'star'
            }))
            const stats = config.stats ? (config.stats as { students?: string; rating?: string; courses?: string }) : undefined
            
            return (
                <FeatureGridTemplate
                    title={landing.title}
                    subtitle={landing.subtitle || undefined}
                    description={landing.description || undefined}
                    heroImage={landing.heroImage || undefined}
                    ctaText={landing.ctaText}
                    ctaLink={landing.ctaLink || undefined}
                    features={featureItems}
                    stats={stats ? [
                        { value: stats.students || '0', label: 'Học viên' },
                        { value: stats.rating || '5.0', label: 'Đánh giá' },
                        { value: stats.courses || '0', label: 'Khóa học' },
                    ] : undefined}
                    config={{
                        backgroundColor: config.backgroundColor as string | undefined,
                        textColor: config.textColor as string | undefined,
                        accentColor: config.accentColor as string | undefined,
                        cardBgColor: config.cardBgColor as string | undefined,
                    }}
                />
            )
            
        case 'video-intro':
            return (
                <VideoIntroTemplate
                    title={landing.title}
                    subtitle={landing.subtitle || undefined}
                    description={landing.description || undefined}
                    videoUrl={config.videoUrl as string | undefined}
                    videoThumbnail={landing.heroImage || undefined}
                    ctaText={landing.ctaText}
                    ctaLink={landing.ctaLink || undefined}
                    features={features}
                    config={{
                        backgroundColor: config.backgroundColor as string | undefined,
                        textColor: config.textColor as string | undefined,
                        accentColor: config.accentColor as string | undefined,
                        sectionBgColor: config.sectionBgColor as string | undefined,
                    }}
                />
            )
            
        case 'webinar-reg':
            return (
                <WebinarRegTemplate
                    title={landing.title}
                    subtitle={landing.subtitle || undefined}
                    description={landing.description || undefined}
                    webinarDate={config.webinarDate as string | undefined}
                    webinarTime={config.webinarTime as string | undefined}
                    webinarDuration={config.webinarDuration as string | undefined}
                    spotsLeft={config.spotsLeft as number | undefined}
                    spotsTotal={config.spotsTotal as number | undefined}
                    ctaText={landing.ctaText}
                    ctaLink={landing.ctaLink || undefined}
                    features={features}
                    config={{
                        backgroundColor: config.backgroundColor as string | undefined,
                        textColor: config.textColor as string | undefined,
                        accentColor: config.accentColor as string | undefined,
                        heroImage: config.heroImage as string | undefined,
                    }}
                />
            )
            
        case 'testimonial':
            const testimonialItems = Array.isArray(config.testimonials)
                ? config.testimonials as TestimonialItem[]
                : []
            const statsData = config.stats as { students?: string; rating?: string; courses?: string } | undefined
            
            return (
                <TestimonialTemplate
                    title={landing.title}
                    subtitle={landing.subtitle || undefined}
                    description={landing.description || undefined}
                    ctaText={landing.ctaText}
                    ctaLink={landing.ctaLink || undefined}
                    testimonials={testimonialItems}
                    stats={statsData ? {
                        students: statsData.students || '1000+',
                        rating: statsData.rating || '4.9',
                        courses: statsData.courses || '10+',
                    } : undefined}
                    config={{
                        backgroundColor: config.backgroundColor as string | undefined,
                        textColor: config.textColor as string | undefined,
                        accentColor: config.accentColor as string | undefined,
                        sectionBgColor: config.sectionBgColor as string | undefined,
                    }}
                />
            )
            
        default:
            // Fallback to hero-cta
            return (
                <HeroCTATemplate
                    title={landing.title}
                    subtitle={landing.subtitle || undefined}
                    description={landing.description || undefined}
                    heroImage={landing.heroImage || undefined}
                    ctaText={landing.ctaText}
                    ctaLink={landing.ctaLink || undefined}
                    features={features}
                />
            )
    }
}

interface TestimonialItem {
    name: string
    role?: string
    avatar?: string
    content: string
    rating?: number
    courseName?: string
}
