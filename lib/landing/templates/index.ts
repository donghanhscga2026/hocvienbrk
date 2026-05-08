export { HeroCTATemplate } from './hero-cta'
export { FeatureGridTemplate } from './feature-grid'
export { VideoIntroTemplate } from './video-intro'
export { WebinarRegTemplate } from './webinar-reg'
export { TestimonialTemplate } from './testimonial'

export type { HeroCTATemplateProps, TemplateConfig } from './hero-cta'
export type { FeatureGridTemplateProps, FeatureItem, StatItem } from './feature-grid'
export type { VideoIntroTemplateProps } from './video-intro'
export type { WebinarRegTemplateProps } from './webinar-reg'
export type { TestimonialTemplateProps, TestimonialItem } from './testimonial'

export const TEMPLATE_OPTIONS = [
    { id: 'hero-cta', name: 'Hero + CTA', description: 'Hình ảnh lớn với nút kêu gọi hành động' },
    { id: 'feature-grid', name: 'Feature Grid', description: 'Lưới tính năng với biểu tượng' },
    { id: 'video-intro', name: 'Video Intro', description: 'Giới thiệu bằng video' },
    { id: 'webinar-reg', name: 'Webinar Registration', description: 'Form đăng ký webinar' },
    { id: 'testimonial', name: 'Testimonial', description: 'Đánh giá từ học viên' },
] as const

export type TemplateType = typeof TEMPLATE_OPTIONS[number]['id']

export const TEMPLATE_DEFAULTS: Record<TemplateType, Record<string, unknown>> = {
    'hero-cta': {
        backgroundColor: '#ffffff',
        textColor: '#1a1a1a',
        accentColor: '#2563eb',
        heroOverlay: true,
    },
    'feature-grid': {
        backgroundColor: '#ffffff',
        textColor: '#1a1a1a',
        accentColor: '#2563eb',
        cardBgColor: '#f9fafb',
    },
    'video-intro': {
        backgroundColor: '#ffffff',
        textColor: '#1a1a1a',
        accentColor: '#2563eb',
        sectionBgColor: '#f9fafb',
    },
    'webinar-reg': {
        backgroundColor: '#ffffff',
        textColor: '#1a1a1a',
        accentColor: '#2563eb',
    },
    'testimonial': {
        backgroundColor: '#ffffff',
        textColor: '#1a1a1a',
        accentColor: '#2563eb',
        sectionBgColor: '#f9fafb',
    },
}
