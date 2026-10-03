import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, BookOpen } from 'lucide-react'
import CourseInstructor from './CourseInstructor'
import { isValidImageUrl } from '@/lib/image-validation'
import { catalogFee, catalogStatus, FEE_LABELS, STATUS_LABELS, type CatalogCourse, type CatalogEnrollment } from '@/lib/course-catalog'

// Thẻ khám phá chỉ đưa thông tin cần để chọn khóa.
// Đăng ký, ưu đãi ví và thanh toán vẫn xử lý trong trang chi tiết hiện có.
export default function CourseDiscoveryCard({ course, enrollment }: { course: CatalogCourse; enrollment?: CatalogEnrollment }) {
  const detail = '/khoa-hoc/' + encodeURIComponent(course.id_khoa)
  const price = Math.max(0, Number(course.phi_coc) || 0)
  const status = catalogStatus(enrollment)
  return <article data-testid="discovery-card" className="flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-brk-outline bg-brk-surface transition-shadow hover:shadow-lg">
    <Link href={detail} className="relative block aspect-video overflow-hidden bg-brk-background">
      <Image src={isValidImageUrl(course.link_anh_bia) ? course.link_anh_bia! : '/og-image.png'} alt={course.name_lop} fill sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 33vw" className="object-cover" />
    </Link>
    <div className="flex flex-1 flex-col p-4">
      <h3 className="break-words text-base font-bold leading-snug text-brk-on-surface sm:text-lg"><Link href={detail} className="line-clamp-2 hover:text-brk-primary">{course.name_lop}</Link></h3>
      <CourseInstructor name={course.teacher?.name} />
      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-brk-muted">
        <span className="inline-flex items-center gap-1"><BookOpen className="h-4 w-4" aria-hidden />{course._count?.lessons || 0} bài học</span>
        {status !== 'new' && <span className="font-semibold text-brk-primary">{STATUS_LABELS[status]}</span>}
      </div>
      <div className="mt-auto border-t border-brk-outline pt-3">
        <p className="font-bold text-brk-on-surface">{price ? price.toLocaleString('vi-VN') + 'đ' : 'Không yêu cầu phí'}</p>
        <p className="mt-1 text-xs text-brk-muted">{FEE_LABELS[catalogFee(course)]}{price > 0 ? ' · Phí niêm yết' : ''}</p>
        <Link href={status === 'active' ? '/courses/' + encodeURIComponent(course.id_khoa) + '/learn' : detail} className="mt-3 flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brk-primary px-3 text-sm font-semibold text-brk-on-primary">
          {status === 'active' ? 'Tiếp tục học' : 'Xem khóa học'}<ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </div>
  </article>
}
