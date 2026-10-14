import { createWi300GiftCoursePage } from './wi300-gift'
import { createWiGrowCoursePage } from './wigrow'
import { createClassicCoursePage } from './mfc-classic'

export const COURSE_TEMPLATE_LIBRARY = [
  {
    key: 'mfc-classic',
    name: 'MFC Classic',
    description: 'Mẫu salespage gốc đang dùng cho 100-NGAY-LAN-TOA-TRI-THUC; giữ luồng đăng ký, học viên, affiliate và thanh toán hiện tại.',
  },
  {
    key: 'wigrow',
    name: 'WI.GROW',
    description: 'Landing gia đình, cha mẹ và trẻ; phong cách xanh vàng, giàu hình ảnh.',
  },
] as const

// Giữ renderer tương thích cho trang đã lưu, nhưng không cho chọn mẫu Quà tặng mới.
export type CourseTemplateKey = typeof COURSE_TEMPLATE_LIBRARY[number]['key'] | 'wi300-gift'

export function createCoursePageFromTemplate(key: CourseTemplateKey, slug: string) {
  switch (key) {
    case 'wi300-gift':
      return createWi300GiftCoursePage(slug)
    case 'mfc-classic':
      return createClassicCoursePage(slug)
    case 'wigrow':
      return createWiGrowCoursePage(slug)
    default:
      throw new Error('Mẫu không hợp lệ')
  }
}
