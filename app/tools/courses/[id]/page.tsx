'use client'

import { useState, useEffect, use } from 'react'
import { updateCourseAction, updateLessonAction } from '@/app/actions/admin-actions'
import { ArrowLeft, Save, Loader2, CheckCircle2, AlertCircle, Play, Edit2, X, List, Settings, Upload, FileSpreadsheet, Download } from 'lucide-react'
import Link from 'next/link'
import MainHeader from '@/components/layout/MainHeader'

// ─── Component Popup Import Bài học ──────────────────────────────────────────
function ImportLessonsModal({ courseId, onClose, onComplete }: { courseId: string, onClose: () => void, onComplete: () => void }) {
    const [file, setFile] = useState<any>(null)
    const [mode, setMode] = useState<'upsert' | 'skip'>('upsert')
    const [sourceType, setSourceType] = useState<'file' | 'sheet'>('file')
    const [sheetUrl, setSheetUrl] = useState('')
    const [importing, setImporting] = useState(false)
    const [result, setResult] = useState<any>(null)

    const handleImport = async () => {
        if (sourceType === 'file' && !file) return
        if (sourceType === 'sheet' && !sheetUrl) return

        setImporting(true)
        setResult(null)

        const formData = new FormData()
        formData.append('mode', mode)
        formData.append('sourceType', sourceType)

        if (sourceType === 'file') {
            formData.append('file', file)
        } else {
            formData.append('sheetUrl', sheetUrl)
        }

        try {
            const res = await fetch(`/api/courses/${courseId}/lessons/import`, {
                method: 'POST',
                body: formData
            })
            const data = await res.json()
            setResult(data)
            if (data.success) onComplete()
        } catch (err: any) {
            setResult({ error: err.message })
        }

        setImporting(false)
    }

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6 text-white flex justify-between items-center">
                    <h3 className="font-black text-sm uppercase tracking-widest flex items-center gap-2">
                        <FileSpreadsheet className="w-5 h-5" /> Import Bài học
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full"><X className="w-5 h-5" /></button>
                </div>
                <div className="p-6 space-y-5">
                    <a href="/lesson_template.csv" download className="flex items-center gap-2 text-xs font-bold text-purple-600 hover:underline">
                        <Download className="w-4 h-4" /> Tải template mẫu
                    </a>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Nguồn dữ liệu</label>
                        <div className="flex gap-3">
                            <label className={`flex-1 p-3 rounded-xl border cursor-pointer transition-all ${sourceType === 'file' ? 'border-purple-500 bg-purple-50' : 'border-gray-100'}`}>
                                <input type="radio" name="source" value="file" checked={sourceType === 'file'} onChange={() => setSourceType('file')} className="hidden" />
                                <span className={`text-xs font-bold ${sourceType === 'file' ? 'text-purple-700' : 'text-gray-500'}`}>File CSV</span>
                            </label>
                            <label className={`flex-1 p-3 rounded-xl border cursor-pointer transition-all ${sourceType === 'sheet' ? 'border-purple-500 bg-purple-50' : 'border-gray-100'}`}>
                                <input type="radio" name="source" value="sheet" checked={sourceType === 'sheet'} onChange={() => setSourceType('sheet')} className="hidden" />
                                <span className={`text-xs font-bold ${sourceType === 'sheet' ? 'text-purple-700' : 'text-gray-500'}`}>Google Sheets</span>
                            </label>
                        </div>
                    </div>

                    {sourceType === 'file' ? (
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-gray-400 ml-1">File CSV</label>
                            <input
                                type="file"
                                accept=".csv"
                                onChange={(e) => setFile(e.target.files?.[0] || null)}
                                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-purple-50 file:text-purple-700"
                            />
                        </div>
                    ) : (
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Link Google Sheets (Public)</label>
                            <input
                                type="text"
                                value={sheetUrl}
                                onChange={(e) => setSheetUrl(e.target.value)}
                                placeholder="https://docs.google.com/spreadsheets/d/..."
                                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none"
                            />
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Khi bài học đã tồn tại</label>
                        <div className="flex gap-3">
                            <label className={`flex-1 p-3 rounded-xl border cursor-pointer transition-all ${mode === 'upsert' ? 'border-purple-500 bg-purple-50' : 'border-gray-100'}`}>
                                <input type="radio" name="mode" value="upsert" checked={mode === 'upsert'} onChange={() => setMode('upsert')} className="hidden" />
                                <span className={`text-xs font-bold ${mode === 'upsert' ? 'text-purple-700' : 'text-gray-500'}`}>Cập nhật</span>
                            </label>
                            <label className={`flex-1 p-3 rounded-xl border cursor-pointer transition-all ${mode === 'skip' ? 'border-purple-500 bg-purple-50' : 'border-gray-100'}`}>
                                <input type="radio" name="mode" value="skip" checked={mode === 'skip'} onChange={() => setMode('skip')} className="hidden" />
                                <span className={`text-xs font-bold ${mode === 'skip' ? 'text-purple-700' : 'text-gray-500'}`}>Bỏ qua</span>
                            </label>
                        </div>
                    </div>

                    {result && (
                        <div className={`p-4 rounded-2xl text-xs font-bold ${result.error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                            {result.error || result.message}
                        </div>
                    )}

                    <button
                        onClick={handleImport}
                        disabled={(sourceType === 'file' && !file) || (sourceType === 'sheet' && !sheetUrl) || importing}
                        className="w-full bg-green-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {importing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                        {importing ? 'Đang import...' : 'Import Bài học'}
                    </button>
                </div>
            </div>
        </div>
    )
}

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
    const [showImport, setShowImport] = useState(false)

    const [nameLop, setNameLop] = useState('')
    const [phiCoc, setPhiCoc] = useState(0)
    const [idKhoa, setIdKhoa] = useState('')
    const [noidungEmail, setNoidungEmail] = useState('')
    const [type, setType] = useState('NORMAL')
    
    // ✅ NEW: Section 1 - Basic info (16 more fields to have 21 total)
    const [nameKhoa, setNameKhoa] = useState('')
    const [category, setCategory] = useState('Khác')
    const [status, setStatus] = useState(true)
    const [pin, setPin] = useState(0)
    const [dateJoin, setDateJoin] = useState('')
    const [teacherId, setTeacherId] = useState<number | null>(null)
    const [isAdmin, setIsAdmin] = useState(false)
    const [teachers, setTeachers] = useState<any[]>([])
    
    // ✅ NEW: Section 2 - Description & Image
    const [moTaNgan, setMoTaNgan] = useState('')
    const [moTaDai, setMoTaDai] = useState('')
    const [linkAnhBia, setLinkAnhBia] = useState('')
    
    // ✅ NEW: Section 3 - Fee & Payment
    const [stk, setStk] = useState('')
    const [nameStk, setNameStk] = useState('')
    const [bankStk, setBankStk] = useState('')
    const [noidungStk, setNoidungStk] = useState('')
    const [linkQrcode, setLinkQrcode] = useState('')
    
    // ✅ NEW: Section 4 - Email & Zalo
    const [linkZalo, setLinkZalo] = useState('')
    const [fileEmail, setFileEmail] = useState('')
    
    const fetchData = async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/courses/${id}`).then(r => r.json())
            if (res && !res.error) {
                setCourse(res)
                // Original 5 fields
                setNameLop(res.name_lop || '')
                setPhiCoc(res.phi_coc || 0)
                setIdKhoa(res.id_khoa || '')
                setNoidungEmail(res.noidung_email || '')
                setType(res.type || 'NORMAL')
                
                // ✅ NEW: Populate all 21 fields
                setNameKhoa(res.name_khoa || '')
                setCategory(res.category || 'Khác')
                setStatus(res.status ?? true)
                setPin(res.pin || 0)
                setDateJoin(res.date_join || '')
                setTeacherId(res.teacherId || null)
                
                setMoTaNgan(res.mo_ta_ngan || '')
                setMoTaDai(res.mo_ta_dai || '')
                setLinkAnhBia(res.link_anh_bia || '')
                
                setStk(res.stk || '')
                setNameStk(res.name_stk || '')
                setBankStk(res.bank_stk || '')
                setNoidungStk(res.noidung_stk || '')
                setLinkQrcode(res.link_qrcode || '')
                
                setLinkZalo(res.link_zalo || '')
                setFileEmail(res.file_email || '')
            }
        } catch (err) {
            console.error("Fetch error:", err)
        }
        setLoading(false)
    }

    useEffect(() => { fetchData() }, [id])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        setMessage(null)
        // ✅ Send all 21 fields to updateCourseAction
        const res = await updateCourseAction(parseInt(id), {
            // Original 5 fields
            name_lop: nameLop,
            phi_coc: phiCoc,
            id_khoa: idKhoa,
            noidung_email: noidungEmail,
            type,
            // ✅ NEW: All 21 fields
            name_khoa: nameKhoa || null,
            category,
            status,
            pin,
            date_join: dateJoin || null,
            teacherId: teacherId || null,
            mo_ta_ngan: moTaNgan || null,
            mo_ta_dai: moTaDai || null,
            link_anh_bia: linkAnhBia || null,
            stk: stk || null,
            name_stk: nameStk || null,
            bank_stk: bankStk || null,
            noidung_stk: noidungStk || null,
            link_qrcode: linkQrcode || null,
            link_zalo: linkZalo || null,
            file_email: fileEmail || null,
        })
        if (res.success) setMessage({ type: 'success', text: 'Đã lưu thông tin khóa học (21 trường)!' })
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
        <div className="min-h-screen bg-gray-50">
            <MainHeader title="CẤU HÌNH KHÓA HỌC" toolSlug="courses" />
            
            <div className="max-w-md mx-auto space-y-8 p-4 pb-32">
                <Link href="/tools/courses" className="inline-flex items-center gap-2 text-xs font-black text-gray-400 uppercase hover:text-purple-600 transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Quay lại danh sách
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
                        <div className="space-y-1.5"><label className="text-[10px] font-black uppercase text-gray-400 ml-1">Loại khóa học</label>
                            <select value={type} onChange={(e) => setType(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none">
                                <option value="NORMAL">Bình thường</option>
                                <option value="CHALLENGE">Thử thách</option>
                                <option value="LIB">Tài liệu (LIB)</option>
                            </select>
                            {type === 'LIB' && <p className="text-xs text-blue-600 mt-1 pl-1 font-bold">⚠️ Cần cấu hình whitelist email trong Admin để truy cập LIB.</p>}
                            {type === 'LIB' && (
                                <div className="mt-2 pl-1">
                                    <Link href={`/tools/courses/${id}/lib-access`} className="inline-flex items-center gap-1 text-xs text-purple-600 hover:underline font-bold bg-purple-50 px-3 py-1.5 rounded-lg transition-colors">
                                        → Quản lý danh sách truy cập tài liệu
                                    </Link>
                                </div>
                            )}
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
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-black text-gray-900 flex items-center gap-2 px-2 uppercase tracking-tight">
                            <List className="w-5 h-5 text-indigo-500" /> Bài giảng ({course?.lessons?.length || 0})
                        </h2>
                        <button
                            onClick={() => setShowImport(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-xs font-black uppercase rounded-xl hover:bg-green-700 transition-all"
                        >
                            <Upload className="w-4 h-4" /> Import
                        </button>
                    </div>
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

                {/* MODAL IMPORT BÀI HỌC */}
                {showImport && (
                    <ImportLessonsModal
                        courseId={id}
                        onClose={() => setShowImport(false)}
                        onComplete={() => { fetchData(); setShowImport(false) }}
                    />
                )}
            </div>
        </div>
    )
}
