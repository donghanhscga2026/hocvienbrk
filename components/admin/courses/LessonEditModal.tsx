'use client'

import { useState } from 'react'
import { Loader2, X, Save, Trash2, Upload } from 'lucide-react'

export function LessonEditModal({ lesson, onClose, onSave, onDelete }: {
    lesson: any,
    onClose: () => void,
    onSave: (data: any) => Promise<void>,
    onDelete?: (id: string) => Promise<void>
}) {
    const [title, setTitle] = useState(lesson.title || '')
    const [videoUrl, setVideoUrl] = useState(lesson.videoUrl || '')
    const [order, setOrder] = useState(lesson.order || 0)
    const [lessonType, setLessonType] = useState(lesson.type || 'VIDEO')
    const [content, setContent] = useState(lesson.content || '')
    const [imageUrl, setImageUrl] = useState(lesson.imageUrl || '')
    const [uploadingImage, setUploadingImage] = useState(false)
    const [isDailyChallenge, setIsDailyChallenge] = useState(lesson.isDailyChallenge || false)
    const [saving, setSaving] = useState(false)
    const [deleting, setDeleting] = useState(false)

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        e.target.value = ''
        if (!file) return

        setUploadingImage(true)
        try {
            const formData = new FormData()
            formData.append('file', file)
            const res = await fetch('/api/upload/lesson', { method: 'POST', body: formData })
            const data = await res.json()
            if (data.url) {
                setImageUrl(data.url)
            }
        } finally {
            setUploadingImage(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        await onSave({ id: lesson.id, title, videoUrl, order, type: lessonType, content, imageUrl: imageUrl || null, isDailyChallenge })
        setSaving(false)
        onClose()
    }

    const handleDelete = async () => {
        if (!onDelete) return
        if (!window.confirm('Bạn có chắc chắn muốn xóa bài học này?')) return
        setDeleting(true)
        await onDelete(lesson.id)
        setDeleting(false)
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
                            <option value="VIDEO">Video (YouTube, Vimeo, MP4...)</option>
                            <option value="DOCS">Tài liệu (Docs)</option>
                            <option value="TEXT">Văn bản (Text)</option>
                        </select>
                    </div>
                    {(lessonType === 'VIDEO' || lessonType === 'DOCS') && (
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-gray-400 ml-1">{lessonType === 'VIDEO' ? 'Link Video' : 'Link Tài liệu (Docs)'}</label>
                            <input type="text" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none" placeholder={lessonType === 'VIDEO' ? "https://youtube.com, vimeo.com, fb.com, .mp4..." : "https://docs.google.com/..."} />
                        </div>
                    )}
                    {lessonType !== 'DOCS' && (
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-gray-400 ml-1">
                                {lessonType === 'TEXT' ? 'Nội dung văn bản' : 'Nội dung / mô tả bài học (hiện dưới video)'}
                            </label>
                            <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={lessonType === 'TEXT' ? 10 : 4} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm outline-none resize-y" placeholder="Nhập nội dung bài học..." />
                        </div>
                    )}
                    {lessonType !== 'DOCS' && (
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Hình ảnh đính kèm</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={imageUrl}
                                    onChange={(e) => setImageUrl(e.target.value)}
                                    className="flex-1 bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none"
                                    placeholder="https://... hoặc /uploads/lessons/..."
                                />
                                <label className="flex items-center gap-2 px-4 py-3 bg-blue-50 text-blue-600 rounded-2xl cursor-pointer hover:bg-blue-100 transition-all text-sm font-bold whitespace-nowrap">
                                    <Upload className="w-4 h-4" />
                                    {uploadingImage ? 'Đang tải...' : 'Upload'}
                                    <input
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp,image/gif"
                                        onChange={handleImageUpload}
                                        className="hidden"
                                        disabled={uploadingImage}
                                    />
                                </label>
                            </div>
                            {imageUrl && (
                                <div className="mt-2 bg-gray-50 rounded-2xl p-4 flex flex-col items-center gap-2">
                                    <img src={imageUrl} alt="Preview" className="max-w-full max-h-64 object-contain rounded-xl" />
                                    <button type="button" onClick={() => setImageUrl('')} className="text-[11px] font-bold text-red-500 hover:text-red-600">Xóa ảnh</button>
                                </div>
                            )}
                        </div>
                    )}
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
                    
                    <div className="flex gap-2">
                        {onDelete && (
                            <button type="button" onClick={handleDelete} disabled={deleting || saving} className="flex-1 bg-red-50 text-red-600 py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-red-100 transition-all">
                                {deleting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                                Xóa
                            </button>
                        )}
                        <button type="submit" disabled={saving || deleting} className="flex-[2] bg-black text-yellow-400 py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2">
                            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                            Cập nhật
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
