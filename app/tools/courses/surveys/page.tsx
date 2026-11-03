'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
    getCourseSurveyContextAction,
    getCourseSurveyDetailAction,
    saveCourseSurveyAction,
    setCourseSurveyStatusAction,
    deleteCourseSurveyAction,
} from '@/app/actions/course-survey-actions'

type SurveyItem = {
    id: number
    title: string
    description: string | null
    status: string
    anonymous: boolean
    deadline: string | null
    createdAt: string
    questionCount: number
    responseCount: number
}

type QuestionDraft = {
    type: 'SINGLE' | 'MULTI' | 'RATING' | 'TEXT'
    label: string
    required: boolean
    optionsText: string
}

const STATUS_META: Record<string, { label: string; className: string }> = {
    DRAFT: { label: 'NHÁP', className: 'bg-gray-100 text-gray-600' },
    OPEN: { label: 'ĐANG MỞ', className: 'bg-green-100 text-green-700' },
    CLOSED: { label: 'ĐÃ ĐÓNG', className: 'bg-gray-800 text-white' },
}

const TYPE_LABELS: Record<QuestionDraft['type'], string> = {
    SINGLE: 'Chọn 1 đáp án',
    MULTI: 'Chọn nhiều đáp án',
    RATING: 'Thang điểm 1–5',
    TEXT: 'Trả lời tự do',
}

function newQuestion(): QuestionDraft {
    return { type: 'SINGLE', label: '', required: false, optionsText: '' }
}

function SurveysInner() {
    const params = useSearchParams()
    const courseId = Number(params.get('courseId') || 0)

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [courseName, setCourseName] = useState('')
    const [studentCount, setStudentCount] = useState(0)
    const [surveys, setSurveys] = useState<SurveyItem[]>([])

    const [view, setView] = useState<'list' | 'editor'>('list')
    const [editingId, setEditingId] = useState<number | null>(null)
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [anonymous, setAnonymous] = useState(false)
    const [deadline, setDeadline] = useState('')
    const [questions, setQuestions] = useState<QuestionDraft[]>([newQuestion()])
    const [saving, setSaving] = useState(false)
    const [busyId, setBusyId] = useState<number | null>(null)
    const [courseCode, setCourseCode] = useState('')
    const [copiedId, setCopiedId] = useState<number | null>(null)
    const [notice, setNotice] = useState('')

    const loadContext = async () => {
        if (!courseId) {
            setError('Thiếu mã khóa học. Hãy mở trang này từ menu thao tác của khóa trong Quản lý khóa học.')
            setLoading(false)
            return
        }
        const res = await getCourseSurveyContextAction(courseId)
        if (res.success) {
            setCourseName(res.course.name)
            setCourseCode(res.course.code || '')
            setStudentCount(res.studentCount)
            setSurveys(res.surveys as SurveyItem[])
            setError('')
        } else {
            setError(res.error || 'Không tải được thông tin khóa học')
        }
        setLoading(false)
    }

    useEffect(() => {
        void loadContext()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [courseId])

    const openEditor = async (survey: SurveyItem | null) => {
        setNotice('')
        if (!survey) {
            setEditingId(null)
            setTitle('')
            setDescription('')
            setAnonymous(false)
            setDeadline('')
            setQuestions([newQuestion()])
            setView('editor')
            return
        }
        const res = await getCourseSurveyDetailAction(survey.id)
        if (!res.success) {
            alert(res.error)
            return
        }
        setEditingId(res.survey.id)
        setTitle(res.survey.title)
        setDescription(res.survey.description)
        setAnonymous(res.survey.anonymous)
        setDeadline(res.survey.deadline ? res.survey.deadline.slice(0, 16) : '')
        setQuestions(
            res.survey.questions.map(q => ({
                type: q.type as QuestionDraft['type'],
                label: q.label,
                required: q.required,
                optionsText: q.options.join('\n'),
            }))
        )
        setView('editor')
    }

    const updateQuestion = (idx: number, patch: Partial<QuestionDraft>) => {
        setQuestions(prev => prev.map((q, i) => (i === idx ? { ...q, ...patch } : q)))
    }

    const moveQuestion = (idx: number, dir: -1 | 1) => {
        setQuestions(prev => {
            const next = [...prev]
            const j = idx + dir
            if (j < 0 || j >= next.length) return prev
            ;[next[idx], next[j]] = [next[j], next[idx]]
            return next
        })
    }

    const handleSave = async (openAfter: boolean) => {
        setSaving(true)
        const res = await saveCourseSurveyAction({
            id: editingId ?? undefined,
            courseId,
            title,
            description,
            anonymous,
            deadline: deadline ? new Date(deadline).toISOString() : null,
            questions: questions.map(q => ({
                type: q.type,
                label: q.label,
                required: q.required,
                options:
                    q.type === 'SINGLE' || q.type === 'MULTI'
                        ? q.optionsText.split('\n').map(s => s.trim()).filter(Boolean)
                        : [],
            })),
        })
        if (!res.success) {
            alert(res.error)
            setSaving(false)
            return
        }
        if (openAfter) {
            const st = await setCourseSurveyStatusAction(res.surveyId, 'OPEN')
            if (!st.success) {
                alert(`Đã lưu bản nháp, nhưng chưa mở được: ${st.error}`)
            } else {
                setNotice('Đã mở khảo sát. Học viên đang học sẽ thấy khảo sát trong phòng học.')
            }
        } else {
            setNotice('Đã lưu bản nháp.')
        }
        setSaving(false)
        setView('list')
        await loadContext()
    }

    const copySurveyLink = async (survey: SurveyItem) => {
        const url = `${window.location.origin}/courses/${courseCode}/surveys/${survey.id}`
        try {
            await navigator.clipboard.writeText(url)
            setCopiedId(survey.id)
            window.setTimeout(() => setCopiedId(cur => (cur === survey.id ? null : cur)), 2000)
        } catch {
            window.prompt('Sao chép link khảo sát bên dưới:', url)
        }
    }

    const handleStatus = async (survey: SurveyItem, status: string) => {
        setBusyId(survey.id)
        const res = await setCourseSurveyStatusAction(survey.id, status)
        if (!res.success) alert(res.error)
        else await loadContext()
        setBusyId(null)
    }

    const handleDelete = async (survey: SurveyItem) => {
        if (!confirm(`Xóa khảo sát "${survey.title}"? Mọi câu trả lời (nếu có) cũng bị xóa.`)) return
        setBusyId(survey.id)
        const res = await deleteCourseSurveyAction(survey.id)
        if (!res.success) alert(res.error)
        else await loadContext()
        setBusyId(null)
    }

    if (loading) return <p className="py-12 text-center text-sm text-gray-500">Đang tải…</p>

    return (
        <div className="mx-auto max-w-3xl p-4">
            <Link href="/tools/courses" className="text-sm text-brk-primary">
                ← Quay lại Quản lý khóa học
            </Link>
            <h1 className="mt-3 text-xl font-bold">Khảo sát trong khóa học</h1>
            {courseName && (
                <p className="mt-1 text-sm text-gray-600">
                    Khóa: <strong>{courseName}</strong> — có <strong>{studentCount}</strong> học viên đang học (ACTIVE)
                </p>
            )}

            {error && (
                <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {error}
                </div>
            )}

            {!error && view === 'list' && (
                <>
                    {notice && (
                        <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
                            {notice}
                        </div>
                    )}
                    <div className="mt-4 flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-gray-700">Các khảo sát của khóa này</h2>
                        <button
                            type="button"
                            onClick={() => void openEditor(null)}
                            className="flex min-h-11 items-center rounded-xl bg-brk-primary px-4 text-sm font-semibold text-white"
                        >
                            + Tạo khảo sát
                        </button>
                    </div>

                    {surveys.length === 0 ? (
                        <p className="mt-4 rounded-2xl border border-brk-outline bg-white p-6 text-center text-sm text-gray-500">
                            Chưa có khảo sát nào. Bấm “Tạo khảo sát” để bắt đầu hỏi ý kiến học viên.
                        </p>
                    ) : (
                        <div className="mt-3 space-y-3">
                            {surveys.map(s => (
                                <div key={s.id} className="rounded-2xl border border-brk-outline bg-white p-4">
                                    <div className="flex flex-wrap items-start gap-2">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-semibold">{s.title}</p>
                                            <p className="mt-0.5 text-xs text-gray-500">
                                                {s.questionCount} câu hỏi · Đã trả lời: {s.responseCount}/{studentCount}
                                                {s.anonymous ? ' · Ẩn danh' : ''}
                                                {s.deadline ? ` · Hạn: ${new Date(s.deadline).toLocaleString('vi-VN')}` : ''}
                                            </p>
                                        </div>
                                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${STATUS_META[s.status]?.className || ''}`}>
                                            {STATUS_META[s.status]?.label || s.status}
                                        </span>
                                    </div>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {s.status === 'DRAFT' && (
                                            <>
                                                <button type="button" disabled={busyId === s.id} onClick={() => void openEditor(s)} className="min-h-9 rounded-lg border border-brk-outline bg-white px-3 text-xs font-semibold disabled:opacity-50">
                                                    Sửa
                                                </button>
                                                <button type="button" disabled={busyId === s.id} onClick={() => void handleStatus(s, 'OPEN')} className="min-h-9 rounded-lg bg-brk-primary px-3 text-xs font-semibold text-white disabled:opacity-50">
                                                    Mở khảo sát
                                                </button>
                                            </>
                                        )}
                                        {s.status === 'OPEN' && (
                                            <>
                                                <button type="button" disabled={busyId === s.id} onClick={() => void handleStatus(s, 'CLOSED')} className="min-h-9 rounded-lg border border-brk-outline bg-white px-3 text-xs font-semibold disabled:opacity-50">
                                                    Đóng khảo sát
                                                </button>
                                                {courseCode && (
                                                    <button type="button" onClick={() => void copySurveyLink(s)} className="min-h-9 rounded-lg border border-brk-outline bg-white px-3 text-xs font-semibold text-brk-primary">
                                                        {copiedId === s.id ? 'Đã chép link ✓' : 'Sao chép link khảo sát'}
                                                    </button>
                                                )}
                                            </>
                                        )}
                                        {s.status === 'CLOSED' && (
                                            <button type="button" disabled={busyId === s.id} onClick={() => void handleStatus(s, 'OPEN')} className="min-h-9 rounded-lg border border-brk-outline bg-white px-3 text-xs font-semibold disabled:opacity-50">
                                                Mở lại
                                            </button>
                                        )}
                                        <Link href={`/tools/courses/surveys/results?surveyId=${s.id}`} className="flex min-h-9 items-center rounded-lg border border-brk-outline bg-white px-3 text-xs font-semibold text-brk-primary">
                                            Xem kết quả
                                        </Link>
                                        <button type="button" disabled={busyId === s.id} onClick={() => void handleDelete(s)} className="min-h-9 rounded-lg border border-red-200 bg-white px-3 text-xs font-semibold text-red-600 disabled:opacity-50">
                                            Xóa
                                        </button>
                                    </div>
                                    {s.status === 'OPEN' && (
                                        <p className="mt-2 text-xs text-gray-500">
                                            Muốn học viên biết có khảo sát mới?{' '}
                                            <Link href={`/tools/courses/announce?courseId=${courseId}`} className="font-semibold text-brk-primary underline">
                                                Gửi thông báo cho học viên →
                                            </Link>
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {!error && view === 'editor' && (
                <div className="mt-4 space-y-4 rounded-2xl border border-brk-outline bg-white p-4">
                    <h2 className="text-sm font-semibold">{editingId ? 'Sửa khảo sát (bản nháp)' : 'Tạo khảo sát mới'}</h2>

                    <label className="block space-y-1 text-sm">
                        <span className="font-medium">Tiêu đề khảo sát *</span>
                        <input
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            maxLength={150}
                            placeholder="Ví dụ: Khảo sát mức độ hài lòng sau khóa học"
                            className="min-h-11 w-full rounded-xl border border-brk-outline px-3 py-2"
                        />
                    </label>

                    <label className="block space-y-1 text-sm">
                        <span className="font-medium">Lời giới thiệu (không bắt buộc)</span>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            maxLength={2000}
                            rows={2}
                            placeholder="Ví dụ: Cho giảng viên biết cảm nhận của bạn để khóa học tốt hơn."
                            className="w-full rounded-xl border border-brk-outline px-3 py-2"
                        />
                    </label>

                    <div className="flex flex-wrap items-end gap-4">
                        <label className="block space-y-1 text-sm">
                            <span className="font-medium">Hạn trả lời (không bắt buộc)</span>
                            <input
                                type="datetime-local"
                                value={deadline}
                                onChange={e => setDeadline(e.target.value)}
                                className="min-h-11 rounded-xl border border-brk-outline px-3 py-2"
                            />
                        </label>
                        <label className="flex min-h-11 items-center gap-2 text-sm">
                            <input type="checkbox" checked={anonymous} onChange={e => setAnonymous(e.target.checked)} className="h-4 w-4" />
                            Khảo sát ẩn danh (giảng viên không thấy tên người trả lời)
                        </label>
                    </div>

                    <div className="space-y-3">
                        {questions.map((q, idx) => (
                            <div key={idx} className="rounded-xl border border-brk-outline p-3">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-xs font-bold text-gray-500">Câu {idx + 1}</span>
                                    <select
                                        value={q.type}
                                        onChange={e => updateQuestion(idx, { type: e.target.value as QuestionDraft['type'] })}
                                        className="min-h-9 rounded-lg border border-brk-outline px-2 text-xs"
                                    >
                                        {(Object.keys(TYPE_LABELS) as QuestionDraft['type'][]).map(t => (
                                            <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                                        ))}
                                    </select>
                                    <label className="flex items-center gap-1 text-xs">
                                        <input type="checkbox" checked={q.required} onChange={e => updateQuestion(idx, { required: e.target.checked })} className="h-4 w-4" />
                                        Bắt buộc
                                    </label>
                                    <div className="flex-1" />
                                    <button type="button" onClick={() => moveQuestion(idx, -1)} className="min-h-9 rounded-lg border border-brk-outline px-2 text-xs" aria-label="Lên">↑</button>
                                    <button type="button" onClick={() => moveQuestion(idx, 1)} className="min-h-9 rounded-lg border border-brk-outline px-2 text-xs" aria-label="Xuống">↓</button>
                                    <button
                                        type="button"
                                        onClick={() => setQuestions(prev => prev.filter((_, i) => i !== idx))}
                                        className="min-h-9 rounded-lg border border-red-200 px-2 text-xs font-semibold text-red-600"
                                    >
                                        Xóa câu
                                    </button>
                                </div>
                                <input
                                    value={q.label}
                                    onChange={e => updateQuestion(idx, { label: e.target.value })}
                                    maxLength={500}
                                    placeholder="Nội dung câu hỏi…"
                                    className="mt-2 min-h-11 w-full rounded-xl border border-brk-outline px-3 py-2 text-sm"
                                />
                                {(q.type === 'SINGLE' || q.type === 'MULTI') && (
                                    <label className="mt-2 block space-y-1 text-xs text-gray-600">
                                        <span>Các đáp án — mỗi đáp án một dòng (2–12 đáp án)</span>
                                        <textarea
                                            value={q.optionsText}
                                            onChange={e => updateQuestion(idx, { optionsText: e.target.value })}
                                            rows={4}
                                            placeholder={'Rất hay\nHay\nBình thường\nChưa hay'}
                                            className="w-full rounded-xl border border-brk-outline px-3 py-2 text-sm"
                                        />
                                    </label>
                                )}
                                {q.type === 'RATING' && <p className="mt-2 text-xs text-gray-500">Học viên sẽ chấm từ 1 đến 5 điểm.</p>}
                                {q.type === 'TEXT' && <p className="mt-2 text-xs text-gray-500">Học viên sẽ gõ câu trả lời tự do (tối đa 2000 ký tự).</p>}
                            </div>
                        ))}
                    </div>

                    <button
                        type="button"
                        onClick={() => setQuestions(prev => [...prev, newQuestion()])}
                        className="min-h-11 rounded-xl border border-brk-outline bg-white px-4 text-sm font-semibold"
                    >
                        + Thêm câu hỏi
                    </button>

                    <div className="flex flex-wrap gap-2 border-t border-brk-outline pt-4">
                        <button type="button" onClick={() => setView('list')} className="min-h-11 rounded-xl border border-brk-outline bg-white px-4 text-sm font-semibold">
                            Hủy
                        </button>
                        <div className="flex-1" />
                        <button type="button" disabled={saving} onClick={() => void handleSave(false)} className="min-h-11 rounded-xl border border-brk-outline bg-white px-4 text-sm font-semibold disabled:opacity-50">
                            {saving ? 'Đang lưu…' : 'Lưu nháp'}
                        </button>
                        <button type="button" disabled={saving} onClick={() => void handleSave(true)} className="min-h-11 rounded-xl bg-brk-primary px-4 text-sm font-semibold text-white disabled:opacity-50">
                            {saving ? 'Đang lưu…' : 'Lưu & mở khảo sát'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

export default function CourseSurveysPage() {
    return (
        <Suspense fallback={<p className="py-12 text-center text-sm text-gray-500">Đang tải…</p>}>
            <SurveysInner />
        </Suspense>
    )
}
