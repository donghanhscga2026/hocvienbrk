import Link from 'next/link'
import { Star, Users, TrendingUp, Award, Zap, Shield } from 'lucide-react'
import { useAffiliateCookie } from '@/hooks/useAffiliateCookie'

export interface FeatureGridTemplateProps {
    title: string
    subtitle?: string
    description?: string
    heroImage?: string
    ctaText: string
    ctaLink?: string
    features?: FeatureItem[]
    stats?: StatItem[]
    config?: {
        backgroundColor?: string
        textColor?: string
        accentColor?: string
        cardBgColor?: string
    }
}

export interface FeatureItem {
    icon?: string
    title: string
    description?: string
}

export interface StatItem {
    value: string
    label: string
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
    star: Star,
    users: Users,
    trending: TrendingUp,
    award: Award,
    zap: Zap,
    shield: Shield,
}

export function FeatureGridTemplate({
    title,
    subtitle,
    description,
    heroImage,
    ctaText,
    ctaLink = '/register',
    features = [],
    stats = [],
    config = {}
}: FeatureGridTemplateProps) {
    const { refData } = useAffiliateCookie()
    const finalCtaLink = refData?.r ? `${ctaLink}?ref=${refData.r}` : ctaLink
    const accentColor = config.accentColor || '#2563eb'

    return (
        <div className="min-h-screen" style={{ backgroundColor: config.backgroundColor || '#ffffff' }}>
            {/* Header */}
            <section className="py-16 md:py-24">
                <div className="container mx-auto px-4">
                    <div className="max-w-3xl mx-auto text-center">
                        <h1 
                            className="text-4xl md:text-5xl font-bold mb-6"
                            style={{ color: config.textColor || '#1a1a1a' }}
                        >
                            {title}
                        </h1>
                        {subtitle && (
                            <p className="text-xl md:text-2xl mb-6 text-gray-600">
                                {subtitle}
                            </p>
                        )}
                        {description && (
                            <p className="text-lg text-gray-500 mb-10">
                                {description}
                            </p>
                        )}
                        <Link
                            href={finalCtaLink}
                            className="inline-block px-8 py-4 rounded-lg text-lg font-bold text-white transition-transform hover:scale-105"
                            style={{ backgroundColor: accentColor }}
                        >
                            {ctaText}
                        </Link>
                    </div>
                </div>
            </section>

            {/* Stats */}
            {stats.length > 0 && (
                <section className="py-12 border-y border-gray-100">
                    <div className="container mx-auto px-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                            {stats.map((stat, index) => (
                                <div key={index} className="text-center">
                                    <div 
                                        className="text-3xl md:text-4xl font-bold mb-2"
                                        style={{ color: accentColor }}
                                    >
                                        {stat.value}
                                    </div>
                                    <div className="text-gray-500">{stat.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* Features Grid */}
            {features.length > 0 && (
                <section className="py-16 md:py-24">
                    <div className="container mx-auto px-4">
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {features.map((feature, index) => {
                                const IconComponent = feature.icon ? ICON_MAP[feature.icon] || Star : Star
                                return (
                                    <div 
                                        key={index}
                                        className="p-8 rounded-2xl transition-all hover:shadow-lg"
                                        style={{ 
                                            backgroundColor: config.cardBgColor || '#f9fafb',
                                        }}
                                    >
                                        <div 
                                            className="w-14 h-14 rounded-xl flex items-center justify-center mb-5"
                                            style={{ backgroundColor: `${accentColor}15` }}
                                        >
                                            <IconComponent className="w-7 h-7" style={{ color: accentColor }} />
                                        </div>
                                        <h3 className="text-xl font-bold mb-3" style={{ color: config.textColor || '#1a1a1a' }}>
                                            {feature.title}
                                        </h3>
                                        {feature.description && (
                                            <p className="text-gray-600">{feature.description}</p>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </section>
            )}

            {/* Final CTA */}
            <section className="py-16 md:py-24 bg-gray-50">
                <div className="container mx-auto px-4 text-center">
                    <h2 className="text-3xl font-bold mb-6">Sẵn sàng bắt đầu?</h2>
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
