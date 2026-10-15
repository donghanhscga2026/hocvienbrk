import { createClassicCoursePage } from './mfc-classic'
import type { CoursePage, CourseSection } from '../types'

/** Mẫu nội dung có thể sửa theo từng khối; không dùng đánh giá hoặc số liệu giả. */
export function createExpertCoursePage(slug: string): CoursePage {
  const base = createClassicCoursePage(slug)
  const rich = (key: string, title: string, paragraphs: string[], order: number, cta = false): CourseSection => ({ id: `expert-${key}`, sectionKey: key, type: 'rich_content', enabled: true, sortOrder: order, visibility: 'all', anchorId: key, variant: 'section-light', content: { title, paragraphs, imagePosition: 'top', ...(cta ? { cta: { label: 'Đăng ký khóa học', action: 'open_registration' as const } } : {}) } })
  return { ...base, id: 'expert-course-template', name: 'Khóa học chuyên gia', status: 'draft', publishedAt: null,
    seo: { title: '', description: 'Khóa học chú trọng thực hành, có lộ trình rõ ràng và đồng hành từ giảng viên.' },
    theme: { primaryColor: '#236c1e', secondaryColor: '#b51a18', accentColor: '#1d5819', backgroundColor: '#fffaf0', surfaceColor: '#ffffff', textColor: '#203126', mutedTextColor: '#58675c', borderRadius: '20px', buttonRadius: '12px', containerWidth: '1120px', headingFont: 'Be Vietnam Pro' },
    navigation: { shortName: 'Khóa học của bạn', ctaText: 'Đăng ký khóa học', ctaTargetSectionId: 'dang-ky', sticky: true },
    sections: [
      { id: 'expert-hero', sectionKey: 'hero', type: 'hero', enabled: true, sortOrder: 10, visibility: 'all', anchorId: 'gioi-thieu', content: { eyebrow: 'Học để ứng dụng', title: 'Biến kiến thức thành kỹ năng thực tế', description: 'Thay nội dung này bằng kết quả cụ thể mà học viên có thể đạt được sau khóa học của bạn.', primaryCta: { label: 'Đăng ký khóa học', action: 'open_registration' }, secondaryCta: { label: 'Xem lộ trình', action: 'scroll', target: 'lo-trinh' } } },
      rich('van-de', 'Bạn đang gặp khó khăn nào?', ['Nêu vấn đề thực tế của học viên, hoàn cảnh thường gặp và điều khiến họ chưa đạt mục tiêu.'], 20),
      { id: 'expert-benefits', sectionKey: 'benefits', type: 'benefits', enabled: true, sortOrder: 30, visibility: 'all', content: { title: 'Sau khóa học, bạn có thể…', description: 'Điều chỉnh các kết quả dưới đây cho đúng nội dung và mức độ hỗ trợ của khóa học.', items: [{ id: 'b1', title: 'Hiểu nền tảng', description: 'Nắm nguyên lý để chủ động lựa chọn cách làm phù hợp.' }, { id: 'b2', title: 'Thực hành từng bước', description: 'Áp dụng kiến thức qua bài tập và tình huống cụ thể.' }, { id: 'b3', title: 'Tạo kết quả cho riêng mình', description: 'Hoàn thiện một sản phẩm hoặc kế hoạch có thể sử dụng.' }] } },
      rich('doi-tuong', 'Khóa học dành cho ai?', ['Mô tả kiến thức đầu vào, nhu cầu và thời gian học phù hợp. Nêu rõ những trường hợp khóa học chưa phù hợp.'], 40),
      { id: 'expert-roadmap', sectionKey: 'roadmap', type: 'roadmap', enabled: true, sortOrder: 50, visibility: 'all', anchorId: 'lo-trinh', content: { title: 'Lộ trình từ hiểu đến làm được', phases: [{ id: 'p1', period: 'Phần 1', title: 'Nền tảng', description: 'Hiểu khái niệm và chuẩn bị công cụ.' }, { id: 'p2', period: 'Phần 2', title: 'Thực hành', description: 'Làm theo hướng dẫn và nhận phản hồi.' }, { id: 'p3', period: 'Phần 3', title: 'Ứng dụng', description: 'Hoàn thiện bài thực hành gắn với nhu cầu riêng.' }] } },
      rich('noi-dung', 'Bạn sẽ học những gì?', ['Thay bằng nội dung các học phần và bài học thực tế của khóa. Có thể bổ sung khối Nội dung khóa học để lấy danh sách bài học.'], 60),
      { id: 'expert-teacher', sectionKey: 'instructor', type: 'instructor', enabled: true, sortOrder: 70, visibility: 'all', content: { title: 'Người đồng hành cùng bạn', instructors: [{ id: 'teacher', name: 'Tên giảng viên', role: 'Cập nhật chuyên môn của giảng viên', bio: ['Viết giới thiệu ngắn, kinh nghiệm có thể kiểm chứng và cách hỗ trợ học viên.'] }] } },
      { ...rich('phan-hoi', 'Trải nghiệm từ học viên', ['Chỉ thêm phản hồi thực tế đã được phép sử dụng. Khối này mặc định ẩn cho tới khi có nội dung.'], 80), enabled: false },
      rich('hoc-phi', 'Học phí và quyền lợi', ['Cập nhật học phí, thời hạn truy cập, hình thức hỗ trợ và tài liệu đi kèm. Giá thanh toán lấy từ cấu hình khóa học của hệ thống.'], 90, true),
      rich('cau-hoi', 'Câu hỏi thường gặp', ['Cần chuẩn bị gì? — Nêu thiết bị và kiến thức đầu vào.', 'Học theo hình thức nào? — Nêu cách truy cập bài học và lịch học nếu có.', 'Được hỗ trợ ra sao? — Nêu kênh hỗ trợ và thời gian phản hồi thực tế.', 'Có chính sách hoàn phí không? — Điền chính sách đang áp dụng, không tự tạo cam kết.'], 100),
      rich('dang-ky', 'Bắt đầu hành trình học tập của bạn', ['Đọc thông tin khóa học và chọn đăng ký khi bạn thấy phù hợp.'], 110, true),
    ],
  }
}
