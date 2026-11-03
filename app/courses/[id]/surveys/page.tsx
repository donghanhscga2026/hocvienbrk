import { getSession } from '@/lib/get-session'
import prisma from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function CourseSurveysStudentPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const session = await getSession()
    if (!session?.user?.id) redirect('/login')

    const userId = Number(session.user.id)

    const course = await prisma.course.findUnique({
        where: { id_khoa: id },
        select: { id: true, id_khoa: true, name_lop: true },
    })
    if (!course) redirect(`/khoa-hoc/${id}`)

    const enrollment = await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId, courseId: course.id } },
        select: { status: true },
    })
    if (!enrollment || enrollment.status !== 'ACTIVE') redirect(`/khoa-hoc/${id}`)

    type SurveyRow = {
        id: number
        title: string
        description: string | null
        status: string
        deadline: Date | null
        anonymous: boolean
        responded: boolean
    }
    let surveys: SurveyRow[] = []
    try {
        const rows = await prisma.courseSurvey.findMany({
            where: { courseId: course.id, status: { in: ['OPEN', 'CLOSED'] } },
            orderBy: { createdAt: 'desc' },
            take: 50,
            select: { id: true, title: true, description: true, status: true, deadline: true, anonymous: true },
        })
        const myResponses = await prisma.courseSurveyResponse.findMany({
            where: { userId, surveyId: { in: rows.map(r => r.id) } },
            select: { surveyId: true },
        })
        const respondedSet = new Set(myResponses.map(r => r.surveyId))
        surveys = rows.map(r => ({ ...r, responded: respondedSet.has(r.id) }))
    } catch {
        // Bảng khảo sát chưa được tạo (chưa chạy SQL) — hiện danh sách trống.
        surveys = []
    }

    const now = new Date()

    return (
        <div className="min-h-screen bg-brk-background pb-20">
            <div className="mx-auto max-w-2xl p-4">
                <Link href={`/courses/${course.id_khoa}/learn`} className="text-sm text-brk-primary">
                    ← Quay lại phòng học
                </Link>
                <h1 className="mt-3 text-xl font-bold">Khảo sát trong khóa học</h1>
                <p className="mt-1 text-sm text-gray-600">Khóa: {course.name_lop}</p>
                <Link
                    href={`/courses/${course.id_khoa}/announcements`}
                    className="mt-3 inline-flex min-h-9 items-center rounded-lg border border-brk-outline bg-white px-3 text-xs font-semibold text-brk-primary"
                >
                    ← Thông báo từ giảng viên
                </Link>

                {surveys.length === 0 ? (
                    <p className="mt-6 rounded-2xl border border-brk-outline bg-white p-6 text-center text-sm text-gray-500">
                        Chưa có khảo sát nào trong khóa học này.
                    </p>
                ) : (
                    <div className="mt-5 space-y-3">
                        {surveys.map(s => {
                            const expired = s.deadline ? now > s.deadline : false
                            const canAnswer = s.status === 'OPEN' && !expired && !s.responded
                            return (
                                <article key={s.id} className="rounded-2xl border border-brk-outline bg-white p-4">
                                    <div className="flex flex-wrap items-start gap-2">
                                        <p className="min-w-0 flex-1 text-sm font-semibold">{s.title}</p>
                                        {s.responded ? (
                                            <span className="rounded-full bg-green-100 px-2.5 py-1 text-[11px] font-bold text-green-700">ĐÃ TRẢ LỜI</span>
                                        ) : s.status === 'CLOSED' ? (
                                            <span className="rounded-full bg-gray-800 px-2.5 py-1 text-[11px] font-bold text-white">ĐÃ ĐÓNG</span>
                                        ) : expired ? (
                                            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-bold text-gray-600">HẾT HẠN</span>
                                        ) : (
                                            <span className="rounded-full bg-green-100 px-2.5 py-1 text-[11px] font-bold text-green-700">ĐANG MỞ</span>
                                        )}
                                    </div>
                                    {s.description && <p className="mt-1 whitespace-pre-line text-sm text-gray-600">{s.description}</p>}
                                    <p className="mt-1 text-xs text-gray-500">
                                        {s.deadline ? `Hạn trả lời: ${s.deadline.toLocaleString('vi-VN')}` : 'Không có hạn trả lời'}
                                        {s.anonymous ? ' · Khảo sát ẩn danh' : ''}
                                    </p>
                                    {(canAnswer || s.responded) && (
                                        <Link
                                            href={`/courses/${course.id_khoa}/surveys/${s.id}`}
                                            className="mt-3 inline-flex min-h-10 items-center rounded-xl bg-brk-primary px-4 text-sm font-semibold text-white"
                                        >
                                            {s.responded ? 'Xem lại câu trả lời' : 'Trả lời khảo sát'}
                                        </Link>
                                    )}
                                </article>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
