'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
    getCourseSurveyResultsAction,
    exportCourseSurveyCsvAction,
    setCourseSurveyStatusAction,
} from '@/app/actions/course-survey-actions'

type QuestionResult = {
    id: number
    type: string
    label: string
    totalAnswers: number
    options: { label: string; count: number }[] | null
    average: number | null
    ratingCounts: { star: number; count: number }[] | null
    textAnswers: { text: string; author: string | null }[] | null
}

type ResultsData = {
    survey: {
        id: number
        courseId: number
        courseName: string
        title: string
        description: string | null
        status: string
        anonymous: boolean
        deadline: string | null
    }
    studentCount: number
    responseCount: number
    questions: QuestionResult[]
    nonRespondents: { name: string; email: string }[]
}

// Trang tổng hợp kết quả khảo sát cho giảng viên (đợt 2): tỉ lệ từng đáp án, điểm trung bình, câu trả lời tự do, học viên chưa trả lời, tải CSV.
const STATUS_LABEL: Record<string, string> = { DRAFT: 'NHÁP', OPEN: 'ĐANG MỞ', CLOSED: 'ĐÃ ĐÓNG' }

function Bar({ count, total }: { count: number; total: number }) {
    const pct = total > 0 ? Math.round((count / total) * 100) : 0
    return (
        <div className="flex items-center gap-2">
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                <div className="h-full rounded-full bg-brk-primary" style={{ width: `${pct}%` }} />
            </div>
            <span className="w-20 shrink-0 text-right text-xs text-gray-600">
                {count} · {pct}%
            </span>
        </div>
    )
}

function ResultsInner() {
    const params = useSearchParams()
    const surveyId = Number(params.get('surveyId') || 0)

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [data, setData] = useState<ResultsData | null>(null)
    const [busy, setBusy] = useState(false)
    const [exporting, setExporting] = useState(false)

    const load = async () => {
        if (!surveyId) {
            setError('Thiếu mã khảo sát.')
            setLoading(false)
            return
        }
        const res = await getCourseSurveyResultsAction(surveyId)
        if (res.success) {
            setData(res as unknown as ResultsData)
            setError('')
        } else {
            setError(res.error || 'Không tải được kết quả')
        }
        setLoading(false)
    }

    useEffect(() => {
        void load()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [surveyId])

    const handleExport = async () => {
        setExporting(true)
        const res = await exportCourseSurveyCsvAction(surveyId)
        setExporting(false)
        if (!res.success) {
            alert(res.error)
            return
        }
        const blob = new Blob([res.csv], { type: 'text/csv;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = res.filename
        a.click()
        URL.revokeObjectURL(url)
    }

    const handleStatus = async (status: string) => {
        setBusy(true)
        const res = await setCourseSurveyStatusAction(surveyId, status)
        if (!res.success) alert(res.error)
        else await load()
        setBusy(false)
    }

    if (loading) return <p className="py-12 text-center text-sm text-gray-500">Đang tải…</p>

    return (
        <div className="mx-auto max-w-3xl p-4">
            <Link href={data ? `/tools/courses/surveys?courseId=${data.survey.courseId}` : '/tools/courses'} className="text-sm text-brk-primary">
                ← Quay lại danh sách khảo sát
            </Link>

            {error && (
                <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {error}
                </div>
            )}

            {data && (
                <>
                    <h1 className="mt-3 text-xl font-bold">Kết quả: {data.survey.title}</h1>
                    <p className="mt-1 text-sm text-gray-600">
                        Khóa: <strong>{data.survey.courseName}</strong> · Trạng thái: {STATUS_LABEL[data.survey.status] || data.survey.status}
                        {data.survey.anonymous ? ' · Ẩn danh' : ''}
                        {data.survey.deadline ? ` · Hạn: ${new Date(data.survey.deadline).toLocaleString('vi-VN')}` : ''}
                    </p>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                        <div className="rounded-2xl border border-brk-outline bg-white px-4 py-3">
                            <p className="text-lg font-bold">
                                {data.responseCount}/{data.studentCount}
                            </p>
                            <p className="text-xs text-gray-500">
                                học viên đã trả lời ({data.studentCount > 0 ? Math.round((data.responseCount / data.studentCount) * 100) : 0}%)
                            </p>
                        </div>
                        <div className="flex-1" />
                        <button type="button" disabled={exporting} onClick={() => void handleExport()} className="min-h-11 rounded-xl border border-brk-outline bg-white px-4 text-sm font-semibold disabled:opacity-50">
                            {exporting ? 'Đang xuất…' : 'Tải file CSV (mở bằng Excel)'}
                        </button>
                        {data.survey.status === 'OPEN' && (
                            <button type="button" disabled={busy} onClick={() => void handleStatus('CLOSED')} className="min-h-11 rounded-xl border border-brk-outline bg-white px-4 text-sm font-semibold disabled:opacity-50">
                                Đóng khảo sát
                            </button>
                        )}
                        {data.survey.status === 'CLOSED' && (
                            <button type="button" disabled={busy} onClick={() => void handleStatus('OPEN')} className="min-h-11 rounded-xl bg-brk-primary px-4 text-sm font-semibold text-white disabled:opacity-50">
                                Mở lại
                            </button>
                        )}
                    </div>

                    <div className="mt-4 space-y-3">
                        {data.questions.map((q, idx) => (
                            <div key={q.id} className="rounded-2xl border border-brk-outline bg-white p-4">
                                <p className="text-sm font-semibold">
                                    {idx + 1}. {q.label}
                                </p>
                                <p className="mt-0.5 text-xs text-gray-500">{q.totalAnswers} lượt trả lời</p>

                                {q.options && (
                                    <div className="mt-3 space-y-2">
                                        {q.options.map(o => (
                                            <div key={o.label}>
                                                <p className="mb-1 text-xs text-gray-700">{o.label}</p>
                                                <Bar count={o.count} total={q.totalAnswers} />
                                            </div>
                                        ))}
                                        {q.type === 'MULTI' && <p className="text-[11px] text-gray-400">Câu chọn nhiều đáp án: % tính trên tổng số người trả lời có thể vượt 100%.</p>}
                                    </div>
                                )}

                                {q.ratingCounts && (
                                    <div className="mt-3">
                                        <p className="text-sm">
                                            Điểm trung bình: <strong className="text-base">{q.average !== null ? q.average.toLocaleString('vi-VN') : '—'} / 5</strong>
                                        </p>
                                        <div className="mt-2 space-y-2">
                                            {q.ratingCounts.map(r => (
                                                <div key={r.star}>
                                                    <p className="mb-1 text-xs text-gray-700">{r.star} điểm</p>
                                                    <Bar count={r.count} total={q.totalAnswers} />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {q.textAnswers && (
                                    <ul className="mt-3 space-y-2">
                                        {q.textAnswers.length === 0 && <li className="text-sm text-gray-500">Chưa có câu trả lời nào.</li>}
                                        {q.textAnswers.map((a, i) => (
                                            <li key={i} className="rounded-xl bg-brk-background px-3 py-2 text-sm text-gray-700">
                                                <span className="whitespace-pre-line">“{a.text}”</span>
                                                {a.author && <span className="mt-0.5 block text-xs text-gray-500">— {a.author}</span>}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        ))}
                    </div>

                    <details className="mt-4 rounded-2xl border border-brk-outline bg-white p-4">
                        <summary className="cursor-pointer text-sm font-semibold">
                            Học viên chưa trả lời ({data.nonRespondents.length})
                        </summary>
                        {data.nonRespondents.length === 0 ? (
                            <p className="mt-2 text-sm text-gray-500">Tất cả học viên đang học đã trả lời.</p>
                        ) : (
                            <ul className="mt-2 space-y-1 text-sm text-gray-700">
                                {data.nonRespondents.map((s, i) => (
                                    <li key={i}>
                                        {s.name || '(chưa có tên)'} <span className="text-xs text-gray-500">{s.email}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                        <p className="mt-2 text-xs text-gray-500">
                            Muốn nhắc các bạn này? Dùng trang{' '}
                            <Link href={`/tools/courses/announce?courseId=${data.survey.courseId}`} className="font-semibold text-brk-primary underline">
                                Gửi thông báo / email
                            </Link>{' '}
                            và chọn đúng danh sách học viên cần nhắc.
                        </p>
                    </details>
                </>
            )}
        </div>
    )
}

export default function CourseSurveyResultsPage() {
    return (
        <Suspense fallback={<p className="py-12 text-center text-sm text-gray-500">Đang tải…</p>}>
            <ResultsInner />
        </Suspense>
    )
}
