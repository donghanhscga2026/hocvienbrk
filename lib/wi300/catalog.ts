/** Tìm không phân biệt dấu tiếng Việt, dùng chung cho tên khóa học và giảng viên. */
export function searchText(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim()
}

type CatalogItem = { name_lop: string; phi_coc: number; teacher?: { name: string | null } | null; courseCategory?: { name: string } | null; category?: string | null }
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
