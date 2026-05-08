'use client'

import { useState } from 'react'
import { Calendar, Clock, Users, Video, CheckCircle } from 'lucide-react'
import { useAffiliateCookie } from '@/hooks/useAffiliateCookie'

export interface WebinarRegTemplateProps {
    title: string
    subtitle?: string
    description?: string
    webinarDate?: string
    webinarTime?: string
    webinarDuration?: string
    spotsLeft?: number
    spotsTotal?: number
    ctaText: string
    ctaLink?: string
    features?: string[]
    onRegister?: (data: { name: string; email: string; phone: string }) => Promise<void>
    config?: {
        backgroundColor?: string
        textColor?: string
        accentColor?: string
        heroImage?: string
    }
}

export function WebinarRegTemplate({
    title,
    subtitle,
    description,
    webinarDate,
    webinarTime,
    webinarDuration,
    spotsLeft,
    spotsTotal,
    ctaText,
    ctaLink = '/register',
    features = [],
    onRegister,
    config = {}
}: WebinarRegTemplateProps) {
    const { refData } = useAffiliateCookie()
    const [formData, setFormData] = useState({ name: '', email: '', phone: '' })
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const accentColor = config.accentColor || '#2563eb'

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (onRegister) {
            setIsSubmitting(true)
            try {
                await onRegister(formData)
                setSubmitted(true)
            } catch (error) {
                console.error('Registration failed:', error)
            } finally {
                setIsSubmitting(false)
            }
        }
    }

    if (submitted) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: config.backgroundColor || '#ffffff' }}>
                <div className="max-w-md text-center">
                    <div 
                        className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
                        style={{ backgroundColor: `${accentColor}20` }}
                    >
                        <CheckCircle className="w-10 h-10" style={{ color: accentColor }} />
                    </div>
                    <h1 className="text-3xl font-bold mb-4">Đăng ký thành công!</h1>
                    <p className="text-gray-600 mb-8">
                        Cảm ơn bạn đã đăng ký. Chúng tôi sẽ gửi email xác nhận trong giây lát.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen" style={{ backgroundColor: config.backgroundColor || '#ffffff' }}>
            {/* Hero Section */}
            <section className="relative py-16 md:py-24">
                {config.heroImage && (
                    <div 
                        className="absolute inset-0 bg-cover bg-center"
                        style={{ backgroundImage: `url(${config.heroImage})` }}
                    >
                        <div className="absolute inset-0 bg-black/60" />
                    </div>
                )}
                <div className={`relative z-10 container mx-auto px-4 ${config.heroImage ? 'text-white' : ''}`}>
                    <div className="max-w-3xl mx-auto text-center">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 bg-white/10">
                            <Video className="w-5 h-5" />
                            <span className="font-medium">Webinar miễn phí</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold mb-6">
                            {title}
                        </h1>
                        {subtitle && (
                            <p className="text-xl mb-8 opacity-90">
                                {subtitle}
                            </p>
                        )}
                    </div>
                </div>
            </section>

            {/* Info + Form */}
            <section className="py-12">
                <div className="container mx-auto px-4">
                    <div className="grid lg:grid-cols-2 gap-12 items-start max-w-5xl mx-auto">
                        {/* Info */}
                        <div>
                            {/* Webinar Details */}
                            <div className="bg-gray-50 rounded-2xl p-8 mb-8">
                                <h2 className="text-2xl font-bold mb-6">Thông tin webinar</h2>
                                <div className="space-y-4">
                                    {webinarDate && (
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${accentColor}15` }}>
                                                <Calendar className="w-5 h-5" style={{ color: accentColor }} />
                                            </div>
                                            <div>
                                                <div className="text-sm text-gray-500">Ngày</div>
                                                <div className="font-medium">{webinarDate}</div>
                                            </div>
                                        </div>
                                    )}
                                    {webinarTime && (
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${accentColor}15` }}>
                                                <Clock className="w-5 h-5" style={{ color: accentColor }} />
                                            </div>
                                            <div>
                                                <div className="text-sm text-gray-500">Giờ</div>
                                                <div className="font-medium">{webinarTime}</div>
                                            </div>
                                        </div>
                                    )}
                                    {webinarDuration && (
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${accentColor}15` }}>
                                                <Video className="w-5 h-5" style={{ color: accentColor }} />
                                            </div>
                                            <div>
                                                <div className="text-sm text-gray-500">Thời lượng</div>
                                                <div className="font-medium">{webinarDuration}</div>
                                            </div>
                                        </div>
                                    )}
                                    {(spotsLeft !== undefined || spotsTotal) && (
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${accentColor}15` }}>
                                                <Users className="w-5 h-5" style={{ color: accentColor }} />
                                            </div>
                                            <div>
                                                <div className="text-sm text-gray-500">Số suất</div>
                                                <div className="font-medium">
                                                    {spotsLeft !== undefined ? `${spotsLeft} suất còn lại` : `${spotsTotal} suất`}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Features */}
                            {features.length > 0 && (
                                <div>
                                    <h3 className="text-xl font-bold mb-4">Bạn sẽ học được:</h3>
                                    <div className="space-y-3">
                                        {features.map((feature, index) => (
                                            <div key={index} className="flex items-start gap-3">
                                                <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: accentColor }} />
                                                <span className="text-gray-600">{feature}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Registration Form */}
                        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
                            <h2 className="text-2xl font-bold mb-2">Đăng ký ngay</h2>
                            <p className="text-gray-500 mb-6">Điền thông tin để nhận link webinar</p>
                            
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Họ và tên
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                        placeholder="Nguyễn Văn A"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:border-transparent outline-none"
                                        placeholder="email@example.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Số điện thoại
                                    </label>
                                    <input
                                        type="tel"
                                        required
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:border-transparent outline-none"
                                        placeholder="0901 234 567"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full py-4 rounded-lg text-lg font-bold text-white transition-all hover:opacity-90 disabled:opacity-50"
                                    style={{ backgroundColor: accentColor }}
                                >
                                    {isSubmitting ? 'Đang xử lý...' : ctaText}
                                </button>
                            </form>
                            <p className="text-xs text-gray-400 text-center mt-4">
                                Đăng ký即表示 bạn đồng ý với điều khoản sử dụng
                            </p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    )
}
