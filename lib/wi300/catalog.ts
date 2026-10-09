/** Tìm không phân biệt dấu tiếng Việt, dùng chung cho tên khóa học và giảng viên. */
export function searchText(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim()
}

type CatalogItem = { name_lop: string; phi_coc: number; teacher?: { name: string | null } | null; courseCategory?: { name: string } | null; category?: string | null }
type LearningEnrollment = { courseId: number; status: string; completedCount: number; totalLessons: number; lastStudiedAt?: Date | string | null; hiddenFromGifts: boolean }
export function recentActiveCourses<T extends { id: number }>(courses: T[], enrollments: LearningEnrollment[], limit = 3) {
  const byId = new Map(courses.map(course => [course.id, course]))
  return enrollments.filter(row => row.status === 'ACTIVE' && !row.hiddenFromGifts && !(row.totalLessons > 0 && row.completedCount >= row.totalLessons) && byId.has(row.courseId))
    .sort((a, b) => (b.lastStudiedAt ? new Date(b.lastStudiedAt).getTime() : 0) - (a.lastStudiedAt ? new Date(a.lastStudiedAt).getTime() : 0) || b.courseId - a.courseId)
    .slice(0, limit).map(row => byId.get(row.courseId)!)
}

export const categoryName = (course: CatalogItem) => course.courseCategory?.name || course.category || 'Khác'

export function filterCourses<T extends CatalogItem>(courses: T[], query: string, category: string, fee: string) {
  const needle = searchText(query)
  return courses.filter(course =>
    (!category || categoryName(course) === category) &&
    (fee !== 'free' || course.phi_coc === 0) &&
    (fee !== 'paid' || course.phi_coc > 0) &&
    (!needle || searchText([course.name_lop, course.teacher?.name || '', categoryName(course)].join(' ')).includes(needle)),
  )
}
