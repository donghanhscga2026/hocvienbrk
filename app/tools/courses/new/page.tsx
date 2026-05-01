'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createCourseAction, getTeachersAction } from '@/app/actions/course-actions'
import { updateCourseAction, updateLessonAction } from '@/app/actions/admin-actions'
import { BookOpen, DollarSign, Settings, Loader2, ArrowLeft, Upload, CheckCircle2, AlertCircle, List, Play, Edit2, X, FileSpreadsheet, Download, Save } from 'lucide-react'
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

function CreateCourseContent() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
    const [isAdmin, setIsAdmin] = useState(false)
    const [teachers, setTeachers] = useState<any[]>([])
    
    // ✅ NEW: Edit mode states (Thêm mới, giữ nguyên 21 states cũ)
    const searchParams = useSearchParams()
    const courseId = searchParams.get('id')
    const isEditMode = !!courseId
    
    const [activeTab, setActiveTab] = useState<'info' | 'lessons'>('info')
    const [lessons, setLessons] = useState<any[]>([])
    const [showImport, setShowImport] = useState(false)
    const [selectedLesson, setSelectedLesson] = useState<any>(null)
    
    // Section1: Thông tin cơ bản
    const [idKhoa, setIdKhoa] = useState('')
    const [nameLop, setNameLop] = useState('')
    const [nameKhoa, setNameKhoa] = useState('')
    const [category, setCategory] = useState('Khác')
    const [type, setType] = useState('NORMAL')
    const [status, setStatus] = useState(true)
    const [pin, setPin] = useState(0)
    const [dateJoin, setDateJoin] = useState('')
    const [teacherId, setTeacherId] = useState<string>('')
    
    // Section2: Mô tả & Hình ảnh
    const [moTaNgan, setMoTaNgan] = useState('')
    const [moTaDai, setMoTaDai] = useState('')
    const [linkAnhBia, setLinkAnhBia] = useState('')
    
    // Section3: Học phí & Thanh toán
    const [phiCoc, setPhiCoc] = useState(0)
    const [stk, setStk] = useState('')
    const [nameStk, setNameStk] = useState('')
    const [bankStk, setBankStk] = useState('')
    const [noidungStk, setNoidungStk] = useState('')
    const [linkQrcode, setLinkQrcode] = useState('')
    
    // Section4: Email & Zalo
    const [linkZalo, setLinkZalo] = useState('')
    const [fileEmail, setFileEmail] = useState('')
    const [noidungEmail, setNoidungEmail] = useState('')
    
    // ✅ NEW: Categories & Upload state
    const [categories, setCategories] = useState<string[]>([])
    const [uploadingImage, setUploadingImage] = useState(false)
    
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
            // Restore cursor position
            setTimeout(() => {
                textarea.selectionStart = textarea.selectionEnd = start + 4
            }, 0)
        }
    }
    
    // ✅ NEW: Fetch categories independently (chạy ngay khi mount, không phụ thuộc courseId)
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const catRes = await fetch('/api/courses/categories').then(r => r.json())
                if (catRes.categories && Array.isArray(catRes.categories)) {
                    // ✅ Đảm bảo unique categories (tránh duplicate keys)
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
    
    useEffect(() => {
        const fetchData = async () => {
            const res = await fetch('/api/auth/session').then(r => r.json())
            const isAdminUser = res?.user?.role === 'ADMIN'
            setIsAdmin(isAdminUser)
             
            if (isAdminUser) {
                const teachersRes = await getTeachersAction()
                if (teachersRes.success) {
                    setTeachers(teachersRes.teachers || [])
                }
            }
             
            // ✅ EDIT MODE: Fetch course data if courseId exists (THÊM MỚI)
            if (courseId) {
                setLoading(true)
                try {
                    const courseRes = await fetch(`/api/courses/${courseId}`).then(r => r.json())
                    if (courseRes && !courseRes.error) {
                         // Pre-fill 21 fields
                         setIdKhoa(courseRes.id_khoa || '')
                         setNameLop(courseRes.name_lop || '')
                         setNameKhoa(courseRes.name_khoa || '')
                          const currentCategory = courseRes.category || 'Khác'
                          setCategory(currentCategory)
                          setType(courseRes.type || 'NORMAL')
                        setStatus(courseRes.status ?? true)
                        setPin(courseRes.pin || 0)
                        setDateJoin(courseRes.date_join || '')
                        setTeacherId(courseRes.teacherId?.toString() || '')
                        
                        setMoTaNgan(courseRes.mo_ta_ngan || '')
                        setMoTaDai(courseRes.mo_ta_dai || '')
                        setLinkAnhBia(courseRes.link_anh_bia || '')
                        
                        setPhiCoc(courseRes.phi_coc || 0)
                        setStk(courseRes.stk || '')
                        setNameStk(courseRes.name_stk || '')
                        setBankStk(courseRes.bank_stk || '')
                        setNoidungStk(courseRes.noidung_stk || '')
                        setLinkQrcode(courseRes.link_qrcode || '')
                        
                        setLinkZalo(courseRes.link_zalo || '')
                        setFileEmail(courseRes.file_email || '')
                        setNoidungEmail(courseRes.noidung_email || '')
                        
                        // Set lessons
                        setLessons(courseRes.lessons || [])
                    } else {
                        setMessage({ type: 'error', text: courseRes.error || 'Không tìm thấy khóa học' })
                    }
                } catch (err) {
                    console.error("Fetch course error:", err)
                    setMessage({ type: 'error', text: 'Lỗi khi tải thông tin khóa học' })
                } finally {
                    setLoading(false)
                }
            }
        }
        fetchData()
    }, [courseId])
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setMessage(null)
        
        if (isEditMode && courseId) {
            // ✅ EDIT MODE: Gọi updateCourseAction (THÊM MỚI)
            const res = await updateCourseAction(parseInt(courseId), {
                id_khoa: idKhoa,
                name_lop: nameLop,
                name_khoa: nameKhoa || null,
                category,
                type,
                status,
                pin,
                date_join: dateJoin || null,
                teacherId: (isAdmin && teacherId) ? parseInt(teacherId) : null,
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
            
            if (res.success) {
                setMessage({ type: 'success', text: 'Đã cập nhật khóa học thành công!' })
                setTimeout(() => router.push('/tools/courses'), 1500)
            } else {
                setMessage({ type: 'error', text: res.error || 'Lỗi khi cập nhật.' })
            }
        } else {
            // ✅ CREATE MODE: Giữ nguyên code cũ
            const formData = new FormData()
            formData.append('id_khoa', idKhoa)
            formData.append('name_lop', nameLop)
            if (nameKhoa) formData.append('name_khoa', nameKhoa)
            formData.append('category', category)
            formData.append('type', type)
            formData.append('status', status.toString())
            formData.append('pin', pin.toString())
            if (dateJoin) formData.append('date_join', dateJoin)
            if (moTaNgan) formData.append('mo_ta_ngan', moTaNgan)
            if (moTaDai) formData.append('mo_ta_dai', moTaDai)
            if (linkAnhBia) formData.append('link_anh_bia', linkAnhBia)
            formData.append('phi_coc', phiCoc.toString())
            if (stk) formData.append('stk', stk)
            if (nameStk) formData.append('name_stk', nameStk)
            if (bankStk) formData.append('bank_stk', bankStk)
            if (noidungStk) formData.append('noidung_stk', noidungStk)
            if (linkQrcode) formData.append('link_qrcode', linkQrcode)
            if (linkZalo) formData.append('link_zalo', linkZalo)
            if (fileEmail) formData.append('file_email', fileEmail)
            if (noidungEmail) formData.append('noidung_email', noidungEmail)
            if (isAdmin && teacherId) formData.append('teacherId', teacherId)
            
            const res = await createCourseAction(formData)
            
            if (res.success) {
                setMessage({ type: 'success', text: res.message || 'Đã tạo khóa học thành công!' })
                setTimeout(() => router.push('/tools/courses'), 1500)
            } else {
                setMessage({ type: 'error', text: res.error || 'Lỗi khi tạo khóa học' })
            }
        }
        
        setLoading(false)
    }
    
    return (
        <div className="min-h-screen bg-gray-50">
            <MainHeader title={isEditMode ? "SỬA KHÓA HỌC" : "TẠO KHÓA HỌC MỚI"} toolSlug="courses" />
            
            {isEditMode && (
                <div className="flex gap-2 bg-gray-100 p-1 rounded-2xl mx-4 mb-6">
                    <button 
                        onClick={() => setActiveTab('info')} 
                        className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'info' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <Settings className="w-4 h-4 inline mr-2" /> Thông tin
                    </button>
                    <button 
                        onClick={() => setActiveTab('lessons')} 
                        className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'lessons' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <List className="w-4 h-4 inline mr-2" /> Bài giảng ({lessons.length})
                    </button>
                </div>
            )}
            
            <div className="max-w-2xl mx-auto space-y-8 p-4 pb-32">
                <Link href="/tools/courses" className="inline-flex items-center gap-2 text-xs font-black text-gray-400 uppercase hover:text-purple-600 transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Quay lại danh sách
                </Link>
                
                {( !isEditMode || activeTab === 'info' ) && (
                <form onSubmit={handleSubmit} className="space-y-8">
                {/* SECTION 1: THÔNG TIN CƠ BẢN */}
                <div className="bg-white rounded-[2.5rem] p-6 shadow-xl border border-gray-100">
                    <h2 className="text-lg font-black text-gray-900 mb-6 uppercase tracking-tight flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-blue-500" /> Thông tin cơ bản *
                    </h2>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Mã khóa học *</label>
                            <input 
                                type="text" 
                                value={idKhoa} 
                                onChange={(e) => setIdKhoa(e.target.value.toUpperCase())} 
                                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none" 
                                placeholder="VD: KH001" 
                                required 
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Tên lớp học *</label>
                            <input 
                                type="text" 
                                value={nameLop} 
                                onChange={(e) => setNameLop(e.target.value)} 
                                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none" 
                                placeholder="Tên lớp..." 
                                required 
                            />
                        </div>
                    </div>
                    
                    <div className="space-y-1.5 mt-4">
                        <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Tên khóa học (khác tên lớp)</label>
                        <input 
                            type="text" 
                            value={nameKhoa} 
                            onChange={(e) => setNameKhoa(e.target.value)} 
                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none" 
                            placeholder="Tên khóa..." 
                        />
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
                            <select 
                                value={type} 
                                onChange={(e) => setType(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none"
                            >
                                <option value="NORMAL">Bình thường</option>
                                <option value="CHALLENGE">Thử thách</option>
                                <option value="LIB">Tài liệu (LIB)</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Trạng thái</label>
                            <div className="flex items-center gap-3 h-full px-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={status} 
                                        onChange={(e) => setStatus(e.target.checked)} 
                                        className="w-5 h-5 rounded" 
                                    />
                                    <span className="text-sm font-bold">{status ? 'Hiển thị' : 'Ẩn'}</span>
                                </label>
                            </div>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 mt-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Ghim (0=không)</label>
                            <input 
                                type="number" 
                                value={pin} 
                                onChange={(e) => setPin(parseInt(e.target.value) || 0)} 
                                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none" 
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Ngày khai giảng</label>
                            <input 
                                type="date" 
                                value={dateJoin} 
                                onChange={(e) => setDateJoin(e.target.value)} 
                                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none" 
                            />
                        </div>
                        {isAdmin && (
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Giáo viên</label>
                                <select 
                                    value={teacherId} 
                                    onChange={(e) => setTeacherId(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none"
                                >
                                    <option value="">Tự động (session)</option>
                                    {teachers.map((t: any) => (
                                        <option key={t.id} value={t.id}>{t.name || t.email}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                </div>
                
                {/* SECTION 2: MÔ TẢ & HÌNH ẢNH */}
                <div className="bg-white rounded-[2.5rem] p-6 shadow-xl border border-gray-100">
                    <h2 className="text-lg font-black text-gray-900 mb-6 uppercase tracking-tight flex items-center gap-2">
                        <Settings className="w-5 h-5 text-green-500" /> Mô tả & Hình ảnh
                    </h2>
                    
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Mô tả ngắn (max 200 chars, Enter để xuống dòng)</label>
                        <textarea 
                            value={moTaNgan} 
                            onChange={(e) => setMoTaNgan(e.target.value.slice(0, 200))}
                            onKeyDown={(e) => handleTextareaKeyDown(e, setMoTaNgan)}
                            rows={6}
                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm outline-none resize-y" 
                            placeholder="Mô tả ngắn gọn... (Enter để xuống dòng sẽ tự thêm <br>)" 
                        />
                        <div className="text-right text-[10px] text-gray-400">{moTaNgan.length}/200</div>
                    </div>
                    
                    <div className="space-y-1.5 mt-4">
                        <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Mô tả dài (Enter để xuống dòng)</label>
                        <textarea 
                            value={moTaDai} 
                            onChange={(e) => setMoTaDai(e.target.value)}
                            onKeyDown={(e) => handleTextareaKeyDown(e, setMoTaDai)}
                            rows={10}
                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm outline-none resize-y" 
                            placeholder="Mô tả chi tiết khóa học... (Enter để xuống dòng sẽ tự thêm <br>)" 
                        />
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
                
                {/* SECTION 3: HỌC PHÍ & THANH TOÁN */}
                <div className="bg-white rounded-[2.5rem] p-6 shadow-xl border border-gray-100">
                    <h2 className="text-lg font-black text-gray-900 mb-6 uppercase tracking-tight flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-yellow-500" /> Học phí & Thanh toán
                    </h2>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Học phí (VND)</label>
                            <input 
                                type="number" 
                                value={phiCoc} 
                                onChange={(e) => setPhiCoc(parseInt(e.target.value) || 0)} 
                                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none" 
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Số tài khoản</label>
                            <input 
                                type="text" 
                                value={stk} 
                                onChange={(e) => setStk(e.target.value)} 
                                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none" 
                                placeholder="Số TK..." 
                            />
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mt-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Tên chủ TK</label>
                            <input 
                                type="text" 
                                value={nameStk} 
                                onChange={(e) => setNameStk(e.target.value)} 
                                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none" 
                                placeholder="Tên..." 
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Ngân hàng</label>
                            <input 
                                type="text" 
                                value={bankStk} 
                                onChange={(e) => setBankStk(e.target.value)} 
                                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none" 
                                placeholder="Tên NH..." 
                            />
                        </div>
                    </div>
                    
                    <div className="space-y-1.5 mt-4">
                        <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Nội dung chuyển khoản</label>
                        <input 
                            type="text" 
                            value={noidungStk} 
                            onChange={(e) => setNoidungStk(e.target.value)} 
                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none" 
                            placeholder="Nội dung..." 
                        />
                    </div>
                    
                    <div className="space-y-1.5 mt-4">
                        <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Link QR code</label>
                        <input 
                            type="url" 
                            value={linkQrcode} 
                            onChange={(e) => setLinkQrcode(e.target.value)} 
                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none" 
                            placeholder="https://..." 
                        />
                    </div>
                </div>
                
                {/* SECTION 4: EMAIL & ZALO */}
                <div className="bg-white rounded-[2.5rem] p-6 shadow-xl border border-gray-100">
                    <h2 className="text-lg font-black text-gray-900 mb-6 uppercase tracking-tight flex items-center gap-2">
                        <Upload className="w-5 h-5 text-purple-500" /> Email & Zalo
                    </h2>
                    
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Link nhóm Zalo</label>
                        <input 
                            type="url" 
                            value={linkZalo} 
                            onChange={(e) => setLinkZalo(e.target.value)} 
                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none" 
                            placeholder="https://zalo.me/..." 
                        />
                    </div>
                    
                    <div className="space-y-1.5 mt-4">
                        <label className="text-[10px] font-black uppercase text-gray-400 ml-1">File email đính kèm</label>
                        <input 
                            type="text" 
                            value={fileEmail} 
                            onChange={(e) => setFileEmail(e.target.value)} 
                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none" 
                            placeholder="Path to file..." 
                        />
                    </div>
                    
                    <div className="space-y-1.5 mt-4">
                        <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Nội dung email kích hoạt</label>
                        <textarea 
                            value={noidungEmail} 
                            onChange={(e) => setNoidungEmail(e.target.value)} 
                            rows={4}
                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm outline-none" 
                            placeholder="Nội dung email..." 
                        />
                    </div>
                </div>
                
                {message && (
                    <div className={`p-4 rounded-2xl flex items-center gap-3 text-xs font-bold ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                        {message.text}
                    </div>
                )}
                
                <button 
                    type="submit" 
                    disabled={loading || !idKhoa || !nameLop}
                    className="w-full bg-black text-yellow-400 py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <BookOpen className="w-5 h-5" />}
                    {isEditMode ? 'Lưu Khóa học' : 'Tạo Khóa học'}
                </button>
                </form>
                )}

                {isEditMode && activeTab === 'lessons' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h2 className="text-lg font-black text-gray-900 flex items-center gap-2 px-2 uppercase tracking-tight">
                                <List className="w-5 h-5 text-indigo-500" /> Bài giảng ({lessons.length})
                            </h2>
                            <button
                                onClick={() => setShowImport(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-xs font-black uppercase rounded-xl hover:bg-green-700 transition-all"
                            >
                                <Upload className="w-4 h-4" /> Import
                            </button>
                        </div>
                        <div className="space-y-3">
                            {lessons.map((lesson: any) => (
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
                            {lessons.length === 0 && (
                                <div className="text-center py-8 text-gray-400 text-xs font-black uppercase">
                                    Chưa có bài giảng nào. Hãy import bài học!
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* MODALS */}
            {selectedLesson && (
                <LessonEditModal
                    lesson={selectedLesson}
                    onClose={() => setSelectedLesson(null)}
                    onSave={async (data: any) => {
                        const res = await updateLessonAction(data.id, {
                            title: data.title, videoUrl: data.videoUrl, order: data.order
                        })
                        if (res.success) {
                            setMessage({ type: 'success', text: 'Đã cập nhật bài học thành công!' })
                            // Refresh data
                            const courseRes = await fetch(`/api/courses/${courseId}`).then(r => r.json())
                            if (courseRes && !courseRes.error) setLessons(courseRes.lessons || [])
                        }
                    }}
                />
            )}

            {showImport && (
                <ImportLessonsModal
                    courseId={courseId || ''}
                    onClose={() => setShowImport(false)}
                    onComplete={async () => {
                        const courseRes = await fetch(`/api/courses/${courseId}`).then(r => r.json())
                        if (courseRes && !courseRes.error) setLessons(courseRes.lessons || [])
                        setShowImport(false)
                    }}
                />
            )}
        </div>
    )
}

export default function CreateCoursePage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-purple-500" /></div>}>
            <CreateCourseContent />
        </Suspense>
    )
}
