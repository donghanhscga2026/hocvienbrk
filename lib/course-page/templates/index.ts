import { createWiGrowCoursePage } from './wigrow'

export const COURSE_TEMPLATE_LIBRARY = [
  {
    key: 'wigrow',
    name: 'WI.GROW',
    description: 'Landing gia đình, cha mẹ và trẻ; phong cách xanh vàng, giàu hình ảnh.',
  },
] as const

export type CourseTemplateKey = typeof COURSE_TEMPLATE_LIBRARY[number]['key']

export function createCoursePageFromTemplate(key: CourseTemplateKey, slug: string) {
  switch (key) {
    case 'wigrow':
      return createWiGrowCoursePage(slug)
    default:
      throw new Error('Mẫu không hợp lệ')
  }
}
