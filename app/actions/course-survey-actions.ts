'use server'

import prisma from '@/lib/prisma'
import { auth } from '@/auth'
import { requireCourseAccessAction } from '@/lib/course/permissions'

// ─── Khảo sát trong khóa học ────────────────────────────────────────────────
// Giảng viên (chủ khóa) và ADMIN tạo khảo sát cho học viên ACTIVE của khóa.
// Loại câu hỏi: SINGLE (chọn 1), MULTI (chọn nhiều), RATING (điểm 1–5), TEXT (tự do).
// Trạng thái: DRAFT (nháp, học viên chưa thấy) → OPEN (đang mở) → CLOSED (đã đóng).

const TITLE_MAX = 150
const DESCRIPTION_MAX = 2000
const QUESTIONS_MAX = 30
const LABEL_MAX = 500
const OPTION_MAX_LEN = 200
const OPTIONS_MIN = 2
const OPTIONS_MAX = 12
const TEXT_ANSWER_MAX = 2000

const QUESTION_TYPES = ['SINGLE', 'MULTI', 'RATING', 'TEXT'] as const
type QuestionType = (typeof QUESTION_TYPES)[number]

type QuestionInput = {
    type: string
    label: string
    required?: boolean
    options?: string[]
}

function cleanOptions(raw: unknown): string[] {
    if (!Array.isArray(raw)) return []
    const seen = new Set<string>()
    const out: string[] = []
    for (const item of raw) {
        const v = String(item ?? '').trim().slice(0, OPTION_MAX_LEN)
        if (!v || seen.has(v)) continue
        seen.add(v)
        out.push(v)
    }
    return out
}

/** Chuẩn hoá + kiểm tra danh sách câu hỏi giảng viên gửi lên. */
function validateQuestions(input: unknown): { questions: { type: QuestionType; label: string; required: boolean; options: string[] | null }[] } | { error: string } {
    if (!Array.isArray(input) || input.length === 0) return { error: 'Khảo sát cần ít nhất 1 câu hỏi' }
    if (input.length > QUESTIONS_MAX) return { error: `Tối đa ${QUESTIONS_MAX} câu hỏi mỗi khảo sát` }
    const questions: { type: QuestionType; label: string; required: boolean; options: string[] | null }[] = []
    for (let i = 0; i < input.length; i++) {
        const q = input[i] as QuestionInput
        const type = String(q?.type || '') as QuestionType
        if (!QUESTION_TYPES.includes(type)) return { error: `Câu ${i + 1}: loại câu hỏi không hợp lệ` }
        const label = String(q?.label || '').trim().slice(0, LABEL_MAX)
        if (!label) return { error: `Câu ${i + 1}: chưa nhập nội dung câu hỏi` }
        let options: string[] | null = null
        if (type === 'SINGLE' || type === 'MULTI') {
            options = cleanOptions(q?.options)
            if (options.length < OPTIONS_MIN) return { error: `Câu ${i + 1}: cần ít nhất ${OPTIONS_MIN} đáp án` }
            if (options.length > OPTIONS_MAX) return { error: `Câu ${i + 1}: tối đa ${OPTIONS_MAX} đáp án` }
        }
        questions.push({ type, label, required: Boolean(q?.required), options })
    }
    return { questions }
}

async function loadManagedSurvey(surveyId: number) {
    const survey = await prisma.courseSurvey.findUnique({
        where: { id: surveyId },
        select: {
            id: true,
            courseId: true,
            teacherId: true,
            title: true,
            status: true,
            course: { select: { teacherId: true } },
        },
    })
    if (!survey) return { error: 'Không tìm thấy khảo sát' as const }
    const { denied, ctx } = await requireCourseAccessAction(survey.course.teacherId)
    if (denied) return { error: denied.error as string }
    return { survey, ctx }
}

// ─── Phía giảng viên ────────────────────────────────────────────────────────

export async function getCourseSurveyContextAction(courseId: number) {
    try {
        const course = await prisma.course.findUnique({
            where: { id: courseId },
            select: { id: true, name_lop: true, id_khoa: true, teacherId: true },
        })
        if (!course) return { success: false as const, error: 'Không tìm thấy khóa học' }

        const { denied } = await requireCourseAccessAction(course.teacherId)
        if (denied) return { success: false as const, error: denied.error }

        const [studentCount, surveys] = await Promise.all([
            prisma.enrollment.count({ where: { courseId, status: 'ACTIVE' } }),
            prisma.courseSurvey.findMany({
                where: { courseId },
                orderBy: { createdAt: 'desc' },
                take: 50,
                select: {
                    id: true,
                    title: true,
                    description: true,
                    status: true,
                    anonymous: true,
                    deadline: true,
                    createdAt: true,
                    _count: { select: { questions: true, responses: true } },
                },
            }),
        ])

        return {
            success: true as const,
            course: { id: course.id, name: course.name_lop, code: course.id_khoa },
            studentCount,
            surveys: surveys.map(s => ({
                id: s.id,
                title: s.title,
                description: s.description,
                status: s.status,
                anonymous: s.anonymous,
                deadline: s.deadline ? s.deadline.toISOString() : null,
                createdAt: s.createdAt.toISOString(),
                questionCount: s._count.questions,
                responseCount: s._count.responses,
            })),
        }
    } catch {
        return { success: false as const, error: 'Chưa tạo được bảng khảo sát. Cần chạy file SQL course-surveys.sql trong Supabase trước.' }
    }
}

export async function getCourseSurveyDetailAction(surveyId: number) {
    try {
        const found = await loadManagedSurvey(surveyId)
        if ('error' in found) return { success: false as const, error: found.error }
        const survey = await prisma.courseSurvey.findUnique({
            where: { id: surveyId },
            select: {
                id: true,
                courseId: true,
                title: true,
                description: true,
                status: true,
                anonymous: true,
                deadline: true,
                questions: {
                    orderBy: { sortOrder: 'asc' },
                    select: { id: true, type: true, label: true, required: true, options: true },
                },
            },
        })
        if (!survey) return { success: false as const, error: 'Không tìm thấy khảo sát' }
        return {
            success: true as const,
            survey: {
                id: survey.id,
                courseId: survey.courseId,
                title: survey.title,
                description: survey.description || '',
                status: survey.status,
                anonymous: survey.anonymous,
                deadline: survey.deadline ? survey.deadline.toISOString() : null,
                questions: survey.questions.map(q => ({
                    id: q.id,
                    type: q.type,
                    label: q.label,
                    required: q.required,
                    options: Array.isArray(q.options) ? (q.options as string[]) : [],
                })),
            },
        }
    } catch {
        return { success: false as const, error: 'Không tải được khảo sát' }
    }
}

export async function saveCourseSurveyAction(input: {
    id?: number
    courseId: number
    title: string
    description?: string
    anonymous?: boolean
    deadline?: string | null
    questions: QuestionInput[]
}) {
    try {
        const course = await prisma.course.findUnique({
            where: { id: input.courseId },
            select: { id: true, teacherId: true },
        })
        if (!course) return { success: false as const, error: 'Không tìm thấy khóa học' }
        const { denied, ctx } = await requireCourseAccessAction(course.teacherId)
        if (denied) return { success: false as const, error: denied.error }
        if (!ctx) return { success: false as const, error: 'Unauthorized' }

        const title = String(input.title || '').trim().slice(0, TITLE_MAX)
        if (!title) return { success: false as const, error: 'Chưa nhập tiêu đề khảo sát' }
        const description = String(input.description || '').trim().slice(0, DESCRIPTION_MAX) || null
        const deadline = input.deadline ? new Date(input.deadline) : null
        if (input.deadline && (!deadline || Number.isNaN(deadline.getTime()))) {
            return { success: false as const, error: 'Hạn trả lời không hợp lệ' }
        }
        const validated = validateQuestions(input.questions)
        if ('error' in validated) return { success: false as const, error: validated.error }

        const questionData = validated.questions.map((q, i) => ({
            sortOrder: i,
            type: q.type,
            label: q.label,
            required: q.required,
            options: q.options ?? undefined,
        }))

        if (input.id) {
            // Sửa: chỉ khi đang là NHÁP (chưa mở cho học viên) để không phá câu trả lời đã có.
            const existing = await prisma.courseSurvey.findUnique({
                where: { id: input.id },
                select: { id: true, courseId: true, status: true },
            })
            if (!existing || existing.courseId !== input.courseId) {
                return { success: false as const, error: 'Không tìm thấy khảo sát' }
            }
            if (existing.status !== 'DRAFT') {
                return { success: false as const, error: 'Khảo sát đã mở không sửa được câu hỏi. Hãy đóng khảo sát và tạo bản mới nếu cần thay đổi.' }
            }
            await prisma.$transaction([
                prisma.courseSurvey.update({
                    where: { id: input.id },
                    data: { title, description, anonymous: Boolean(input.anonymous), deadline },
                }),
                prisma.courseSurveyQuestion.deleteMany({ where: { surveyId: input.id } }),
                prisma.courseSurveyQuestion.createMany({
                    data: questionData.map(q => ({ ...q, surveyId: input.id as number })),
                }),
            ])
            return { success: true as const, surveyId: input.id }
        }

        const created = await prisma.courseSurvey.create({
            data: {
                courseId: input.courseId,
                teacherId: ctx.userId,
                title,
                description,
                anonymous: Boolean(input.anonymous),
                deadline,
                questions: { create: questionData },
            },
            select: { id: true },
        })
        return { success: true as const, surveyId: created.id }
    } catch {
        return { success: false as const, error: 'Không lưu được khảo sát' }
    }
}

export async function setCourseSurveyStatusAction(surveyId: number, status: string) {
    try {
        if (!['DRAFT', 'OPEN', 'CLOSED'].includes(status)) {
            return { success: false as const, error: 'Trạng thái không hợp lệ' }
        }
        const found = await loadManagedSurvey(surveyId)
        if ('error' in found) return { success: false as const, error: found.error }
        const current = found.survey.status
        const allowed =
            (current === 'DRAFT' && status === 'OPEN') ||
            (current === 'OPEN' && status === 'CLOSED') ||
            (current === 'CLOSED' && status === 'OPEN')
        if (!allowed) {
            return { success: false as const, error: 'Không chuyển trạng thái theo hướng này được' }
        }
        if (status === 'OPEN') {
            const questionCount = await prisma.courseSurveyQuestion.count({ where: { surveyId } })
            if (questionCount === 0) return { success: false as const, error: 'Khảo sát chưa có câu hỏi nào' }
        }
        await prisma.courseSurvey.update({ where: { id: surveyId }, data: { status } })
        return { success: true as const }
    } catch {
        return { success: false as const, error: 'Không đổi được trạng thái khảo sát' }
    }
}

export async function deleteCourseSurveyAction(surveyId: number) {
    try {
        const found = await loadManagedSurvey(surveyId)
        if ('error' in found) return { success: false as const, error: found.error }
        await prisma.courseSurvey.delete({ where: { id: surveyId } })
        return { success: true as const }
    } catch {
        return { success: false as const, error: 'Không xóa được khảo sát' }
    }
}

// ─── Phía học viên ──────────────────────────────────────────────────────────

export async function submitCourseSurveyAction(input: {
    surveyId: number
    answers: { questionId: number; value?: unknown; text?: string }[]
}) {
    try {
        const session = await auth()
        if (!session?.user?.id) return { success: false as const, error: 'Bạn cần đăng nhập' }
        const userId = parseInt(session.user.id)

        const survey = await prisma.courseSurvey.findUnique({
            where: { id: input.surveyId },
            select: {
                id: true,
                courseId: true,
                status: true,
                deadline: true,
                questions: {
                    orderBy: { sortOrder: 'asc' },
                    select: { id: true, type: true, label: true, required: true, options: true },
                },
            },
        })
        if (!survey) return { success: false as const, error: 'Không tìm thấy khảo sát' }
        if (survey.status !== 'OPEN') return { success: false as const, error: 'Khảo sát này đã đóng' }
        if (survey.deadline && new Date() > survey.deadline) {
            return { success: false as const, error: 'Đã hết hạn trả lời khảo sát' }
        }

        const enrollment = await prisma.enrollment.findUnique({
            where: { userId_courseId: { userId, courseId: survey.courseId } },
            select: { status: true },
        })
        if (!enrollment || enrollment.status !== 'ACTIVE') {
            return { success: false as const, error: 'Bạn chưa kích hoạt khóa học này nên chưa trả lời khảo sát được' }
        }

        const existing = await prisma.courseSurveyResponse.findUnique({
            where: { surveyId_userId: { surveyId: survey.id, userId } },
            select: { id: true },
        })
        if (existing) return { success: false as const, error: 'Bạn đã trả lời khảo sát này rồi' }

        const answerByQuestion = new Map<number, { value?: unknown; text?: string }>()
        for (const a of Array.isArray(input.answers) ? input.answers : []) {
            answerByQuestion.set(Number(a.questionId), a)
        }

        const answerData: { questionId: number; value?: string | number | string[]; textValue?: string }[] = []
        for (const q of survey.questions) {
            const a = answerByQuestion.get(q.id)
            const options = Array.isArray(q.options) ? (q.options as string[]) : []
            if (q.type === 'SINGLE') {
                const v = typeof a?.value === 'string' ? a.value : ''
                if (!v) {
                    if (q.required) return { success: false as const, error: `Chưa trả lời câu: ${q.label}` }
                    continue
                }
                if (!options.includes(v)) return { success: false as const, error: `Đáp án không hợp lệ ở câu: ${q.label}` }
                answerData.push({ questionId: q.id, value: v })
            } else if (q.type === 'MULTI') {
                const arr = Array.isArray(a?.value) ? a.value.map(v => String(v)) : []
                const valid = arr.filter(v => options.includes(v))
                if (valid.length === 0) {
                    if (q.required) return { success: false as const, error: `Chưa trả lời câu: ${q.label}` }
                    continue
                }
                answerData.push({ questionId: q.id, value: valid })
            } else if (q.type === 'RATING') {
                const n = typeof a?.value === 'number' ? a.value : Number(a?.value)
                if (!n || Number.isNaN(n)) {
                    if (q.required) return { success: false as const, error: `Chưa chấm điểm câu: ${q.label}` }
                    continue
                }
                if (!Number.isInteger(n) || n < 1 || n > 5) {
                    return { success: false as const, error: `Điểm phải từ 1 đến 5 ở câu: ${q.label}` }
                }
                answerData.push({ questionId: q.id, value: n })
            } else {
                const text = String(a?.text || '').trim().slice(0, TEXT_ANSWER_MAX)
                if (!text) {
                    if (q.required) return { success: false as const, error: `Chưa trả lời câu: ${q.label}` }
                    continue
                }
                answerData.push({ questionId: q.id, textValue: text })
            }
        }

        await prisma.courseSurveyResponse.create({
            data: {
                surveyId: survey.id,
                userId,
                answers: { create: answerData },
            },
        })
        return { success: true as const }
    } catch {
        return { success: false as const, error: 'Không gửi được câu trả lời. Có thể bạn đã trả lời rồi, hãy tải lại trang.' }
    }
}

// ─── Kết quả khảo sát (phía giảng viên) ─────────────────────────────────────

export async function getCourseSurveyResultsAction(surveyId: number) {
    try {
        const found = await loadManagedSurvey(surveyId)
        if ('error' in found) return { success: false as const, error: found.error }

        const survey = await prisma.courseSurvey.findUnique({
            where: { id: surveyId },
            select: {
                id: true,
                courseId: true,
                title: true,
                description: true,
                status: true,
                anonymous: true,
                deadline: true,
                course: { select: { name_lop: true } },
                questions: {
                    orderBy: { sortOrder: 'asc' },
                    select: { id: true, type: true, label: true, required: true, options: true },
                },
            },
        })
        if (!survey) return { success: false as const, error: 'Không tìm thấy khảo sát' }

        const [studentCount, responses, activeEnrollments] = await Promise.all([
            prisma.enrollment.count({ where: { courseId: survey.courseId, status: 'ACTIVE' } }),
            prisma.courseSurveyResponse.findMany({
                where: { surveyId },
                orderBy: { submittedAt: 'asc' },
                select: {
                    id: true,
                    userId: true,
                    submittedAt: true,
                    user: { select: { name: true, email: true } },
                    answers: { select: { questionId: true, value: true, textValue: true } },
                },
            }),
            prisma.enrollment.findMany({
                where: { courseId: survey.courseId, status: 'ACTIVE' },
                select: { userId: true, user: { select: { name: true, email: true } } },
            }),
        ])

        const answersByQuestion = new Map<number, { value: unknown; textValue: string | null; userName: string | null }[]>()
        for (const r of responses) {
            for (const a of r.answers) {
                const list = answersByQuestion.get(a.questionId) || []
                list.push({ value: a.value, textValue: a.textValue, userName: survey.anonymous ? null : r.user?.name || r.user?.email || null })
                answersByQuestion.set(a.questionId, list)
            }
        }

        const questions = survey.questions.map(q => {
            const options = Array.isArray(q.options) ? (q.options as string[]) : []
            const answers = answersByQuestion.get(q.id) || []
            if (q.type === 'SINGLE' || q.type === 'MULTI') {
                const counts = new Map<string, number>(options.map(o => [o, 0]))
                for (const a of answers) {
                    if (q.type === 'SINGLE' && typeof a.value === 'string') {
                        counts.set(a.value, (counts.get(a.value) || 0) + 1)
                    }
                    if (q.type === 'MULTI' && Array.isArray(a.value)) {
                        for (const v of a.value as string[]) counts.set(v, (counts.get(v) || 0) + 1)
                    }
                }
                return {
                    id: q.id,
                    type: q.type,
                    label: q.label,
                    totalAnswers: answers.length,
                    options: options.map(o => ({ label: o, count: counts.get(o) || 0 })),
                    average: null as number | null,
                    ratingCounts: null as { star: number; count: number }[] | null,
                    textAnswers: null as { text: string; author: string | null }[] | null,
                }
            }
            if (q.type === 'RATING') {
                const dist = [1, 2, 3, 4, 5].map(star => ({ star, count: 0 }))
                let sum = 0
                for (const a of answers) {
                    const n = typeof a.value === 'number' ? a.value : Number(a.value)
                    if (n >= 1 && n <= 5) {
                        dist[n - 1].count++
                        sum += n
                    }
                }
                return {
                    id: q.id,
                    type: q.type,
                    label: q.label,
                    totalAnswers: answers.length,
                    options: null as { label: string; count: number }[] | null,
                    average: answers.length ? Math.round((sum / answers.length) * 10) / 10 : null,
                    ratingCounts: dist,
                    textAnswers: null as { text: string; author: string | null }[] | null,
                }
            }
            return {
                id: q.id,
                type: q.type,
                label: q.label,
                totalAnswers: answers.length,
                options: null as { label: string; count: number }[] | null,
                average: null as number | null,
                ratingCounts: null as { star: number; count: number }[] | null,
                textAnswers: answers
                    .filter(a => a.textValue)
                    .map(a => ({ text: a.textValue as string, author: a.userName })),
            }
        })

        const respondedIds = new Set(responses.map(r => r.userId))
        const nonRespondents = activeEnrollments
            .filter(e => !respondedIds.has(e.userId))
            .map(e => ({ name: e.user?.name || '', email: e.user?.email || '' }))

        return {
            success: true as const,
            survey: {
                id: survey.id,
                courseId: survey.courseId,
                courseName: survey.course.name_lop,
                title: survey.title,
                description: survey.description,
                status: survey.status,
                anonymous: survey.anonymous,
                deadline: survey.deadline ? survey.deadline.toISOString() : null,
            },
            studentCount,
            responseCount: responses.length,
            questions,
            nonRespondents,
        }
    } catch {
        return { success: false as const, error: 'Không tải được kết quả khảo sát' }
    }
}

function csvEscape(v: string) {
    return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
}

export async function exportCourseSurveyCsvAction(surveyId: number) {
    try {
        const found = await loadManagedSurvey(surveyId)
        if ('error' in found) return { success: false as const, error: found.error }

        const survey = await prisma.courseSurvey.findUnique({
            where: { id: surveyId },
            select: {
                id: true,
                title: true,
                anonymous: true,
                questions: {
                    orderBy: { sortOrder: 'asc' },
                    select: { id: true, type: true, label: true },
                },
            },
        })
        if (!survey) return { success: false as const, error: 'Không tìm thấy khảo sát' }

        const responses = await prisma.courseSurveyResponse.findMany({
            where: { surveyId },
            orderBy: { submittedAt: 'asc' },
            select: {
                submittedAt: true,
                user: { select: { name: true, email: true } },
                answers: { select: { questionId: true, value: true, textValue: true } },
            },
        })

        const header = [
            'Thời gian gửi',
            ...(survey.anonymous ? [] : ['Họ tên', 'Email']),
            ...survey.questions.map(q => q.label),
        ]
        const lines = [header.map(csvEscape).join(',')]
        for (const r of responses) {
            const byQuestion = new Map<number, { value: unknown; textValue: string | null }>()
            for (const a of r.answers) byQuestion.set(a.questionId, a)
            const cells = [
                r.submittedAt.toLocaleString('vi-VN'),
                ...(survey.anonymous ? [] : [r.user?.name || '', r.user?.email || '']),
                ...survey.questions.map(q => {
                    const a = byQuestion.get(q.id)
                    if (!a) return ''
                    if (q.type === 'TEXT') return a.textValue || ''
                    if (q.type === 'MULTI') return Array.isArray(a.value) ? (a.value as string[]).join('; ') : ''
                    if (a.value === null || a.value === undefined) return ''
                    return String(a.value)
                }),
            ]
            lines.push(cells.map(csvEscape).join(','))
        }

        return {
            success: true as const,
            filename: `ket-qua-khao-sat-${surveyId}.csv`,
            csv: '﻿' + lines.join('\n'),
        }
    } catch {
        return { success: false as const, error: 'Không xuất được file kết quả' }
    }
}
