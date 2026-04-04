import Link from 'next/link'
import { Play, CheckCircle } from 'lucide-react'
import { useAffiliateCookie } from '@/hooks/useAffiliateCookie'

export interface VideoIntroTemplateProps {
    title: string
    subtitle?: string
    description?: string
    videoUrl?: string
    videoThumbnail?: string
    ctaText: string
    ctaLink?: string
    features?: string[]
    config?: {
        backgroundColor?: string
        textColor?: string
        accentColor?: string
        sectionBgColor?: string
    }
}

export function VideoIntroTemplate({
    title,
    subtitle,
    description,
    videoUrl,
    videoThumbnail,
    ctaText,
    ctaLink = '/register',
    features = [],
    config = {}
}: VideoIntroTemplateProps) {
    const { refData } = useAffiliateCookie()
    const finalCtaLink = refData?.r ? `${ctaLink}?ref=${refData.r}` : ctaLink
    const accentColor = config.accentColor || '#2563eb'

    return (
        <div className="min-h-screen" style={{ backgroundColor: config.backgroundColor || '#ffffff' }}>
            {/* Hero with Video */}
            <section className="py-16 md:py-24">
                <div className="container mx-auto px-4">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        {/* Content */}
                        <div>
                            <h1 
                                className="text-4xl md:text-5xl font-bold mb-6 leading-tight"
                                style={{ color: config.textColor || '#1a1a1a' }}
                            >
                                {title}
                            </h1>
                            {subtitle && (
                                <p className="text-xl mb-6 text-gray-600">
                                    {subtitle}
                                </p>
                            )}
                            {description && (
                                <p className="text-lg text-gray-500 mb-8">
                                    {description}
                                </p>
                            )}
                            <Link
                                href={finalCtaLink}
                                className="inline-flex items-center gap-2 px-8 py-4 rounded-lg text-lg font-bold text-white transition-transform hover:scale-105"
                                style={{ backgroundColor: accentColor }}
                            >
                                {ctaText}
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                </svg>
                            </Link>
                        </div>

                        {/* Video */}
                        <div className="relative">
                            {videoUrl ? (
                                <div className="aspect-video rounded-2xl overflow-hidden shadow-2xl bg-black">
                                    <iframe
                                        src={videoUrl}
                                        className="w-full h-full"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                    />
                                </div>
                            ) : videoThumbnail ? (
                                <div className="relative aspect-video rounded-2xl overflow-hidden shadow-2xl">
                                    <img 
                                        src={videoThumbnail} 
                                        alt="Video thumbnail"
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                        <div 
                                            className="w-20 h-20 rounded-full flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
                                            style={{ backgroundColor: accentColor }}
                                        >
                                            <Play className="w-8 h-8 text-white ml-1" />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="aspect-video rounded-2xl bg-gray-200 flex items-center justify-center">
                                    <Play className="w-16 h-16 text-gray-400" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* Features */}
            {features.length > 0 && (
                <section className="py-16" style={{ backgroundColor: config.sectionBgColor || '#f9fafb' }}>
                    <div className="container mx-auto px-4">
                        <h2 className="text-3xl font-bold text-center mb-12" style={{ color: config.textColor || '#1a1a1a' }}>
                            Bạn sẽ nhận được gì?
                        </h2>
                        <div className="max-w-2xl mx-auto space-y-4">
                            {features.map((feature, index) => (
                                <div 
                                    key={index}
                                    className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm"
                                >
                                    <CheckCircle className="w-6 h-6 flex-shrink-0" style={{ color: accentColor }} />
                                    <span className="text-lg text-gray-700">{feature}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* Final CTA */}
            <section className="py-16">
                <div className="container mx-auto px-4 text-center">
                    <h2 className="text-3xl font-bold mb-6">Đăng ký ngay hôm nay</h2>
                    <Link
                        href={finalCtaLink}
                        className="inline-block px-10 py-5 rounded-xl text-xl font-bold text-white transition-transform hover:scale-105 shadow-lg"
                        style={{ backgroundColor: accentColor }}
                    >
                        {ctaText}
                    </Link>
                </div>
            </section>
        </div>
    )
}
