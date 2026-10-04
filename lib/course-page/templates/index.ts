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

export type CourseTemplateKey = typeof COURSE_TEMPLATE_LIBRARY[number]['key']

export function createCoursePageFromTemplate(key: CourseTemplateKey, slug: string) {
  switch (key) {
    case 'mfc-classic':
      return createClassicCoursePage(slug)
    case 'wigrow':
      return createWiGrowCoursePage(slug)
    default:
      throw new Error('Mẫu không hợp lệ')
  }
}
