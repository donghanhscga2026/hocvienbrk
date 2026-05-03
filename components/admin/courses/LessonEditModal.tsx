'use client'

import { useState } from 'react'
import { Loader2, X, Save } from 'lucide-react'

export function LessonEditModal({ lesson, onClose, onSave }: { lesson: any, onClose: () => void, onSave: (data: any) => Promise<void> }) {
    const [title, setTitle] = useState(lesson.title || '')
    const [videoUrl, setVideoUrl] = useState(lesson.videoUrl || '')
    const [order, setOrder] = useState(lesson.order || 0)
    const [lessonType, setLessonType] = useState(lesson.type || 'VIDEO')
    const [content, setContent] = useState(lesson.content || '')
    const [saving, setSaving] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        await onSave({ id: lesson.id, title, videoUrl, order, type: lessonType, content })
        setSaving(false)
        onClose()
    }

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                <div className="bg-gray-900 p-6 text-white flex justify-between items-center">
                    <h3 className="font-black text-sm uppercase tracking-widest">Sửa bài học #{lesson.order}</h3>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full"><X className="w-5 h-5 text-yellow-400" /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Tiêu đề bài học</label>
                        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none" required />       
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Loại bài học</label>
                        <select value={lessonType} onChange={(e) => setLessonType(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none">
                            <option value="VIDEO">Video (YouTube)</option>
                            <option value="DOCS">Tài liệu (Docs)</option>
                            <option value="TEXT">Văn bản (Text)</option>
                        </select>
                    </div>
                    {(lessonType === 'VIDEO' || lessonType === 'DOCS') && (
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-gray-400 ml-1">{lessonType === 'VIDEO' ? 'Link Video (YouTube)' : 'Link Tài liệu (Docs)'}</label>
                            <input type="text" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none" placeholder={lessonType === 'VIDEO' ? "https://youtube.com/..." : "https://docs.google.com/..."} />
                        </div>
                    )}
                    {lessonType === 'TEXT' && (
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Nội dung văn bản</label>
                            <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={10} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm outline-none resize-y" placeholder="Nhập nội dung bài học..." />
                        </div>
                    )}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Thứ tự hiển thị</label>
                        <input type="number" value={order} onChange={(e) => setOrder(parseInt(e.target.value))} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none" required />
                    </div>
                    <button type="submit" disabled={saving} className="w-full bg-black text-yellow-400 py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2">
                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        Cập nhật bài học
                    </button>
                </form>
            </div>
        </div>
    )
}
