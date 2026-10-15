import Link from 'next/link'
import Image from 'next/image'
import type { Prisma } from '@prisma/client'
import type { LearningProfile } from '@/lib/learning-profile/service'
import { learningProfileHref } from '@/lib/learning-profile/shared'

const button = 'inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50'
const card = 'rounded-2xl border border-slate-200 bg-white p-4 sm:p-6'
const labels: Record<string, string> = { ACTIVE: 'Đã kích hoạt', PENDING: 'Chờ kích hoạt', REJECTED: 'Chưa được duyệt', CANCELLED: 'Đã hủy' }
const date = (value: Date | null) => value ? new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short' }).format(value) : 'Chưa có hoạt động được ghi nhận'
function record(value: Prisma.JsonValue | null): Prisma.JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}
function safeLinks(value: Prisma.JsonValue | undefined) {
  return Array.isArray(value) ? value.filter((item): item is string => {
    if (typeof item !== 'string') return false
    try { const url = new URL(item); return url.protocol === 'https:' && !url.username && !url.password } catch { return false }
  }).slice(0, 10) : []
}

/** Server-rendered, responsive view. All data was scoped before reaching here. */
export default function LearningProfileView({ data }: { data: LearningProfile }) {
  const { student, selected } = data
  const root = learningProfileHref(student.id)
  const href = (page: number, course?: number, lessonPage = 1) => root + '?' + new URLSearchParams({ page: String(page), ...(course == null ? {} : { course: String(course), lessonPage: String(lessonPage) }) })
  const coursePages = Math.max(1, Math.ceil(data.totalCourses / data.pageSize))
  const lessonPages = selected ? Math.max(1, Math.ceil(selected.totalLessons / selected.lessonPageSize)) : 1
  const scope = data.viewer === 'admin' ? 'Quản trị viên · Tất cả khóa học' : data.viewer === 'self' ? 'Hồ sơ học tập của bạn' : 'Chỉ các lớp bạn đang phụ trách'
  return <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-5 text-slate-800 sm:px-6 sm:py-8">
    <nav aria-label="Đường dẫn hồ sơ học tập" className="flex flex-wrap items-center gap-2 text-sm text-slate-500"><Link href="/my-space" className="min-h-11 content-center text-emerald-800 hover:underline">Không gian của tôi</Link><span aria-hidden="true">/</span><span>Hồ sơ học tập</span></nav>
    <header className={card + ' flex flex-wrap items-center gap-4 border-emerald-100 bg-gradient-to-br from-emerald-50 to-white'}>
      {student.image?.startsWith('https://') ? <Image src={student.image} alt="" width={80} height={80} unoptimized className="h-20 w-20 shrink-0 rounded-2xl object-cover" /> : <span aria-hidden="true" className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-3xl font-bold text-emerald-800">{student.name?.charAt(0) || '#'}</span>}
      <div className="min-w-0 flex-1"><p className="text-sm font-medium text-emerald-800">{scope}</p><h1 className="mt-1 break-words text-2xl font-bold sm:text-3xl">{student.name || 'Thành viên #' + student.id}</h1><p className="mt-2 break-words text-sm text-slate-500">Mã thành viên #{student.id} · Hồ sơ nội bộ</p><div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 break-all text-sm">{student.email && <span>{student.email}</span>}{student.phone && <span>{student.phone}</span>}</div></div>
      <div className="rounded-xl bg-white p-4"><p className="text-3xl font-bold text-emerald-800">{data.totalCourses}</p><p className="text-xs text-slate-500">khóa trong phạm vi được xem</p></div>
    </header>
    {data.viewer === 'admin' && <Link className={button} href={'/tools/students/' + student.id}>Quản trị thành viên</Link>}
    <p className="text-sm leading-6 text-slate-500">Đăng ký khóa học, hoàn thành bài học và nộp bài tập là các chỉ số riêng. Dữ liệu học được giữ theo mã tài khoản khi đổi vai trò.</p>
    <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(260px,340px)_minmax(0,1fr)]">
      <aside className="min-w-0 space-y-3" aria-label="Khóa học được phép xem">
        <h2 className="text-lg font-bold">Khóa học</h2>
        {!data.courses.length && <p className={card}>{data.totalCourses ? 'Không có khóa ở trang này. Hãy quay lại trang trước.' : 'Chưa có đăng ký khóa học trong phạm vi được xem.'}</p>}
        {data.courses.map(course => {
          const percent = course.total ? Math.min(100, Math.round(course.completed / course.total * 100)) : 0
          return <Link key={course.id} href={href(data.page, course.courseId)} aria-current={selected?.courseId === course.courseId ? 'page' : undefined} className={'block space-y-3 rounded-2xl border p-4 ' + (selected?.courseId === course.courseId ? 'border-emerald-600 bg-emerald-50' : 'border-slate-200 bg-white hover:border-emerald-300')}>
            <h3 className="break-words font-semibold">{course.course.name_lop}</h3><p className="text-xs text-slate-500">{labels[course.status] || course.status}</p>
            <div className="flex items-center justify-between gap-2 text-sm"><span>{course.completed}/{course.total} bài hoàn thành</span><strong>{percent}%</strong></div>
            <progress aria-label={'Tiến độ ' + course.course.name_lop} value={percent} max={100} className="h-2 w-full accent-emerald-700" />
            <p className="text-xs text-slate-600">{course.submitted} bài đã nộp</p><p className="text-xs leading-5 text-slate-500">Gần nhất: {date(course.lastActivityAt)}</p>
          </Link>
        })}
        {coursePages > 1 && <nav aria-label="Phân trang khóa học" className="flex flex-wrap items-center gap-2">{data.page > 1 && <Link className={button} href={href(data.page - 1)}>Trước</Link>}<span className="text-xs">Trang {data.page}/{coursePages}</span>{data.page < coursePages && <Link className={button} href={href(data.page + 1)}>Sau</Link>}</nav>}
      </aside>
      <div className="min-w-0 space-y-5">
        {selected ? <>
          <section className={card + ' space-y-4'} aria-labelledby="selected-course-title">
            <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="text-sm text-emerald-800">{labels[selected.status] || selected.status}</p><h2 id="selected-course-title" className="mt-1 break-words text-xl font-bold">{selected.course.name_lop}</h2></div><Link className={button} href={'/khoa-hoc/' + encodeURIComponent(selected.course.id_khoa)}>Mở khóa học</Link></div>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">{[{ label: 'Bài hoàn thành', value: selected.completed + '/' + selected.total }, { label: 'Bài đã nộp', value: String(selected.submitted) }, { label: 'Đăng ký từ', value: date(selected.createdAt) }].map(item => <div key={item.label} className="rounded-xl bg-slate-50 p-3"><dt className="text-xs text-slate-500">{item.label}</dt><dd className="mt-1 break-words text-lg font-semibold">{item.value}</dd></div>)}</dl>
            <p className="text-xs text-slate-500">Hoạt động học gần nhất: {date(selected.lastActivityAt)}</p>
          </section>
          <section aria-labelledby="lesson-history-title" className="space-y-3">
            <h2 id="lesson-history-title" className="text-lg font-bold">Tiến độ và bài tập từng bài</h2>
            {!selected.lessons.length && <p className={card}>Chưa có bài học ở trang này.</p>}
            {selected.lessons.map(lesson => {
              const assignment = record(lesson.assignment), scores = record(lesson.scores), links = safeLinks(assignment.links)
              const reflection = typeof assignment.reflection === 'string' ? assignment.reflection.slice(0, 10000) : ''
              return <details key={lesson.id} className={card + ' group'}>
                <summary className="min-h-11 cursor-pointer space-y-2 marker:text-emerald-700"><span className="break-words font-semibold">Bài {lesson.order}: {lesson.title}</span><span className="ml-2 inline-block rounded-full bg-slate-100 px-3 py-1 text-xs">{lesson.submissionStatus}</span><p className="text-sm text-slate-500">{lesson.status === 'COMPLETED' ? 'Đã hoàn thành bài' : lesson.status === 'NOT_STARTED' ? 'Chưa ghi nhận học' : 'Đang học'}{lesson.watchPercent != null && ` · Video: ${lesson.watchPercent}%`}{lesson.totalScore != null && ` · Điểm: ${lesson.totalScore}/10`}</p></summary>
                <div className="mt-4 space-y-4 border-t border-slate-100 pt-4 text-sm">
                  <p>Nộp bài: {lesson.submittedAt ? date(lesson.submittedAt) : 'Chưa nộp'}</p>
                  {reflection && <div><h4 className="font-semibold">Nội dung bài nộp</h4><p className="mt-2 whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-3">{reflection}</p></div>}
                  {links.length > 0 && <div><h4 className="font-semibold">Minh chứng</h4><ul className="mt-2 space-y-2">{links.map((link, index) => <li key={index}><a href={link} target="_blank" rel="noopener noreferrer" className="inline-block min-h-11 break-all text-emerald-800 underline">{link}</a></li>)}</ul></div>}
                  <div className="flex flex-wrap gap-2">{[{ key: 'video', label: 'Video' }, { key: 'reflection', label: 'Chia sẻ' }, { key: 'link', label: 'Minh chứng' }, { key: 'support', label: 'Hỗ trợ' }, { key: 'timing', label: 'Đúng hạn' }].map(item => typeof scores[item.key] === 'number' ? <span key={item.key} className="rounded-lg bg-slate-100 px-3 py-2 text-xs">{item.label}: {String(scores[item.key])}</span> : null)}</div>
                  {lesson.comments.length > 0 && <div><h4 className="font-semibold">Bình luận và phản hồi của giảng viên</h4><div className="mt-2 space-y-2">{lesson.comments.map(comment => <article key={comment.id} className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">{comment.author} · {date(comment.createdAt)}</p><p className="mt-1 whitespace-pre-wrap break-words">{comment.content}</p></article>)}</div></div>}
                  {!reflection && !links.length && !lesson.comments.length && <p className="text-slate-500">Chưa có nội dung bài nộp hoặc bình luận được ghi nhận.</p>}
                </div>
              </details>
            })}
            {selected.commentsTruncated && <p className="text-xs text-slate-500">Đang hiển thị tối đa 100 bình luận gần nhất của các bài trên trang này.</p>}
            {lessonPages > 1 && <nav aria-label="Phân trang bài học" className="flex flex-wrap items-center gap-3">{selected.lessonPage > 1 && <Link className={button} href={href(data.page, selected.courseId, selected.lessonPage - 1)}>Bài trước</Link>}<span className="text-sm">Trang {selected.lessonPage}/{lessonPages}</span>{selected.lessonPage < lessonPages && <Link className={button} href={href(data.page, selected.courseId, selected.lessonPage + 1)}>Bài tiếp</Link>}</nav>}
          </section>
        </> : <section className={card}><h2 className="font-semibold">Chưa có quá trình học</h2><p className="mt-2 text-sm text-slate-500">Khi có đăng ký khóa học, tiến độ và bài nộp sẽ xuất hiện tại đây.</p></section>}
      </div>
    </div>
  </main>
}
