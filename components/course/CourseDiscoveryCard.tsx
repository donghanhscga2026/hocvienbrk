import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, BookOpen, Users } from 'lucide-react'
import CourseInstructor from './CourseInstructor'
import { isValidImageUrl } from '@/lib/image-validation'
import { catalogFee, catalogStatus, FEE_LABELS, STATUS_LABELS, type CatalogCourse, type CatalogEnrollment } from '@/lib/course-catalog'

// Thông tin ngắn đặt trong các nhãn dễ quét như thẻ tham khảo.
// Đăng ký, ưu đãi ví và thanh toán vẫn xử lý trong trang chi tiết hiện có.
export default function CourseDiscoveryCard({ course, enrollment }: { course: CatalogCourse; enrollment?: CatalogEnrollment }) {
  const detail = '/khoa-hoc/' + encodeURIComponent(course.id_khoa)
  const price = Math.max(0, Number(course.phi_coc) || 0)
  const status = catalogStatus(enrollment)
  const students = course.activeStudentCount
  return <article data-testid="discovery-card" className="flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-brk-outline bg-brk-surface shadow-sm transition-shadow hover:shadow-lg">
    <Link href={detail} className="relative block aspect-video overflow-hidden bg-brk-background">
      <Image src={isValidImageUrl(course.link_anh_bia) ? course.link_anh_bia! : '/og-image.png'} alt={course.name_lop} fill sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 33vw" className="object-cover" />
    </Link>
    <div className="flex flex-1 flex-col p-4">
      <h3 className="break-words text-base font-black leading-snug text-brk-on-surface sm:text-lg"><Link href={detail} className="line-clamp-2 hover:text-brk-primary">{course.name_lop}</Link></h3>
      <CourseInstructor name={course.teacher?.name} />
      <div aria-label="Thông tin khóa học" className="mb-4 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full bg-brk-primary/10 px-3 py-1 font-bold text-brk-primary">{price ? price.toLocaleString('vi-VN') + 'đ' : 'Không yêu cầu phí'}</span>
        <span className="rounded-full border border-brk-outline px-3 py-1 font-semibold text-brk-on-surface">{FEE_LABELS[catalogFee(course)]}</span>
        <span className="inline-flex items-center gap-1 rounded-full border border-brk-primary/30 px-3 py-1 font-semibold text-brk-primary"><BookOpen className="h-3.5 w-3.5" aria-hidden />{course._count?.lessons || 0} bài học</span>
        {students != null && <span className="inline-flex items-center gap-1 rounded-full bg-brk-background px-3 py-1 text-brk-on-surface"><Users className="h-3.5 w-3.5" aria-hidden />{students.toLocaleString('vi-VN')} học viên đang học</span>}
        {status !== 'new' && <span className="rounded-full bg-brk-background px-3 py-1 font-semibold text-brk-primary">{STATUS_LABELS[status]}</span>}
      </div>
      {price > 0 && <p className="mb-3 text-xs text-brk-muted">Phí niêm yết · Xem ưu đãi trong trang khóa học.</p>}
      <Link href={status === 'active' ? '/courses/' + encodeURIComponent(course.id_khoa) + '/learn' : detail} className="mt-auto flex min-h-11 items-center justify-center gap-2 rounded-full bg-brk-primary px-3 text-sm font-bold text-brk-on-primary">
        {status === 'active' ? 'Tiếp tục học' : 'Xem khóa học'}<ArrowRight className="h-4 w-4" aria-hidden />
      </Link>
    </div>
  </article>
}
