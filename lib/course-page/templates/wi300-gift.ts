import type { CoursePage } from '../types'

// Mẫu hệ thống dạng section: sửa chữ/ảnh trực tiếp và dùng đăng ký hiện có.
export function createWi300GiftCoursePage(slug: string): CoursePage {
  const now = new Date().toISOString()
  const base = { enabled: true, visibility: 'all' as const, variant: 'wi300-gift' }
  return {
    id: 'wi300-gift-template', slug, name: '99+ Quà Tặng Từ Hương Lucy', status: 'draft',
    createdAt: now, updatedAt: now, publishedAt: null, useTemplate: true,
    seo: { title: '99+ Quà Tặng Từ Hương Lucy', description: 'Khám phá những bài học giúp bạn hiểu mình và sống tích cực mỗi ngày.' },
    theme: { primaryColor: '#184f43', secondaryColor: '#d7b56d', accentColor: '#256653', backgroundColor: '#f8f7f2', surfaceColor: '#ffffff', textColor: '#173e35', mutedTextColor: '#56675e', borderColor: '#e0e7dd', borderRadius: '20px', buttonRadius: '12px', containerWidth: '1120px' },
    navigation: { shortName: 'Wi300', ctaText: 'Đăng ký khóa học', ctaTargetSectionId: 'dang-ky', showProgress: false, sticky: true },
    checkoutConfig: { enabled: true, provider: 'vietqr', currency: 'VND', paymentDescriptionPrefix: 'WI300', orderExpirationMinutes: 15, registrationFields: [{ name: 'fullName', label: 'Họ và tên', type: 'text', required: true }, { name: 'phone', label: 'Số điện thoại', type: 'tel', required: true }, { name: 'email', label: 'Email', type: 'email', required: false }], successMode: 'show_message' },
    sections: [
      { ...base, id: 'gift-hero', sectionKey: 'gift-hero', type: 'hero', anchorId: 'gioi-thieu', sortOrder: 1, content: { eyebrow: 'Món quà dành cho bạn', title: '99+ Quà Tặng Từ Hương Lucy', description: 'Khám phá những bài học giúp bạn hiểu mình và sống tích cực mỗi ngày.', imageUrl: '/images/course-gift.svg', imageAlt: 'Hộp quà với nơ xanh', primaryCta: { label: 'Đăng ký khóa học', action: 'open_registration' } } },
      { ...base, id: 'gift-benefits', sectionKey: 'gift-benefits', type: 'benefits', sortOrder: 2, content: { title: 'Bạn sẽ nhận được gì?', items: [{ id: 'gift-learning', icon: '🎁', title: 'Bài học giá trị', description: 'Khám phá kiến thức và những trải nghiệm có thể áp dụng vào cuộc sống.' }, { id: 'gift-growth', icon: '🌱', title: 'Phát triển bản thân', description: 'Hiểu mình hơn, xây dựng thói quen tích cực và sống chủ động.' }, { id: 'gift-community', icon: '🤝', title: 'Cộng đồng đồng hành', description: 'Kết nối với những người cùng học, cùng thực hành và chia sẻ.' }] } },
      { ...base, id: 'gift-content', sectionKey: 'gift-content', type: 'rich_content', sortOrder: 3, content: { eyebrow: 'Học theo nhịp của bạn', title: 'Nội dung khóa học', description: 'Thay phần giới thiệu này bằng nội dung thực tế của khóa học.', paragraphs: ['Giới thiệu các chủ đề chính và cách học viên có thể bắt đầu.', 'Nêu rõ hình thức học, tài liệu và các hoạt động thực hành.'] } },
      { ...base, id: 'gift-instructor', sectionKey: 'gift-instructor', type: 'instructor', sortOrder: 4, content: { title: 'Người đồng hành cùng bạn', instructors: [{ id: 'gift-teacher', name: 'Tên giảng viên', role: 'Chuyên gia / Giảng viên', bio: ['Thay bằng giới thiệu, kinh nghiệm và thông điệp của giảng viên.'] }] } },
      { ...base, id: 'gift-testimonials', sectionKey: 'gift-testimonials', type: 'rich_content', variant: 'wi300-gift-testimonials', enabled: false, sortOrder: 5, content: { title: 'Cảm nhận học viên', description: 'Chỉ bật khối này khi có cảm nhận thực tế của học viên.', paragraphs: [] } },
      { ...base, id: 'gift-pricing', sectionKey: 'gift-pricing', type: 'pricing', anchorId: 'dang-ky', sortOrder: 6, content: { title: 'Bắt đầu hành trình của bạn', plans: [{ id: 'gift-plan', name: 'Tham gia khóa học', price: 0, currency: 'VND', description: 'Điều chỉnh nội dung gói theo khóa học của bạn. Mức phí thực tế được xác nhận trong bước đăng ký.', ctaText: 'Đăng ký khóa học', features: ['Học trực tuyến theo thời gian phù hợp', 'Truy cập nội dung của khóa học'], featured: false }], paymentNote: 'Thông tin phí và điều kiện tham gia được xác nhận khi đăng ký.' } },
      { ...base, id: 'gift-closing', sectionKey: 'gift-closing', type: 'closing_message', sortOrder: 7, content: { title: 'Một thay đổi nhỏ, một khởi đầu mới', paragraphs: ['Bắt đầu từ bài học phù hợp với bạn hôm nay.'], signature: 'Wi300' } },
    ],
  }
}
