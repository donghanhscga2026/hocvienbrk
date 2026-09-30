'use client'

import { ComponentProps, useEffect } from 'react'
import type { LandingPage } from '@prisma/client'
import type { TestimonialItem } from '@/lib/landing/templates/testimonial'
import {
    HeroCTATemplate,
    FeatureGridTemplate,
    VideoIntroTemplate,
    WebinarRegTemplate,
    TestimonialTemplate,
} from '@/lib/landing/templates'
import CourseLandingTemplate from '@/components/landing/CourseLandingTemplate'
import CrmLeadForm, { submitCrmLead } from '@/components/crm/CrmLeadForm'

interface LandingPageClientProps {
    landing: LandingPage
}

export function LandingPageClient({ landing }: LandingPageClientProps) {
    const config = landing.config && typeof landing.config === 'object' && !Array.isArray(landing.config) ? landing.config : {}
    return <><LandingPageContent landing={landing} />{config.crmCapture === true && landing.template !== 'webinar-reg' && <CrmLeadForm slug={landing.slug} />}</>
}

function LandingPageContent({ landing }: LandingPageClientProps) {
    const config = typeof landing.config === 'object' && landing.config !== null
        ? landing.config as Record<string, unknown>
        : {}
    
    const features = Array.isArray(config.features) 
        ? config.features as string[] 
        : []
    
    // Tăng view count (client-side)
    useEffect(() => { fetch(`/api/landing/view?id=${landing.id}`, { method: 'POST' }).catch(console.error) }, [landing.id])
    
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
                        { value: stats.students || '0', label: 'Thành viên' },
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
                    onRegister={config.crmCapture === true ? data => submitCrmLead(landing.slug, data) : undefined}
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

type CourseLandingClientProps = ComponentProps<typeof CourseLandingTemplate>

export function CourseLandingClient({
    course,
    lessons,
    testimonials,
    enrollment,
    userPhone,
    userId,
    session,
    totalHours,
    activeStudentCount
}: CourseLandingClientProps) {
    return (
        <CourseLandingTemplate
            course={course}
            lessons={lessons}
            testimonials={testimonials}
            enrollment={enrollment}
            userPhone={userPhone}
            userId={userId}
            session={session}
            totalHours={totalHours}
            activeStudentCount={activeStudentCount}
        />
    )
}
