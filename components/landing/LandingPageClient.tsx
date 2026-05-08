'use client'

import {
    HeroCTATemplate,
    FeatureGridTemplate,
    VideoIntroTemplate,
    WebinarRegTemplate,
    TestimonialTemplate,
} from '@/lib/landing/templates'
import CourseLandingTemplate from '@/components/landing/CourseLandingTemplate'

interface LandingPageClientProps {
    landing: any
}

export function LandingPageClient({ landing }: LandingPageClientProps) {
    const config = typeof landing.config === 'object' && landing.config !== null
        ? landing.config as Record<string, unknown>
        : {}
    
    const features = Array.isArray(config.features) 
        ? config.features as string[] 
        : []
    
    // Tăng view count (client-side)
    fetch(`/api/landing/view?id=${landing.id}`, { method: 'POST' }).catch(console.error)
    
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
                ? config.testimonials as any[]
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

interface CourseLandingClientProps {
    course: any
    lessons: any[]
    testimonials: any[]
    enrollment: any
    isCourseOneActive: boolean
    userPhone: string | null
    userId: number | null
    session: any
}

export function CourseLandingClient({
    course,
    lessons,
    testimonials,
    enrollment,
    isCourseOneActive,
    userPhone,
    userId,
    session
}: CourseLandingClientProps) {
    return (
        <CourseLandingTemplate
            course={course}
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
