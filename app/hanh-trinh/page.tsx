import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import prisma from "@/lib/prisma"
import { groupLessonsByDay } from "@/lib/journey"

/**
 * Hành trình học theo ngày của một khóa: bài học xếp theo thứ tự, gom
 * theo ngày thử thách (bài isDailyChallenge mở đầu một ngày), kèm trạng
 * thái hoàn thành của chính học viên. GĐ4 (24/10/2026).
 */
export default async function HanhTrinhPage({
  searchParams
}: {
  searchParams: Promise<{ courseId?: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const userId = Number(session.user.id)
  const params = await searchParams

  const enrollments = await prisma.enrollment.findMany({
    where: { userId, status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
    include: { course: { select: { id: true, name_khoa: true, name_lop: true } } },
  })
  const enrollment = enrollments.find((e) => e.courseId === Number(params.courseId)) ?? enrollments[0]

  if (!enrollment) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Hành trình học tập</h1>
        <p className="mt-4 text-gray-500">Bạn chưa có khóa học đang học nào.</p>
      </div>
    )
  }

  const [lessons, progresses] = await Promise.all([
    prisma.lesson.findMany({
      where: { courseId: enrollment.courseId },
      orderBy: { order: 'asc' },
      select: { id: true, title: true, order: true, isDailyChallenge: true },
    }),
    prisma.lessonProgress.findMany({
      where: { enrollmentId: enrollment.id },
      select: { lessonId: true, status: true },
    }),
  ])
  const completedIds = new Set(progresses.filter((p) => p.status === 'COMPLETED').map((p) => p.lessonId))
  const days = groupLessonsByDay(lessons.map((l) => ({ ...l, completed: completedIds.has(l.id) })))
  const totalCompleted = lessons.filter((l) => completedIds.has(l.id)).length

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Hành trình học tập</h1>
      <p className="text-sm text-gray-500 mt-1">
        {enrollment.course.name_khoa || enrollment.course.name_lop} — đã hoàn thành {totalCompleted}/{lessons.length} bài.
      </p>

      {enrollments.length > 1 && (
        <div className="flex flex-wrap gap-2 mt-4">
          {enrollments.map((e) => (
            <Link key={e.id} href={`/hanh-trinh?courseId=${e.courseId}`} className={`rounded-full px-3 py-1.5 text-sm border ${e.id === enrollment.id ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-300 text-gray-600'}`}>
              {e.course.name_khoa || e.course.name_lop || `Khóa #${e.courseId}`}
            </Link>
          ))}
        </div>
      )}

      <div className="mt-6 space-y-5">
        {days.map((day) => (
          <section key={day.label} className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-900">{day.label}</h2>
              <span className="text-xs text-gray-400">{day.completedCount}/{day.lessons.length} bài xong</span>
            </div>
            <ul className="mt-3 space-y-2">
              {day.lessons.map((lesson) => (
                <li key={lesson.id} className="flex items-center gap-3 text-sm">
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${lesson.completed ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                    {lesson.completed ? '✓' : lesson.order}
                  </span>
                  <span className={lesson.completed ? 'text-gray-500 line-through decoration-gray-300' : 'text-gray-800'}>{lesson.title}</span>
                  {lesson.isDailyChallenge && <span className="rounded-full bg-blue-50 text-blue-700 px-2 py-0.5 text-xs font-medium">Thử thách ngày</span>}
                </li>
              ))}
            </ul>
          </section>
        ))}
        {days.length === 0 && <p className="text-gray-500">Khóa này chưa có bài học.</p>}
      </div>
    </div>
  )
}
