'use client'

import { useState, useEffect, use } from 'react'
import { updateCourseAction, updateLessonAction } from '@/app/actions/admin-actions'
import { getTeachersAction } from '@/app/actions/course-actions'
import { ArrowLeft, Save, Loader2, CheckCircle2, AlertCircle, Play, Edit2, X, List, Settings, Upload, FileSpreadsheet, Download, DollarSign, BookOpen } from 'lucide-react'
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
    const [categories, setCategories] = useState<string[]>([])
    const [uploadingImage, setUploadingImage] = useState(false)
    
    // ✅ NEW: Section 3 - Fee & Payment
    const [stk, setStk] = useState('')
    const [nameStk, setNameStk] = useState('')
    const [bankStk, setBankStk] = useState('')
    const [noidungStk, setNoidungStk] = useState('')
    const [linkQrcode, setLinkQrcode] = useState('')
    
    // ✅ NEW: Section 4 - Email & Zalo
    const [linkZalo, setLinkZalo] = useState('')
    const [fileEmail, setFileEmail] = useState('')
    
    // ✅ NEW: Fetch categories independently (chạy ngay khi mount, không phụ thuộc category)
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const catRes = await fetch('/api/courses/categories').then(r => r.json())
                if (catRes.categories && Array.isArray(catRes.categories)) {
                    // ✅ Đảm bảo unique categories từ API (tránh duplicate keys)
                    const uniqueCategories = Array.from(new Set<string>(catRes.categories))
                    console.log('Categories loaded:', uniqueCategories)
                    setCategories(uniqueCategories)
                }
            } catch (err) {
                console.error("Fetch categories error:", err)
            }
        }
        fetchCategories()
    }, [])
    
    // ✅ NEW: Handle image upload
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        
        setUploadingImage(true)
        try {
            const formData = new FormData()
            formData.append('file', file)
            
            const res = await fetch('/api/upload/course', {
                method: 'POST',
                body: formData
            })
            const data = await res.json()
            
            if (data.url) {
                setLinkAnhBia(data.url)
            } else {
                setMessage({ type: 'error', text: data.error || 'Lỗi upload ảnh' })
            }
        } catch (err: any) {
            setMessage({ type: 'error', text: 'Lỗi upload: ' + err.message })
        }
        setUploadingImage(false)
    }
    
    // ✅ NEW: Handle Enter key in textarea to insert <br>
    const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, setter: React.Dispatch<React.SetStateAction<string>>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            const textarea = e.target as HTMLTextAreaElement
            const start = textarea.selectionStart
            const end = textarea.selectionEnd
            const value = textarea.value
            const newValue = value.substring(0, start) + '<br>' + value.substring(end)
            setter(newValue)
            setTimeout(() => {
                textarea.selectionStart = textarea.selectionEnd = start + 4
            }, 0)
        }
    }
    
    const fetchData = async () => {
        setLoading(true)
        try {
            // ✅ Fetch Session & Teachers if Admin
            const sessionRes = await fetch('/api/auth/session').then(r => r.json())
            const isAdminUser = sessionRes?.user?.role === 'ADMIN'
            setIsAdmin(isAdminUser)
            
            if (isAdminUser) {
                const { getTeachersAction } = await import('@/app/actions/course-actions')
                const teachersRes = await getTeachersAction()
                if (teachersRes.success) {
                    setTeachers(teachersRes.teachers || [])
                }
            }

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
                  const currentCategory = res.category || 'Khác'
                  setCategory(currentCategory)
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
            id_khoa: idKhoa,
            name_lop: nameLop,
            name_khoa: nameKhoa || null,
            category,
            type,
            status,
            pin,
            date_join: dateJoin || null,
            teacherId: (isAdmin && teacherId) ? teacherId : null,
            mo_ta_ngan: moTaNgan || null,
            mo_ta_dai: moTaDai || null,
            link_anh_bia: linkAnhBia || null,
            phi_coc: phiCoc,
            stk: stk || null,
            name_stk: nameStk || null,
            bank_stk: bankStk || null,
            noidung_stk: noidungStk || null,
            link_qrcode: linkQrcode || null,
            link_zalo: linkZalo || null,
            file_email: fileEmail || null,
            noidung_email: noidungEmail || null,
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
            
            <div className="max-w-2xl mx-auto space-y-8 p-4 pb-32">
                <Link href="/tools/courses" className="inline-flex items-center gap-2 text-xs font-black text-gray-400 uppercase hover:text-purple-600 transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Quay lại danh sách
                </Link>

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* PHẦN 1: THÔNG TIN CƠ BẢN */}
                    <div className="bg-white rounded-[2.5rem] p-6 shadow-xl border border-gray-100">
                        <h2 className="text-lg font-black text-gray-900 mb-6 uppercase tracking-tight flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-blue-500" /> Thông tin cơ bản *
                        </h2>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Mã khóa học (Không thể sửa - ảnh hưởng DB)</label>
                                 <input 
                                     type="text" 
                                     value={idKhoa} 
                                     readOnly 
                                     disabled 
                                     className="w-full bg-gray-200 border border-gray-200 rounded-2xl px-4 py-3 text-sm font-bold outline-none opacity-40 cursor-not-allowed text-gray-500" 
                                 />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Tên lớp học *</label>
                                <input type="text" value={nameLop} onChange={(e) => setNameLop(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none" required />
                            </div>
                        </div>
                        
                        <div className="space-y-1.5 mt-4">
                            <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Tên khóa học (khác tên lớp)</label>
                            <input type="text" value={nameKhoa} onChange={(e) => setNameKhoa(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none" />
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4 mt-4">
                             <div className="space-y-1.5">
                                 <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Danh mục</label>
                                 <select 
                                     value={category} 
                                     onChange={(e) => setCategory(e.target.value)}
                                     className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none"
                                 >
                                     <option value="Khác">Khác</option>
                                     {Array.from(new Set(categories)).map((cat: string) => (
                                         <option key={cat} value={cat}>{cat}</option>
                                     ))}
                                 </select>
                             </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Loại khóa học</label>
                                <select value={type} onChange={(e) => setType(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none">
                                    <option value="NORMAL">Bình thường</option>
                                    <option value="CHALLENGE">Thử thách</option>
                                    <option value="LIB">Tài liệu (LIB)</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Trạng thái</label>
                                <div className="flex items-center gap-3 h-full px-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={status} onChange={(e) => setStatus(e.target.checked)} className="w-5 h-5 rounded" />
                                        <span className="text-sm font-bold">{status ? 'Hiển thị' : 'Ẩn'}</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4 mt-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Ghim (0=không)</label>
                                <input type="number" value={pin} onChange={(e) => setPin(parseInt(e.target.value) || 0)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Ngày khai giảng</label>
                                <input type="date" value={dateJoin} onChange={(e) => setDateJoin(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none" />
                            </div>
                            {isAdmin && (
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Giáo viên</label>
                                    <select value={teacherId || ''} onChange={(e) => setTeacherId(parseInt(e.target.value) || null)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none">
                                        <option value="">Chọn giáo viên...</option>
                                        {teachers.map((t: any) => (
                                            <option key={t.id} value={t.id}>{t.name || t.email}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* PHẦN 2: MÔ TẢ & HÌNH ẢNH */}
                    <div className="bg-white rounded-[2.5rem] p-6 shadow-xl border border-gray-100">
                        <h2 className="text-lg font-black text-gray-900 mb-6 uppercase tracking-tight flex items-center gap-2">
                            <Settings className="w-5 h-5 text-green-500" /> Mô tả & Hình ảnh
                        </h2>
                        
                         <div className="space-y-1.5">
                              <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Mô tả ngắn (max 200 chars, Enter để xuống dòng)</label>
                              <textarea value={moTaNgan} onChange={(e) => setMoTaNgan(e.target.value.slice(0, 200))} onKeyDown={(e) => handleTextareaKeyDown(e, setMoTaNgan)} rows={6} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm outline-none resize-y" placeholder="Enter để xuống dòng sẽ tự thêm <br>..." />
                              <div className="text-right text-[10px] text-gray-400">{moTaNgan.length}/200</div>
                          </div>
                         
                         <div className="space-y-1.5 mt-4">
                              <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Mô tả dài (Enter để xuống dòng)</label>
                              <textarea value={moTaDai} onChange={(e) => setMoTaDai(e.target.value)} onKeyDown={(e) => handleTextareaKeyDown(e, setMoTaDai)} rows={10} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm outline-none resize-y" placeholder="Enter để xuống dòng sẽ tự thêm <br>..." />
                          </div>
                         
                         <div className="space-y-1.5 mt-4">
                             <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Link ảnh bìa</label>
                             <div className="flex gap-2">
                                 <input 
                                     type="url" 
                                     value={linkAnhBia} 
                                     onChange={(e) => setLinkAnhBia(e.target.value)} 
                                     className="flex-1 bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none" 
                                     placeholder="https://... hoặc upload từ thiết bị" 
                                 />
                                 <label className="flex items-center gap-2 px-4 py-3 bg-blue-50 text-blue-600 rounded-2xl cursor-pointer hover:bg-blue-100 transition-all text-sm font-bold whitespace-nowrap">
                                     <Upload className="w-4 h-4" />
                                     {uploadingImage ? 'Đang tải...' : 'Upload'}
                                     <input 
                                         type="file" 
                                         accept="image/*" 
                                         onChange={handleImageUpload} 
                                         className="hidden" 
                                         disabled={uploadingImage}
                                     />
                                 </label>
                             </div>
                             {linkAnhBia && (
                                 <div className="mt-2 bg-gray-50 rounded-2xl p-4 flex justify-center">
                                     <img src={linkAnhBia} alt="Preview" className="max-w-full max-h-96 object-contain rounded-xl" />
                                 </div>
                             )}
                         </div>
                    </div>

                    {/* PHẦN 3: HỌC PHÍ & THANH TOÁN */}
                    <div className="bg-white rounded-[2.5rem] p-6 shadow-xl border border-gray-100">
                        <h2 className="text-lg font-black text-gray-900 mb-6 uppercase tracking-tight flex items-center gap-2">
                            <DollarSign className="w-5 h-5 text-yellow-500" /> Học phí & Thanh toán
                        </h2>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Học phí (VND)</label>
                                <input type="number" value={phiCoc} onChange={(e) => setPhiCoc(parseInt(e.target.value) || 0)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Số tài khoản</label>
                                <input type="text" value={stk} onChange={(e) => setStk(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none" />
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mt-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Tên chủ TK</label>
                                <input type="text" value={nameStk} onChange={(e) => setNameStk(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Ngân hàng</label>
                                <input type="text" value={bankStk} onChange={(e) => setBankStk(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none" />
                            </div>
                        </div>
                        
                        <div className="space-y-1.5 mt-4">
                            <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Nội dung chuyển khoản</label>
                            <input type="text" value={noidungStk} onChange={(e) => setNoidungStk(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none" />
                        </div>
                        
                        <div className="space-y-1.5 mt-4">
                            <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Link QR code</label>
                            <input type="url" value={linkQrcode} onChange={(e) => setLinkQrcode(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none" />
                        </div>
                    </div>

                    {/* PHẦN 4: EMAIL & ZALO */}
                    <div className="bg-white rounded-[2.5rem] p-6 shadow-xl border border-gray-100">
                        <h2 className="text-lg font-black text-gray-900 mb-6 uppercase tracking-tight flex items-center gap-2">
                            <Upload className="w-5 h-5 text-purple-500" /> Email & Zalo
                        </h2>
                        
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Link nhóm Zalo</label>
                            <input type="url" value={linkZalo} onChange={(e) => setLinkZalo(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none" />
                        </div>
                        
                        <div className="space-y-1.5 mt-4">
                            <label className="text-[10px] font-black uppercase text-gray-400 ml-1">File email đính kèm</label>
                            <input type="text" value={fileEmail} onChange={(e) => setFileEmail(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none" />
                        </div>
                        
                        <div className="space-y-1.5 mt-4">
                            <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Nội dung email kích hoạt</label>
                            <textarea value={noidungEmail} onChange={(e) => setNoidungEmail(e.target.value)} rows={4} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm outline-none" />
                        </div>
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

                {/* PHẦN 5: DANH SÁCH BÀI HỌC */}
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
