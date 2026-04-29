'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save } from 'lucide-react'
import { TEMPLATE_OPTIONS, TEMPLATE_DEFAULTS } from '@/lib/landing/templates'

interface Course {
    id: number
    id_khoa: string
    name_lop: string
    mo_ta_ngan?: string | null
}

interface NewLandingFormProps {
    courses: Course[]
}

export function NewLandingForm({ courses }: NewLandingFormProps) {
    const router = useRouter()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    
    const [formData, setFormData] = useState({
        slug: '',
        title: '',
        subtitle: '',
        description: '',
        heroImage: '',
        ctaText: 'Đăng ký ngay',
        ctaLink: '/register',
        template: 'hero-cta',
        courseId: '',
        isActive: true,
        // Commission override
        overrideF1: '',
        overrideF2: '',
        overrideF3: '',
        // Config
        backgroundColor: '#ffffff',
        textColor: '#1a1a1a',
        accentColor: '#2563eb',
    })
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)
        setError(null)
        
        try {
            const response = await fetch('/api/landing', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    slug: formData.slug,
                    title: formData.title,
                    subtitle: formData.subtitle || undefined,
                    description: formData.description || undefined,
                    heroImage: formData.heroImage || undefined,
                    ctaText: formData.ctaText,
                    ctaLink: formData.ctaLink || undefined,
                    template: formData.template,
                    courseId: formData.courseId ? parseInt(formData.courseId) : undefined,
                    isActive: formData.isActive,
                    customCommission: (formData.overrideF1 || formData.overrideF2 || formData.overrideF3) ? {
                        f1: parseFloat(formData.overrideF1) || 10,
                        f2: parseFloat(formData.overrideF2) || 5,
                        f3: parseFloat(formData.overrideF3) || 2,
                    } : undefined,
                    config: {
                        backgroundColor: formData.backgroundColor,
                        textColor: formData.textColor,
                        accentColor: formData.accentColor,
                    }
                })
            })
            
            const data = await response.json()
            
            if (data.success) {
                router.push('/admin/landings')
                router.refresh()
            } else {
                setError(data.error || 'Có lỗi xảy ra')
            }
        } catch (err) {
            setError('Có lỗi xảy ra. Vui lòng thử lại.')
        } finally {
            setIsSubmitting(false)
        }
    }
    
    return (
        <form onSubmit={handleSubmit} className="max-w-3xl">
            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                    {error}
                </div>
            )}
            
            <div className="space-y-6">
                {/* Basic Info */}
                <div className="bg-white border rounded-lg p-6">
                    <h2 className="text-lg font-semibold mb-4">Thông tin cơ bản</h2>
                    
                    <div className="grid gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                URL Slug <span className="text-red-500">*</span>
                            </label>
                            <div className="flex items-center">
                                <span className="px-3 py-2 bg-gray-100 border border-r-0 rounded-l-lg text-gray-500 text-sm">
                                    /
                                </span>
                                <input
                                    type="text"
                                    required
                                    value={formData.slug}
                                    onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                                    className="flex-1 px-3 py-2 border rounded-r-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="-hocxaykenh"
                                />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                URL: /{formData.slug || '{slug}'}
                            </p>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Tiêu đề <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Khóa học TikTok Marketing"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Phụ đề
                            </label>
                            <input
                                type="text"
                                value={formData.subtitle}
                                onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Học cách xây dựng kênh TikTok từ A-Z"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Mô tả
                            </label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows={3}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Mô tả chi tiết về khóa học..."
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Link ảnh Hero
                            </label>
                            <input
                                type="url"
                                value={formData.heroImage}
                                onChange={(e) => setFormData({ ...formData, heroImage: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="https://example.com/hero-image.jpg"
                            />
                        </div>
                    </div>
                </div>
                
                {/* Template */}
                <div className="bg-white border rounded-lg p-6">
                    <h2 className="text-lg font-semibold mb-4">Template</h2>
                    
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {TEMPLATE_OPTIONS.map((t) => (
                            <label
                                key={t.id}
                                className={`cursor-pointer rounded-lg border-2 p-4 text-center transition-all ${
                                    formData.template === t.id
                                        ? 'border-blue-500 bg-blue-50'
                                        : 'border-gray-200 hover:border-gray-300'
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="template"
                                    value={t.id}
                                    checked={formData.template === t.id}
                                    onChange={(e) => {
                                        const defaults = TEMPLATE_DEFAULTS[e.target.value as keyof typeof TEMPLATE_DEFAULTS]
                                        setFormData({
                                            ...formData,
                                            template: e.target.value,
                                            ...(defaults ? {
                                                backgroundColor: String(defaults.backgroundColor || '#ffffff'),
                                                textColor: String(defaults.textColor || '#1a1a1a'),
                                                accentColor: String(defaults.accentColor || '#2563eb'),
                                            } : {})
                                        })
                                    }}
                                    className="sr-only"
                                />
                                <span className="font-medium text-sm">{t.name}</span>
                            </label>
                        ))}
                    </div>
                </div>
                
                {/* CTA */}
                <div className="bg-white border rounded-lg p-6">
                    <h2 className="text-lg font-semibold mb-4">Nút kêu gọi (CTA)</h2>
                    
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Text nút
                            </label>
                            <input
                                type="text"
                                value={formData.ctaText}
                                onChange={(e) => setFormData({ ...formData, ctaText: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Đăng ký ngay"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Link đích
                            </label>
                            <input
                                type="text"
                                value={formData.ctaLink}
                                onChange={(e) => setFormData({ ...formData, ctaLink: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="/register"
                            />
                        </div>
                    </div>
                </div>
                
                {/* Colors */}
                <div className="bg-white border rounded-lg p-6">
                    <h2 className="text-lg font-semibold mb-4">Màu sắc</h2>
                    
                    <div className="grid gap-4 md:grid-cols-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Màu nền
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="color"
                                    value={formData.backgroundColor}
                                    onChange={(e) => setFormData({ ...formData, backgroundColor: e.target.value })}
                                    className="w-10 h-10 border rounded cursor-pointer"
                                />
                                <input
                                    type="text"
                                    value={formData.backgroundColor}
                                    onChange={(e) => setFormData({ ...formData, backgroundColor: e.target.value })}
                                    className="flex-1 px-3 py-2 border rounded-lg font-mono text-sm"
                                />
                            </div>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Màu text
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="color"
                                    value={formData.textColor}
                                    onChange={(e) => setFormData({ ...formData, textColor: e.target.value })}
                                    className="w-10 h-10 border rounded cursor-pointer"
                                />
                                <input
                                    type="text"
                                    value={formData.textColor}
                                    onChange={(e) => setFormData({ ...formData, textColor: e.target.value })}
                                    className="flex-1 px-3 py-2 border rounded-lg font-mono text-sm"
                                />
                            </div>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Màu accent
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="color"
                                    value={formData.accentColor}
                                    onChange={(e) => setFormData({ ...formData, accentColor: e.target.value })}
                                    className="w-10 h-10 border rounded cursor-pointer"
                                />
                                <input
                                    type="text"
                                    value={formData.accentColor}
                                    onChange={(e) => setFormData({ ...formData, accentColor: e.target.value })}
                                    className="flex-1 px-3 py-2 border rounded-lg font-mono text-sm"
                                />
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Commission Override */}
                <div className="bg-white border rounded-lg p-6">
                    <h2 className="text-lg font-semibold mb-4">Override Hoa hồng (tùy chọn)</h2>
                    <p className="text-sm text-gray-500 mb-4">
                        Để trống nếu muốn sử dụng cấu hình campaign mặc định
                    </p>
                    
                    <div className="grid gap-4 md:grid-cols-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                F1 (%)
                            </label>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                value={formData.overrideF1}
                                onChange={(e) => setFormData({ ...formData, overrideF1: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="10"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                F2 (%)
                            </label>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                value={formData.overrideF2}
                                onChange={(e) => setFormData({ ...formData, overrideF2: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="5"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                F3 (%)
                            </label>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                value={formData.overrideF3}
                                onChange={(e) => setFormData({ ...formData, overrideF3: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="2"
                            />
                        </div>
                    </div>
                </div>
                
                {/* Status */}
                <div className="bg-white border rounded-lg p-6">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={formData.isActive}
                            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                            className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="font-medium">Kích hoạt</span>
                    </label>
                </div>
            </div>
            
            {/* Actions */}
            <div className="flex items-center justify-end gap-4 mt-6">
                <Link
                    href="/tools/landings"
                    className="px-6 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                    Hủy
                </Link>
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                    <Save className="w-4 h-4" />
                    {isSubmitting ? 'Đang lưu...' : 'Lưu'}
                </button>
            </div>
        </form>
    )
}
