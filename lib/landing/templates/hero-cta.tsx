'use client'

import Link from 'next/link'
import { Check } from 'lucide-react'
import { useAffiliateCookie } from '@/hooks/useAffiliateCookie'

export interface TemplateConfig {
    backgroundColor?: string
    textColor?: string
    accentColor?: string
    heroOverlay?: boolean
}

export interface HeroCTATemplateProps {
    title: string
    subtitle?: string
    description?: string
    heroImage?: string
    ctaText: string
    ctaLink?: string
    features?: string[]
    config?: TemplateConfig
}

export function HeroCTATemplate({
    title,
    subtitle,
    description,
    heroImage,
    ctaText,
    ctaLink = '/register',
    features = [],
    config = {}
}: HeroCTATemplateProps) {
    const { refData } = useAffiliateCookie()
    const finalCtaLink = refData?.r ? `${ctaLink}?ref=${refData.r}` : ctaLink

    return (
        <div className="min-h-screen" style={{ backgroundColor: config.backgroundColor || '#ffffff' }}>
            {/* Hero Section */}
            <section className="relative min-h-[70vh] flex items-center">
                {heroImage && (
                    <div 
                        className="absolute inset-0 bg-cover bg-center"
                        style={{ 
                            backgroundImage: `url(${heroImage})`,
                        }}
                    >
                        {config.heroOverlay !== false && (
                            <div className="absolute inset-0 bg-black/50" />
                        )}
                    </div>
                )}
                <div className={`relative z-10 container mx-auto px-4 py-20 ${heroImage ? 'text-white' : ''}`}
                    style={{ color: heroImage ? undefined : (config.textColor || '#1a1a1a') }}
                >
                    <div className="max-w-3xl">
                        <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
                            {title}
                        </h1>
                        {subtitle && (
                            <p className="text-xl md:text-2xl mb-8 opacity-90">
                                {subtitle}
                            </p>
                        )}
                        {description && (
                            <p className="text-lg mb-8 opacity-80">
                                {description}
                            </p>
                        )}
                        <Link
                            href={finalCtaLink}
                            className="inline-block px-8 py-4 rounded-lg text-lg font-bold text-white transition-transform hover:scale-105"
                            style={{ backgroundColor: config.accentColor || '#2563eb' }}
                        >
                            {ctaText}
                        </Link>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            {features.length > 0 && (
                <section className="py-16 bg-gray-50">
                    <div className="container mx-auto px-4">
                        <div className="grid md:grid-cols-3 gap-8">
                            {features.map((feature, index) => (
                                <div 
                                    key={index} 
                                    className="flex items-start gap-4 p-6 bg-white rounded-xl shadow-sm"
                                >
                                    <div 
                                        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                                        style={{ backgroundColor: `${config.accentColor || '#2563eb'}15` }}
                                    >
                                        <Check 
                                            className="w-5 h-5" 
                                            style={{ color: config.accentColor || '#2563eb' }} 
                                        />
                                    </div>
                                    <p className="text-lg font-medium text-gray-700">{feature}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* CTA Section */}
            <section className="py-16">
                <div className="container mx-auto px-4 text-center">
                    <Link
                        href={finalCtaLink}
                        className="inline-block px-10 py-5 rounded-xl text-xl font-bold text-white transition-transform hover:scale-105 shadow-lg"
                        style={{ backgroundColor: config.accentColor || '#2563eb' }}
                    >
                        {ctaText}
                    </Link>
                </div>
            </section>
        </div>
    )
}
