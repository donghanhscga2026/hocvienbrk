// Dữ liệu công khai để tìm khóa học; trạng thái học chỉ lấy của người đang đăng nhập.
export interface CatalogCourse {
  id: number
  id_khoa: string
  name_lop: string
  mo_ta_ngan?: string | null
  link_anh_bia?: string | null
  category?: string | null
  courseCategory?: { id?: number; name: string } | null
  teacher?: { id: number; name: string | null } | null
  phi_coc: number
  feeType?: string | null
  createdAt?: Date | string | null
  updatedAt?: Date | string | null
  activeStudentCount?: number
  _count?: { lessons?: number; enrollments?: number }
}

export interface CatalogEnrollment {
  status: string
  startedAt: Date | null
  completedCount: number
  totalLessons: number
  enrollmentId?: number
  hiddenFromGifts?: boolean
  payment?: { id: number; status: string; proofImage?: string | null }
}

export const FEE_LABELS: Record<string, string> = {
  MIEN_PHI: 'Miễn phí', PHI_CAM_KET: 'Phí cam kết', PHI_TUY_TINH: 'Phí tùy tâm',
  PHI_DONG_HANH: 'Phí đồng hành', PHI_TOI_THIEU: 'Phí tối thiểu', OTHER: 'Loại phí khác',
}
export const PRICE_LABELS: Record<string, string> = {
  free: 'Không yêu cầu phí', under500: 'Dưới 500.000đ', to1m: '500.000đ – 1.000.000đ', over1m: 'Trên 1.000.000đ',
}
export const STATUS_LABELS: Record<string, string> = {
  new: 'Chưa đăng ký', active: 'Đang học', completed: 'Đã hoàn thành', pending: 'Chờ kích hoạt',
}
export interface CatalogFilters {
  query: string; category: string; teacher: string; fee: string; price: string; status: string
  sort: 'updated' | 'name' | 'price-asc' | 'price-desc'
}
export const EMPTY_CATALOG_FILTERS: CatalogFilters = {
  query: '', category: '', teacher: '', fee: '', price: '', status: '', sort: 'updated',
}

// Bỏ dấu tiếng Việt để “huong”, “hương”, “Đào tạo” và “dao tao” tìm được như nhau.
export function normalizeCatalogText(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').toLowerCase().trim()
}
export function catalogCategory(course: CatalogCourse) { return course.courseCategory?.name || course.category || 'Khác' }
export function catalogFee(course: CatalogCourse) {
  const fee = course.feeType || 'MIEN_PHI'
  return FEE_LABELS[fee] ? fee : 'OTHER'
}
export function catalogStatus(enrollment?: CatalogEnrollment) {
  return enrollment?.status === 'ACTIVE' ? 'active' : enrollment?.status === 'COMPLETED' ? 'completed'
    : enrollment?.status === 'PENDING' ? 'pending' : 'new'
}
export function filterCatalog(courses: CatalogCourse[], enrollments: Record<number, CatalogEnrollment>, filters: CatalogFilters) {
  const terms = normalizeCatalogText(filters.query).split(/\s+/).filter(Boolean)
  return courses.filter(course => {
    const price = Math.max(0, Number(course.phi_coc) || 0)
    const text = normalizeCatalogText([course.name_lop, course.id_khoa, course.teacher?.name || '', catalogCategory(course)].join(' '))
    return terms.every(term => text.includes(term))
      && (!filters.category || catalogCategory(course) === filters.category)
      && (!filters.teacher || String(course.teacher?.id) === filters.teacher)
      && (!filters.fee || catalogFee(course) === filters.fee)
      && (!filters.status || catalogStatus(enrollments[course.id]) === filters.status)
      && (!filters.price || (filters.price === 'free' && price === 0)
        || (filters.price === 'under500' && price < 500_000)
        || (filters.price === 'to1m' && price >= 500_000 && price <= 1_000_000)
        || (filters.price === 'over1m' && price > 1_000_000))
  }).sort((a, b) => {
    if (filters.sort === 'name') return a.name_lop.localeCompare(b.name_lop, 'vi') || a.id - b.id
    if (filters.sort.startsWith('price')) {
      const difference = (Number(a.phi_coc) || 0) - (Number(b.phi_coc) || 0)
      return (filters.sort === 'price-desc' ? -difference : difference) || a.id - b.id
    }
    const time = (value: Date | string | null | undefined) => value ? new Date(value).getTime() || 0 : 0
    return time(b.updatedAt || b.createdAt) - time(a.updatedAt || a.createdAt) || a.id - b.id
  })
}
