'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { previewZoomImport, commitZoomImport, type ImportPreview } from '@/app/actions/attendance-actions'

export default function ZoomImport({ courseId }: { courseId: number }) {
    const router = useRouter()
    const fileRef = useRef<HTMLInputElement>(null)
    const [title, setTitle] = useState('')
    const [sessionDate, setSessionDate] = useState('')
    const [duration, setDuration] = useState('90')
    const [markAbsent, setMarkAbsent] = useState(true)
    const [preview, setPreview] = useState<ImportPreview | null>(null)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [done, setDone] = useState<string | null>(null)

    async function onPreview() {
        const file = fileRef.current?.files?.[0]
        if (!file) { setError('Hãy chọn file CSV báo cáo Zoom trước.'); return }
        setBusy(true); setError(null); setDone(null); setPreview(null)
        const fd = new FormData()
        fd.set('courseId', String(courseId))
        fd.set('file', file)
        const res = await previewZoomImport(fd)
        setBusy(false)
        if (!res.ok) { setError(res.error ?? 'Không xem trước được.'); return }
        setPreview(res)
    }

    async function onCommit() {
        if (!preview) return
        setBusy(true); setError(null)
        const res = await commitZoomImport({
            courseId,
            title,
            sessionDate,
            durationMinutes: Number(duration) || 90,
            markAbsent,
            rows: preview.rows,
        })
        setBusy(false)
        if (!res.ok) { setError(res.error ?? 'Không ghi được điểm danh.'); return }
        setDone(`Đã ghi điểm danh: ${res.presentCount} học viên có mặt${markAbsent ? `, ${res.absentCount} vắng` : ''}.`)
        setPreview(null)
        router.refresh()
    }

    return (
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="font-bold text-gray-900">Nhập điểm danh từ báo cáo Zoom</h2>
            <p className="text-sm text-gray-500 mt-1">
                Xuất file CSV danh sách người tham dự từ Zoom và tải lên đây. Hệ thống đối chiếu theo email
                (dự phòng: theo tên) với học viên đang học của khóa — luôn xem trước kết quả rồi mới ghi.
            </p>
            <div className="grid md:grid-cols-3 gap-3 mt-4">
                <label className="block md:col-span-1">
                    <span className="block text-xs font-medium text-gray-500 mb-1">Tên buổi học</span>
                    <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="Ví dụ: Buổi 12 — Xây kênh" />
                </label>
                <label className="block">
                    <span className="block text-xs font-medium text-gray-500 mb-1">Ngày học</span>
                    <input type="date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                </label>
                <label className="block">
                    <span className="block text-xs font-medium text-gray-500 mb-1">Thời lượng buổi (phút)</span>
                    <input type="number" min={1} max={1440} value={duration} onChange={(e) => setDuration(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                </label>
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-4">
                <input ref={fileRef} type="file" accept=".csv,text/csv" className="text-sm" />
                <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input type="checkbox" checked={markAbsent} onChange={(e) => setMarkAbsent(e.target.checked)} />
                    Đánh dấu vắng cho học viên không có trong file
                </label>
                <button type="button" disabled={busy} onClick={onPreview} className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                    {busy ? 'Đang xử lý...' : 'Xem trước kết quả khớp'}
                </button>
            </div>

            {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
            {done && <p className="mt-3 text-sm text-green-700">{done}</p>}

            {preview && (
                <div className="mt-5 border-t border-gray-100 pt-4">
                    {preview.warnings.length > 0 && (
                        <ul className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3 list-disc list-inside">
                            {preview.warnings.map((w, i) => <li key={i}>{w}</li>)}
                        </ul>
                    )}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 text-center">
                        <div className="rounded-xl bg-gray-50 p-3"><p className="text-xs text-gray-500">Dòng trong file</p><p className="text-lg font-bold">{preview.totalRows}</p></div>
                        <div className="rounded-xl bg-emerald-50 p-3"><p className="text-xs text-gray-500">Khớp học viên</p><p className="text-lg font-bold text-emerald-700">{preview.matched.length}</p></div>
                        <div className="rounded-xl bg-red-50 p-3"><p className="text-xs text-gray-500">Không khớp (sẽ bỏ qua)</p><p className="text-lg font-bold text-red-600">{preview.unmatched.length}</p></div>
                        <div className="rounded-xl bg-gray-50 p-3"><p className="text-xs text-gray-500">{markAbsent ? 'Sẽ đánh dấu vắng' : 'Không có trong file'}</p><p className="text-lg font-bold">{preview.absent.length}</p></div>
                    </div>

                    {preview.unmatched.length > 0 && (
                        <details className="mt-3">
                            <summary className="text-sm font-medium text-gray-700 cursor-pointer">Xem {preview.unmatched.length} dòng không khớp</summary>
                            <ul className="mt-2 text-sm text-gray-500 list-disc list-inside max-h-48 overflow-auto">
                                {preview.unmatched.map((u, i) => <li key={i}>{u.name || '(không tên)'} — {u.email || '(không email)'} — {u.minutes} phút</li>)}
                            </ul>
                        </details>
                    )}

                    <button type="button" disabled={busy || !title || !sessionDate} onClick={onCommit} className="mt-4 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                        {busy ? 'Đang ghi...' : 'Xác nhận ghi điểm danh'}
                    </button>
                    {(!title || !sessionDate) && <span className="ml-3 text-sm text-gray-400">Nhập tên buổi và ngày học để xác nhận.</span>}
                </div>
            )}
        </div>
    )
}
