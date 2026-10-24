'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { saveMyBaseline } from '@/app/actions/baseline-actions'
import { METRIC_LABELS, type BaselineMetrics, type GrowthMap } from '@/lib/baseline/growth'

interface BaselineFormProps {
    courseId: number
    kind: 'A' | 'B'
    initial: (BaselineMetrics & { recordedAt: string; note: string | null }) | null
    /** Số liệu hệ thống đã tự đo (chỉ truyền cho form Điểm B) — học viên
     *  bấm một nút để điền, vẫn sửa được trước khi lưu. */
    suggestion?: { followers: number; views: number; customers: number; revenue: number } | null
}

const FIELDS = Object.keys(METRIC_LABELS) as (keyof BaselineMetrics)[]

export default function BaselineForm({ courseId, kind, initial, suggestion }: BaselineFormProps) {
    const router = useRouter()
    const [values, setValues] = useState<Record<string, string>>(() => {
        const v: Record<string, string> = {}
        for (const f of FIELDS) v[f] = initial ? String(initial[f]) : ''
        return v
    })
    const [note, setNote] = useState(initial?.note ?? '')
    const [busy, setBusy] = useState(false)
    const [message, setMessage] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    function applySuggestion() {
        if (!suggestion) return
        const v: Record<string, string> = {}
        for (const f of FIELDS) v[f] = String(suggestion[f as keyof typeof suggestion] ?? 0)
        setValues(v)
        setMessage('Đã điền số liệu hệ thống đo được — kiểm tra và chỉnh nếu cần rồi bấm Lưu.')
    }

    async function onSave() {
        setBusy(true)
        setError(null)
        setMessage(null)
        const metrics: Record<string, number> = {}
        for (const f of FIELDS) metrics[f] = values[f] === '' ? 0 : Number(values[f])
        const res = await saveMyBaseline({ courseId, kind, metrics, note })
        setBusy(false)
        if (!res.ok) {
            setError(res.error ?? 'Không lưu được, thử lại sau.')
            return
        }
        setMessage(`Đã lưu Điểm ${kind}.`)
        router.refresh()
    }

    return (
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="flex items-baseline justify-between gap-3">
                <h3 className="font-bold text-gray-900">Điểm {kind} {kind === 'A' ? '— Xuất phát điểm' : '— Kết quả'}</h3>
                {initial && <span className="text-xs text-gray-400">Đã ghi: {new Date(initial.recordedAt).toLocaleDateString('vi-VN')}</span>}
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4">
                {FIELDS.map((f) => (
                    <label key={f} className="block">
                        <span className="block text-xs font-medium text-gray-500 mb-1">{METRIC_LABELS[f]}</span>
                        <input
                            type="number"
                            min={0}
                            inputMode="numeric"
                            value={values[f]}
                            onChange={(e) => setValues((v) => ({ ...v, [f]: e.target.value }))}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                            placeholder="0"
                        />
                    </label>
                ))}
            </div>
            <label className="block mt-3">
                <span className="block text-xs font-medium text-gray-500 mb-1">Ghi chú (không bắt buộc)</span>
                <input
                    type="text"
                    value={note}
                    maxLength={500}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    placeholder="Ví dụ: số liệu tổng hợp các kênh tại thời điểm ghi"
                />
            </label>
            {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
            {message && <p className="mt-3 text-sm text-green-700">{message}</p>}
            {suggestion && (
                        <button type="button" onClick={applySuggestion} className="rounded-lg border border-emerald-600 text-emerald-700 px-3 py-2 text-sm font-medium">
                            Điền số liệu hệ thống đã đo
                        </button>
                    )}
                    <button
                type="button"
                disabled={busy}
                onClick={onSave}
                className="mt-4 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
                {busy ? 'Đang lưu...' : `Lưu Điểm ${kind}`}
            </button>
        </div>
    )
}

export function GrowthSummary({ growth }: { growth: GrowthMap }) {
    const fmt = (n: number) => n.toLocaleString('vi-VN')
    return (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <h3 className="font-bold text-emerald-900">Tăng trưởng Điểm A → Điểm B</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                {FIELDS.map((f) => {
                    const g = growth[f]
                    return (
                        <div key={f} className="rounded-xl bg-white/70 p-3">
                            <p className="text-xs text-gray-500">{METRIC_LABELS[f]}</p>
                            <p className="text-sm font-semibold text-gray-900 mt-1">{fmt(g.from)} → {fmt(g.to)}</p>
                            <p className={`text-xs mt-0.5 ${g.delta >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                                {g.delta >= 0 ? '+' : ''}{fmt(g.delta)}
                                {g.pct === null ? ' (từ 0)' : ` (${g.pct >= 0 ? '+' : ''}${g.pct.toFixed(1)}%)`}
                            </p>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
