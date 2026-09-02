'use client'

import { useState } from 'react'
import { Loader2, X, Save } from 'lucide-react'
import { LessonPartsEditor } from './LessonPartsEditor'
import { serializeLessonParts, type LessonPartDraft } from '@/lib/course/lesson-parts'

export function AddLessonModal({ courseId, defaultOrder, onClose, onComplete }: { courseId: string, defaultOrder?: number, onClose: () => void, onComplete: () => void }) {
    const [title, setTitle] = useState('')
    const [order, setOrder] = useState(defaultOrder ?? 1)
    const [parts, setParts] = useState<LessonPartDraft[]>([{ type: 'VIDEO', title: '', value: '' }])
    const [extraDescription, setExtraDescription] = useState('')
    const [isDailyChallenge, setIsDailyChallenge] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!title.trim()) return

        const result = serializeLessonParts(parts, extraDescription)
        if (!result.ok) {
            setError(result.error)
            return
        }
        setError('')

        setSaving(true)
        try {
            const res = await fetch(`/api/courses/${courseId}/lessons`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, videoUrl: result.videoUrl, order: parseInt(order.toString()), type: result.type, content: result.content, isDailyChallenge })
            }).then(r => r.json())

            if (res.success) {
                onComplete()
                onClose()
            } else {
                setError(res.error || 'Lỗi khi tạo bài học')
            }
        } catch (err: any) {
            setError('Lỗi: ' + err.message)
        }
        setSaving(false)
    }

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="bg-gray-900 p-6 text-white flex justify-between items-center shrink-0">
                    <h3 className="font-black text-sm uppercase tracking-widest">Thêm bài học mới</h3>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full"><X className="w-5 h-5 text-yellow-400" /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Tiêu đề bài học</label>
                        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none" required />
                    </div>

                    <LessonPartsEditor
                        parts={parts}
                        onChange={setParts}
                        extraDescription={extraDescription}
                        onExtraDescriptionChange={setExtraDescription}
                    />

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Thứ tự hiển thị</label>
                        <input type="number" value={order} onChange={(e) => setOrder(parseInt(e.target.value))} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none" required />
                    </div>
                    <label className="flex items-center gap-3 cursor-pointer bg-orange-50 rounded-2xl px-4 py-3 border border-orange-200">
                        <input type="checkbox" checked={isDailyChallenge} onChange={(e) => setIsDailyChallenge(e.target.checked)} className="w-5 h-5 rounded accent-orange-500" />
                        <div>
                            <span className="text-sm font-black text-orange-700">📝 Bài tập bắt buộc</span>
                            <p className="text-[10px] text-orange-500/70">Thành viên phải ghi nhận (làm bài tập) trước khi chuyển sang bài khác</p>
                        </div>
                    </label>
                    {error && <p className="text-xs text-red-500 font-bold">{error}</p>}
                    <button type="submit" disabled={saving} className="w-full bg-black text-yellow-400 py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2">
                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        Tạo bài học
                    </button>
                </form>
            </div>
        </div>
    )
}
