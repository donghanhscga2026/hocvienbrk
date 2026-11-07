'use client'

import { Suspense, useCallback, useEffect, useState, use } from 'react'
import { ArrowLeft, ArrowDown, ArrowUp, Loader2, Plus, Save, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import MainHeader from '@/components/layout/MainHeader'
import { formatSegmentTime, parseTimeInput } from '@/lib/course/segments'

// Thư viện bài giảng thông minh (GĐ1) — trang GV sửa đoạn bằng tay.
// Đây cũng là nơi GV DUYỆT các đoạn DRAFT do pipeline STT/AI đề xuất ở giai
// đoạn sau: sửa mốc/tiêu đề/tóm tắt/từ khóa rồi chuyển sang PUBLISHED.
// Mốc giờ nhập dạng mm:ss (hoặc h:mm:ss, hoặc số giây).

type SegmentRow = {
    id: string
    videoIndex: number
    startSec: number
    endSec: number
    title: string
    summary: string | null
    keywords: string[]
    order: number
    status: string
}

type FormState = {
    videoIndex: string
    start: string
    end: string
    title: string
    summary: string
    keywords: string
    status: string
}

const emptyForm: FormState = { videoIndex: '0', start: '', end: '', title: '', summary: '', keywords: '', status: 'DRAFT' }

function SegmentsEditor({ courseId }: { courseId: number }) {
    const searchParams = useSearchParams()
    const [lessons, setLessons] = useState<any[]>([])
    const [lessonId, setLessonId] = useState<string>(searchParams.get('lesson') || '')
    const [segments, setSegments] = useState<SegmentRow[]>([])
    const [loading, setLoading] = useState(true)
    const [loadingSegments, setLoadingSegments] = useState(false)
    const [saving, setSaving] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [form, setForm] = useState<FormState>(emptyForm)
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

    useEffect(() => {
        fetch(`/api/courses/${courseId}`)
            .then(res => (res.ok ? res.json() : null))
            .then(data => {
                const list = data?.lessons || []
                setLessons(list)
                // Mặc định chọn bài đầu tiên CÓ đoạn (nơi GV cần duyệt) thay vì bài đầu tiên của khóa
                setLessonId(prev => prev || (list.find((l: any) => (l._count?.segments ?? 0) > 0)?.id ?? list[0]?.id ?? ''))
            })
            .catch(() => setMessage({ text: 'Không tải được danh sách bài học', type: 'error' }))
            .finally(() => setLoading(false))
    }, [courseId])

    const fetchSegments = useCallback(async () => {
        if (!lessonId) { setSegments([]); return }
        setLoadingSegments(true)
        try {
            const res = await fetch(`/api/courses/${courseId}/lessons/${lessonId}/segments`)
            const data = await res.json()
            if (res.ok && data.success) setSegments(data.segments || [])
            else setMessage({ text: data.error || 'Không tải được danh sách đoạn', type: 'error' })
        } catch {
            setMessage({ text: 'Lỗi kết nối khi tải danh sách đoạn', type: 'error' })
        }
        setLoadingSegments(false)
    }, [courseId, lessonId])

    useEffect(() => { fetchSegments() }, [fetchSegments])

    const notify = (text: string, type: 'success' | 'error') => setMessage({ text, type })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const startSec = parseTimeInput(form.start)
        const endSec = parseTimeInput(form.end)
        if (startSec === null || endSec === null) return notify('Mốc giờ không hợp lệ — nhập dạng mm:ss (ví dụ 45:00)', 'error')
        if (endSec <= startSec) return notify('Mốc kết thúc phải lớn hơn mốc bắt đầu', 'error')
        if (!form.title.trim()) return notify('Tiêu đề đoạn là bắt buộc', 'error')

        setSaving(true)
        setMessage(null)
        const payload = {
            videoIndex: parseInt(form.videoIndex) || 0,
            startSec,
            endSec,
            title: form.title.trim(),
            summary: form.summary.trim() || null,
            keywords: form.keywords,
            status: form.status,
        }
        try {
            const url = editingId
                ? `/api/courses/${courseId}/lessons/${lessonId}/segments/${editingId}`
                : `/api/courses/${courseId}/lessons/${lessonId}/segments`
            const res = await fetch(url, {
                method: editingId ? 'PATCH' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            const data = await res.json()
            if (res.ok && data.success) {
                notify(editingId ? 'Đã cập nhật đoạn' : 'Đã thêm đoạn', 'success')
                setForm(emptyForm)
                setEditingId(null)
                fetchSegments()
            } else {
                notify(data.error || 'Lưu đoạn thất bại', 'error')
            }
        } catch {
            notify('Lỗi kết nối khi lưu đoạn', 'error')
        }
        setSaving(false)
    }

    const startEdit = (seg: SegmentRow) => {
        setEditingId(seg.id)
        setForm({
            videoIndex: String(seg.videoIndex),
            start: formatSegmentTime(seg.startSec),
            end: formatSegmentTime(seg.endSec),
            title: seg.title,
            summary: seg.summary || '',
            keywords: seg.keywords.join(', '),
            status: seg.status,
        })
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const handleDelete = async (seg: SegmentRow) => {
        if (!window.confirm(`Xóa đoạn "${seg.title}"?`)) return
        const res = await fetch(`/api/courses/${courseId}/lessons/${lessonId}/segments/${seg.id}`, { method: 'DELETE' })
        const data = await res.json().catch(() => ({}))
        if (res.ok && data.success) { notify('Đã xóa đoạn', 'success'); fetchSegments() }
        else notify(data.error || 'Xóa đoạn thất bại', 'error')
    }

    const patchSegment = async (seg: SegmentRow, patchBody: Record<string, unknown>, okText: string) => {
        const res = await fetch(`/api/courses/${courseId}/lessons/${lessonId}/segments/${seg.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(patchBody),
        })
        const data = await res.json().catch(() => ({}))
        if (res.ok && data.success) { notify(okText, 'success'); fetchSegments() }
        else notify(data.error || 'Thao tác thất bại', 'error')
    }

    const toggleStatus = (seg: SegmentRow) =>
        patchSegment(seg, { status: seg.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED' },
            seg.status === 'PUBLISHED' ? 'Đã chuyển đoạn về bản nháp' : 'Đã xuất bản đoạn — học viên xem được ngay')

    const move = async (index: number, dir: -1 | 1) => {
        const other = segments[index + dir]
        const seg = segments[index]
        if (!other || !seg) return
        // Hoán đổi order của 2 đoạn kề nhau
        await patchSegment(seg, { order: other.order }, 'Đã sắp xếp lại đoạn')
        await patchSegment(other, { order: seg.order }, 'Đã sắp xếp lại đoạn')
    }

    const inputCls = 'min-h-11 w-full rounded-xl border border-brk-outline bg-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500'

    return (
        <div className="mx-auto max-w-4xl px-3 py-4 sm:px-6">
            <Link href={`/tools/courses/new?id=${courseId}&tab=lessons`} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brk-primary">
                <ArrowLeft className="w-4 h-4" /> Về danh sách bài giảng
            </Link>
            <h1 className="mt-1 text-xl font-black text-gray-900">Đoạn bài giảng — chia đoạn & duyệt nội dung</h1>
            <p className="mt-1 text-sm text-gray-500">
                Mỗi đoạn là một phần nội dung trong video: học viên bấm vào đoạn để xem đúng phần đó.
                Đoạn ở trạng thái bản nháp thì học viên chưa thấy; xuất bản mới hiển thị.
            </p>

            {message && (
                <div className={`mt-3 rounded-xl px-4 py-3 text-sm font-semibold ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                    {message.text}
                </div>
            )}

            <label className="mt-4 block text-xs font-bold text-gray-500">Chọn bài học</label>
            {loading ? (
                <div className="mt-2 flex items-center gap-2 text-sm text-gray-500"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải…</div>
            ) : (
                <select value={lessonId} onChange={e => { setLessonId(e.target.value); setEditingId(null); setForm(emptyForm) }} className={inputCls + ' mt-1'}>
                    {lessons.map((l: any) => (
                        <option key={l.id} value={l.id}>#{l.order} — {l.title}{(l._count?.segments ?? 0) > 0 ? ` (${l._count.segments} đoạn)` : ''}</option>
                    ))}
                </select>
            )}

            <form onSubmit={handleSubmit} className="mt-5 rounded-2xl border border-brk-outline bg-white p-4 space-y-3">
                <h2 className="text-sm font-black text-gray-900 flex items-center gap-2">
                    {editingId ? <><Save className="w-4 h-4 text-orange-500" /> Sửa đoạn</> : <><Plus className="w-4 h-4 text-orange-500" /> Thêm đoạn mới</>}
                </h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Video số (playlist)</label>
                        <input value={form.videoIndex} onChange={e => setForm({ ...form, videoIndex: e.target.value })} inputMode="numeric" className={inputCls} placeholder="0" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Bắt đầu (mm:ss)</label>
                        <input value={form.start} onChange={e => setForm({ ...form, start: e.target.value })} className={inputCls} placeholder="45:00" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Kết thúc (mm:ss)</label>
                        <input value={form.end} onChange={e => setForm({ ...form, end: e.target.value })} className={inputCls} placeholder="50:00" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Trạng thái</label>
                        <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className={inputCls}>
                            <option value="DRAFT">Bản nháp (học viên chưa thấy)</option>
                            <option value="PUBLISHED">Xuất bản (học viên thấy)</option>
                        </select>
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Tiêu đề đoạn</label>
                    <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className={inputCls} placeholder="Ví dụ: Ba giai đoạn doanh nghiệp số" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Tóm tắt (1–3 câu)</label>
                    <textarea value={form.summary} onChange={e => setForm({ ...form, summary: e.target.value })} className={inputCls + ' py-2'} rows={3} placeholder="Đoạn này giảng về…" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Từ khóa (cách nhau dấu phẩy)</label>
                    <input value={form.keywords} onChange={e => setForm({ ...form, keywords: e.target.value })} className={inputCls} placeholder="định vị, đóng gói, dòng tiền" />
                </div>
                <div className="flex gap-2">
                    <button type="submit" disabled={saving || !lessonId} className="min-h-11 flex-1 rounded-xl bg-orange-500 px-4 text-sm font-bold text-white disabled:opacity-50 active:scale-[0.99]">
                        {saving ? 'Đang lưu…' : editingId ? 'Lưu thay đổi' : 'Thêm đoạn'}
                    </button>
                    {editingId && (
                        <button type="button" onClick={() => { setEditingId(null); setForm(emptyForm) }} className="min-h-11 rounded-xl border border-gray-300 px-4 text-sm font-bold text-gray-600">
                            Hủy sửa
                        </button>
                    )}
                </div>
            </form>

            <h2 className="mt-6 text-sm font-black text-gray-900">Danh sách đoạn ({segments.length})</h2>
            {loadingSegments ? (
                <div className="mt-2 flex items-center gap-2 text-sm text-gray-500"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải đoạn…</div>
            ) : segments.length === 0 ? (
                <p className="mt-2 text-sm text-gray-400">Bài học này chưa có đoạn nào.</p>
            ) : (
                <div className="mt-2 divide-y divide-gray-100 rounded-2xl border border-brk-outline bg-white">
                    {segments.map((seg, i) => (
                        <div key={seg.id} className="flex flex-wrap items-center gap-2 p-3">
                            <span className="text-xs font-black tabular-nums text-teal-700 min-w-14">
                                {formatSegmentTime(seg.startSec)}–{formatSegmentTime(seg.endSec)}
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-bold text-gray-800">{seg.title}</p>
                                <p className="text-[11px] text-gray-400">Video {seg.videoIndex} · thứ tự {seg.order}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => toggleStatus(seg)}
                                className={`min-h-11 rounded-full px-3 text-[11px] font-bold ${seg.status === 'PUBLISHED' ? 'bg-teal-50 text-teal-700 border border-teal-300' : 'bg-amber-50 text-amber-700 border border-amber-300'}`}
                            >
                                {seg.status === 'PUBLISHED' ? 'Đã xuất bản' : 'Bản nháp'}
                            </button>
                            <button type="button" aria-label="Lên" disabled={i === 0} onClick={() => move(i, -1)} className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-50 text-gray-500 disabled:opacity-30"><ArrowUp className="w-4 h-4" /></button>
                            <button type="button" aria-label="Xuống" disabled={i === segments.length - 1} onClick={() => move(i, 1)} className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-50 text-gray-500 disabled:opacity-30"><ArrowDown className="w-4 h-4" /></button>
                            <button type="button" onClick={() => startEdit(seg)} className="min-h-11 rounded-xl bg-gray-900 px-3 text-xs font-bold text-white">Sửa</button>
                            <button type="button" aria-label="Xóa đoạn" onClick={() => handleDelete(seg)} className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-500"><Trash2 className="w-4 h-4" /></button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default function CourseSegmentsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    return (
        <div className="min-h-screen bg-brk-background">
            <MainHeader title="Đoạn bài giảng" toolSlug="courses" />
            <Suspense fallback={<div className="p-6 text-sm text-gray-500">Đang tải…</div>}>
                <SegmentsEditor courseId={parseInt(id)} />
            </Suspense>
        </div>
    )
}
