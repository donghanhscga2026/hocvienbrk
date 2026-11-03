'use client'

import { useState } from 'react'
import { submitCourseSurveyAction } from '@/app/actions/course-survey-actions'

type Question = {
    id: number
    type: 'SINGLE' | 'MULTI' | 'RATING' | 'TEXT'
    label: string
    required: boolean
    options: string[]
}

type AnswerState = { value?: string | string[] | number; text?: string }

export default function SurveyAnswerForm({
    surveyId,
    anonymous,
    questions,
}: {
    surveyId: number
    anonymous: boolean
    questions: Question[]
}) {
    const [answers, setAnswers] = useState<Record<number, AnswerState>>({})
    const [sending, setSending] = useState(false)
    const [error, setError] = useState('')
    const [done, setDone] = useState(false)

    const setAnswer = (questionId: number, patch: AnswerState) => {
        setAnswers(prev => ({ ...prev, [questionId]: { ...prev[questionId], ...patch } }))
    }

    const toggleMulti = (questionId: number, option: string) => {
        setAnswers(prev => {
            const current = Array.isArray(prev[questionId]?.value) ? (prev[questionId].value as string[]) : []
            const next = current.includes(option) ? current.filter(v => v !== option) : [...current, option]
            return { ...prev, [questionId]: { value: next } }
        })
    }

    const handleSubmit = async () => {
        setError('')
        for (const q of questions) {
            if (!q.required) continue
            const a = answers[q.id]
            const missing =
                q.type === 'TEXT'
                    ? !a?.text?.trim()
                    : q.type === 'MULTI'
                      ? !Array.isArray(a?.value) || a.value.length === 0
                      : a?.value === undefined || a?.value === ''
            if (missing) {
                setError(`Bạn chưa trả lời câu bắt buộc: ${q.label}`)
                return
            }
        }
        setSending(true)
        const res = await submitCourseSurveyAction({
            surveyId,
            answers: questions.map(q => ({
                questionId: q.id,
                value: answers[q.id]?.value,
                text: answers[q.id]?.text,
            })),
        })
        setSending(false)
        if (!res.success) {
            setError(res.error)
            return
        }
        setDone(true)
    }

    if (done) {
        return (
            <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-6 text-center">
                <p className="text-sm font-semibold text-green-800">Đã gửi câu trả lời thành công. Cảm ơn bạn!</p>
                {anonymous && <p className="mt-1 text-xs text-green-700">Khảo sát ẩn danh — giảng viên không thấy tên của bạn.</p>}
            </div>
        )
    }

    return (
        <div className="mt-5 space-y-3">
            {questions.map((q, idx) => (
                <div key={q.id} className="rounded-2xl border border-brk-outline bg-white p-4">
                    <p className="text-sm font-medium">
                        {idx + 1}. {q.label}
                        {q.required && <span className="text-red-500"> *</span>}
                    </p>

                    {q.type === 'SINGLE' && (
                        <div className="mt-2 space-y-1">
                            {q.options.map(opt => (
                                <label key={opt} className="flex min-h-10 cursor-pointer items-center gap-2 rounded-lg px-2 text-sm hover:bg-brk-background">
                                    <input
                                        type="radio"
                                        name={`q-${q.id}`}
                                        checked={answers[q.id]?.value === opt}
                                        onChange={() => setAnswer(q.id, { value: opt })}
                                        className="h-4 w-4"
                                    />
                                    {opt}
                                </label>
                            ))}
                        </div>
                    )}

                    {q.type === 'MULTI' && (
                        <div className="mt-2 space-y-1">
                            {q.options.map(opt => {
                                const selected = Array.isArray(answers[q.id]?.value) && (answers[q.id].value as string[]).includes(opt)
                                return (
                                    <label key={opt} className="flex min-h-10 cursor-pointer items-center gap-2 rounded-lg px-2 text-sm hover:bg-brk-background">
                                        <input type="checkbox" checked={Boolean(selected)} onChange={() => toggleMulti(q.id, opt)} className="h-4 w-4" />
                                        {opt}
                                    </label>
                                )
                            })}
                        </div>
                    )}

                    {q.type === 'RATING' && (
                        <div className="mt-2 flex gap-1">
                            {[1, 2, 3, 4, 5].map(n => {
                                const current = typeof answers[q.id]?.value === 'number' ? (answers[q.id].value as number) : 0
                                return (
                                    <button
                                        key={n}
                                        type="button"
                                        onClick={() => setAnswer(q.id, { value: n })}
                                        aria-label={`${n} điểm`}
                                        className={`flex h-11 w-11 items-center justify-center rounded-xl border text-lg ${
                                            n <= current ? 'border-amber-300 bg-amber-50 text-amber-500' : 'border-brk-outline bg-white text-gray-300'
                                        }`}
                                    >
                                        ★
                                    </button>
                                )
                            })}
                            <span className="ml-2 self-center text-xs text-gray-500">
                                {typeof answers[q.id]?.value === 'number' ? `${answers[q.id].value} / 5` : 'Chạm để chấm điểm'}
                            </span>
                        </div>
                    )}

                    {q.type === 'TEXT' && (
                        <textarea
                            value={answers[q.id]?.text || ''}
                            onChange={e => setAnswer(q.id, { text: e.target.value })}
                            maxLength={2000}
                            rows={3}
                            placeholder="Nhập câu trả lời của bạn…"
                            className="mt-2 w-full rounded-xl border border-brk-outline px-3 py-2 text-sm"
                        />
                    )}
                </div>
            ))}

            {error && (
                <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {error}
                </div>
            )}

            <button
                type="button"
                disabled={sending}
                onClick={() => void handleSubmit()}
                className="min-h-12 w-full rounded-xl bg-brk-primary px-4 text-sm font-semibold text-white disabled:opacity-50"
            >
                {sending ? 'Đang gửi…' : 'Gửi trả lời'}
            </button>
        </div>
    )
}
