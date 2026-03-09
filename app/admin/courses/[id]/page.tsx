'use client'

import { useState, useEffect, use } from 'react'
import { updateCourseAction, updateLessonAction } from '@/app/actions/admin-actions'
import { ArrowLeft, Save, Loader2, CheckCircle2, AlertCircle, Play, Edit2, X, List, Settings } from 'lucide-react'
import Link from 'next/link'

// ─── Component Popup Chỉnh sửa Bài học ──────────────────────────────────────────
function LessonEditModal({ lesson, onClose, onSave }: { lesson: any, onClose: () => void, onSave: (data: any) => Promise<void> }) {
    const [title, setTitle] = useState(lesson.title || '')
    const [videoUrl, setVideoUrl] = useState(lesson.videoUrl || '')
    const [order, setOrder] = useState(lesson.order || 0)
    const [saving, setSaving] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        await onSave({ id: lesson.id, title, videoUrl, order })
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
                        <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Link Video (YouTube)</label>
                        <input type="text" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none" placeholder="https://youtube.com/..." />
                    </div>
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

export default function EditCoursePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const [course, setCourse] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
    const [selectedLesson, setSelectedLesson] = useState<any>(null)

    const [nameLop, setNameLop] = useState('')
    const [phiCoc, setPhiCoc] = useState(0)
    const [idKhoa, setIdKhoa] = useState('')
    const [noidungEmail, setNoidungEmail] = useState('')

    const fetchData = async () => {
        setLoading(true)
        const res = await fetch(`/api/courses/${id}`).then(r => r.json())
        if (res && !res.error) {
            setCourse(res)
            setNameLop(res.name_lop || '')
            setPhiCoc(res.phi_coc || 0)
            setIdKhoa(res.id_khoa || '')
            setNoidungEmail(res.noidung_email || '')
        }
        setLoading(false)
    }

    useEffect(() => { fetchData() }, [id])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        setMessage(null)
        const res = await updateCourseAction(parseInt(id), {
            name_lop: nameLop, phi_coc: phiCoc, id_khoa: idKhoa, noidung_email: noidungEmail
        })
        if (res.success) setMessage({ type: 'success', text: 'Đã lưu thông tin khóa học!' })
        else setMessage({ type: 'error', text: res.error || 'Lỗi khi lưu.' })
        setSaving(false)
    }

    const handleUpdateLesson = async (data: any) => {
        const res = await updateLessonAction(data.id, {
            title: data.title, videoUrl: data.videoUrl, order: data.order
        })
        if (res.success) {
            setMessage({ type: 'success', text: 'Đã cập nhật bài học thành công!' })
            fetchData() // Tải lại danh sách
        }
    }

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500 mb-2" />
            <p className="text-xs font-black uppercase">Đang tải...</p>
        </div>
    )

    return (
        <div className="max-w-md mx-auto space-y-8 pb-32">
            <Link href="/admin/courses" className="inline-flex items-center gap-2 text-xs font-black text-gray-400 uppercase hover:text-purple-600 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Khóa học
            </Link>

            {/* PHẦN 1: THÔNG TIN KHÓA HỌC */}
            <div className="bg-white rounded-[2.5rem] p-6 shadow-xl border border-gray-100">
                <h1 className="text-xl font-black text-gray-900 mb-6 uppercase tracking-tight flex items-center gap-2">
                    <Edit2 className="w-5 h-5 text-purple-500" /> Sửa Khóa học
                </h1>
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-1.5"><label className="text-[10px] font-black uppercase text-gray-400 ml-1">Tên lớp học</label>
                        <input type="text" value={nameLop} onChange={(e) => setNameLop(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none" required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5"><label className="text-[10px] font-black uppercase text-gray-400 ml-1">Học phí</label>
                            <input type="number" value={phiCoc} onChange={(e) => setPhiCoc(parseInt(e.target.value))} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none" />
                        </div>
                        <div className="space-y-1.5"><label className="text-[10px] font-black uppercase text-gray-400 ml-1">Mã khóa</label>
                            <input type="text" value={idKhoa} onChange={(e) => setIdKhoa(e.target.value.toUpperCase())} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none" />
                        </div>
                    </div>
                    <div className="space-y-1.5"><label className="text-[10px] font-black uppercase text-gray-400 ml-1">Email kích hoạt</label>
                        <textarea value={noidungEmail} onChange={(e) => setNoidungEmail(e.target.value)} rows={4} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm outline-none" />
                    </div>
                    {message && (
                        <div className={`p-4 rounded-2xl flex items-center gap-3 text-xs font-bold ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                            {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                            {message.text}
                        </div>
                    )}
                    <button type="submit" disabled={saving} className="w-full bg-black text-yellow-400 py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all">
                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} Lưu Khóa học
                    </button>
                </form>
            </div>

            {/* PHẦN 2: DANH SÁCH BÀI HỌC */}
            <div className="space-y-4">
                <h2 className="text-lg font-black text-gray-900 flex items-center gap-2 px-2 uppercase tracking-tight">
                    <List className="w-5 h-5 text-indigo-500" /> Bài giảng ({course?.lessons?.length || 0})
                </h2>
                <div className="space-y-3">
                    {course?.lessons?.map((lesson: any) => (
                        <div key={lesson.id} className="bg-white p-4 rounded-3xl border border-gray-100 shadow-lg shadow-gray-100/50 flex items-center justify-between group">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-xs font-black font-mono">
                                    #{lesson.order}
                                </div>
                                <div className="space-y-0.5">
                                    <h4 className="text-sm font-black text-gray-800 leading-tight">{lesson.title}</h4>
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase">
                                        <Play className="w-3 h-3" /> {lesson.videoUrl ? 'Đã có Video' : 'Chưa có Video'}
                                    </div>
                                </div>
                            </div>
                            <button 
                                onClick={() => setSelectedLesson(lesson)}
                                className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center hover:bg-gray-900 hover:text-white transition-all active:scale-90"
                            >
                                <Settings className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* MODAL SỬA BÀI HỌC */}
            {selectedLesson && (
                <LessonEditModal 
                    lesson={selectedLesson} 
                    onClose={() => setSelectedLesson(null)} 
                    onSave={handleUpdateLesson} 
                />
            )}
        </div>
    )
}
