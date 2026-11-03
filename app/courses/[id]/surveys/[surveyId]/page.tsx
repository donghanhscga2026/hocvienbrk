import { getSession } from '@/lib/get-session'
import prisma from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { ReactNode } from 'react'
import SurveyAnswerForm from './SurveyAnswerForm'

export default async function CourseSurveyDetailStudentPage({
    params,
}: {
    params: Promise<{ id: string; surveyId: string }>
}) {
    const { id, surveyId } = await params
    const session = await getSession()
    if (!session?.user?.id) redirect('/login')

    const userId = Number(session.user.id)
    const surveyIdNum = Number(surveyId)

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

    let survey: {
        id: number
        title: string
        description: string | null
        status: string
        deadline: Date | null
        anonymous: boolean
        questions: { id: number; type: string; label: string; required: boolean; options: string[] }[]
    } | null = null
    let myAnswers: { questionId: number; value: unknown; textValue: string | null }[] | null = null

    try {
        const row = await prisma.courseSurvey.findUnique({
            where: { id: surveyIdNum },
            select: {
                id: true,
                courseId: true,
                title: true,
                description: true,
                status: true,
                deadline: true,
                anonymous: true,
                questions: {
                    orderBy: { sortOrder: 'asc' },
                    select: { id: true, type: true, label: true, required: true, options: true },
                },
            },
        })
        if (row && row.courseId === course.id && row.status !== 'DRAFT') {
            survey = {
                ...row,
                questions: row.questions.map(q => ({
                    ...q,
                    options: Array.isArray(q.options) ? (q.options as string[]) : [],
                })),
            }
            const my = await prisma.courseSurveyResponse.findUnique({
                where: { surveyId_userId: { surveyId: row.id, userId } },
                select: { answers: { select: { questionId: true, value: true, textValue: true } } },
            })
            if (my) myAnswers = my.answers
        }
    } catch {
        survey = null
    }

    const shell = (children: ReactNode) => (
        <div className="min-h-screen bg-brk-background pb-20">
            <div className="mx-auto max-w-2xl p-4">
                <Link href={`/courses/${course.id_khoa}/surveys`} className="text-sm text-brk-primary">
                    ← Quay lại danh sách khảo sát
                </Link>
                {children}
            </div>
        </div>
    )

    if (!survey) {
        return shell(
            <p className="mt-8 rounded-2xl border border-brk-outline bg-white p-6 text-center text-sm text-gray-500">
                Không tìm thấy khảo sát này.
            </p>
        )
    }

    const expired = survey.deadline ? new Date() > survey.deadline : false

    return shell(
        <>
            <h1 className="mt-3 text-xl font-bold">{survey.title}</h1>
            <p className="mt-1 text-sm text-gray-600">Khóa: {course.name_lop}</p>
            {survey.description && <p className="mt-2 whitespace-pre-line text-sm text-gray-700">{survey.description}</p>}
            <p className="mt-1 text-xs text-gray-500">
                {survey.deadline ? `Hạn trả lời: ${survey.deadline.toLocaleString('vi-VN')}` : 'Không có hạn trả lời'}
                {survey.anonymous ? ' · Khảo sát ẩn danh — giảng viên không thấy tên của bạn' : ''}
            </p>

            {myAnswers ? (
                <div className="mt-5 space-y-3">
                    <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
                        Bạn đã trả lời khảo sát này. Cảm ơn bạn!
                    </div>
                    {survey.questions.map((q, idx) => {
                        const a = myAnswers?.find(x => x.questionId === q.id)
                        let display = '—'
                        if (a) {
                            if (q.type === 'TEXT') display = a.textValue || '—'
                            else if (q.type === 'RATING') display = `${String(a.value ?? '—')} / 5 điểm`
                            else if (q.type === 'MULTI') display = Array.isArray(a.value) ? (a.value as string[]).join(', ') : '—'
                            else display = typeof a.value === 'string' ? a.value : '—'
                        }
                        return (
                            <div key={q.id} className="rounded-2xl border border-brk-outline bg-white p-4">
                                <p className="text-sm font-medium">{idx + 1}. {q.label}</p>
                                <p className="mt-1 whitespace-pre-line text-sm text-gray-700">{display}</p>
                            </div>
                        )
                    })}
                </div>
            ) : survey.status === 'CLOSED' ? (
                <p className="mt-6 rounded-2xl border border-brk-outline bg-white p-6 text-center text-sm text-gray-500">
                    Khảo sát đã đóng, không nhận thêm câu trả lời.
                </p>
            ) : expired ? (
                <p className="mt-6 rounded-2xl border border-brk-outline bg-white p-6 text-center text-sm text-gray-500">
                    Đã hết hạn trả lời khảo sát này.
                </p>
            ) : (
                <SurveyAnswerForm
                    surveyId={survey.id}
                    anonymous={survey.anonymous}
                    questions={survey.questions.map(q => ({
                        id: q.id,
                        type: q.type as 'SINGLE' | 'MULTI' | 'RATING' | 'TEXT',
                        label: q.label,
                        required: q.required,
                        options: q.options,
                    }))}
                />
            )}
        </>
    )
}
