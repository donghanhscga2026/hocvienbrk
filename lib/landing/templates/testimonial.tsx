'use client'

import Link from 'next/link'
import { Quote, Star, ArrowRight } from 'lucide-react'
import { useAffiliateCookie } from '@/hooks/useAffiliateCookie'

export interface TestimonialItem {
    name: string
    role?: string
    avatar?: string
    content: string
    rating?: number
    courseName?: string
}

export interface TestimonialTemplateProps {
    title: string
    subtitle?: string
    description?: string
    ctaText: string
    ctaLink?: string
    testimonials?: TestimonialItem[]
    stats?: {
        students: string
        rating: string
        courses: string
    }
    config?: {
        backgroundColor?: string
        textColor?: string
        accentColor?: string
        sectionBgColor?: string
    }
}

export function TestimonialTemplate({
    title,
    subtitle,
    description,
    ctaText,
    ctaLink = '/register',
    testimonials = [],
    stats,
    config = {}
}: TestimonialTemplateProps) {
    const { refData } = useAffiliateCookie()
    const finalCtaLink = refData?.r ? `${ctaLink}?ref=${refData.r}` : ctaLink
    const accentColor = config.accentColor || '#2563eb'

    return (
        <div className="min-h-screen" style={{ backgroundColor: config.backgroundColor || '#ffffff' }}>
            {/* Hero */}
            <section className="py-16 md:py-24 text-center">
                <div className="container mx-auto px-4">
                    <h1 
                        className="text-4xl md:text-5xl font-bold mb-6"
                        style={{ color: config.textColor || '#1a1a1a' }}
                    >
                        {title}
                    </h1>
                    {subtitle && (
                        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
                            {subtitle}
                        </p>
                    )}
                    {description && (
                        <p className="text-lg text-gray-500 mb-10 max-w-2xl mx-auto">
                            {description}
                        </p>
                    )}
                    <Link
                        href={finalCtaLink}
                        className="inline-flex items-center gap-2 px-8 py-4 rounded-lg text-lg font-bold text-white transition-transform hover:scale-105"
                        style={{ backgroundColor: accentColor }}
                    >
                        {ctaText}
                        <ArrowRight className="w-5 h-5" />
                    </Link>
                </div>
            </section>

            {/* Stats */}
            {stats && (
                <section className="py-12 border-y" style={{ backgroundColor: config.sectionBgColor || '#f9fafb' }}>
                    <div className="container mx-auto px-4">
                        <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto text-center">
                            <div>
                                <div className="text-3xl md:text-4xl font-bold mb-1" style={{ color: accentColor }}>
                                    {stats.students}
                                </div>
                                <div className="text-gray-500">Học viên</div>
                            </div>
                            <div>
                                <div className="text-3xl md:text-4xl font-bold mb-1" style={{ color: accentColor }}>
                                    {stats.rating}
                                </div>
                                <div className="text-gray-500">Đánh giá</div>
                            </div>
                            <div>
                                <div className="text-3xl md:text-4xl font-bold mb-1" style={{ color: accentColor }}>
                                    {stats.courses}
                                </div>
                                <div className="text-gray-500">Khóa học</div>
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {/* Testimonials */}
            {testimonials.length > 0 && (
                <section className="py-16 md:py-24">
                    <div className="container mx-auto px-4">
                        <h2 className="text-3xl font-bold text-center mb-12">
                            Học viên nói gì về chúng tôi
                        </h2>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {testimonials.map((testimonial, index) => (
                                <div 
                                    key={index}
                                    className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 relative"
                                >
                                    <Quote 
                                        className="absolute top-6 right-6 w-10 h-10 opacity-10"
                                        style={{ color: accentColor }}
                                    />
                                    
                                    {/* Rating */}
                                    {testimonial.rating && (
                                        <div className="flex gap-1 mb-4">
                                            {[...Array(5)].map((_, i) => (
                                                <Star
                                                    key={i}
                                                    className="w-4 h-4"
                                                    fill={i < testimonial.rating! ? accentColor : '#e5e7eb'}
                                                    style={{ color: i < testimonial.rating! ? accentColor : '#e5e7eb' }}
                                                />
                                            ))}
                                        </div>
                                    )}
                                    
                                    {/* Content */}
                                    <p className="text-gray-600 mb-6 italic">
                                        "{testimonial.content}"
                                    </p>
                                    
                                    {/* Author */}
                                    <div className="flex items-center gap-4">
                                        {testimonial.avatar ? (
                                            <img
                                                src={testimonial.avatar}
                                                alt={testimonial.name}
                                                className="w-12 h-12 rounded-full object-cover"
                                            />
                                        ) : (
                                            <div 
                                                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
                                                style={{ backgroundColor: accentColor }}
                                            >
                                                {testimonial.name.charAt(0)}
                                            </div>
                                        )}
                                        <div>
                                            <div className="font-bold">{testimonial.name}</div>
                                            {testimonial.role && (
                                                <div className="text-sm text-gray-500">{testimonial.role}</div>
                                            )}
                                            {testimonial.courseName && (
                                                <div className="text-xs" style={{ color: accentColor }}>
                                                    {testimonial.courseName}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* Final CTA */}
            <section className="py-16 md:py-24 text-center" style={{ backgroundColor: config.sectionBgColor || '#f9fafb' }}>
                <div className="container mx-auto px-4">
                    <h2 className="text-3xl md:text-4xl font-bold mb-6">
                        Trở thành học viên ngay hôm nay
                    </h2>
                    <Link
                        href={finalCtaLink}
                        className="inline-flex items-center gap-2 px-10 py-5 rounded-xl text-xl font-bold text-white transition-transform hover:scale-105 shadow-lg"
                        style={{ backgroundColor: accentColor }}
                    >
                        {ctaText}
                        <ArrowRight className="w-6 h-6" />
                    </Link>
                </div>
            </section>
        </div>
    )
}
