'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createCourseAction, getTeachersAction } from '@/app/actions/course-actions'
import { updateCourseAction, updateLessonAction, deleteLessonAction } from '@/app/actions/admin-actions'
import { BookOpen, DollarSign, Settings, Loader2, ArrowLeft, Upload, CheckCircle2, AlertCircle, List, Play, Edit2, X, FileSpreadsheet, Download, Save, Trash2, Plus } from 'lucide-react'
import Link from 'next/link'
import MainHeader from '@/components/layout/MainHeader'

import { ImportLessonsModal } from '@/components/admin/courses/ImportLessonsModal'
import { LessonEditModal } from '@/components/admin/courses/LessonEditModal'
import { AddLessonModal } from '@/components/admin/courses/AddLessonModal'

function isValidDateFormat(str: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(str)
}
function CreateCourseContent() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
    const [isAdmin, setIsAdmin] = useState(false)
    const [isTeacher, setIsTeacher] = useState(false)
    const [teachers, setTeachers] = useState<any[]>([])
    
    // ✅ NEW: Edit mode states (Thêm mới, giữ nguyên 21 states cũ)
    const searchParams = useSearchParams()
    const courseId = searchParams.get('id')
    const isEditMode = !!courseId
    
    const [activeTab, setActiveTab] = useState<'info' | 'lessons'>('info')
    const [lessons, setLessons] = useState<any[]>([])
    const [showImport, setShowImport] = useState(false)
    const [selectedLesson, setSelectedLesson] = useState<any>(null)
    const [showAddLesson, setShowAddLesson] = useState(false)
    
    // Section1: Thông tin cơ bản
    const [idKhoa, setIdKhoa] = useState('')
    const [nameLop, setNameLop] = useState('')
    const [nameKhoa, setNameKhoa] = useState('')
    const [categoryId, setCategoryId] = useState<number | null>(null)
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
    const [feeType, setFeeType] = useState('MIEN_PHI')
    const [acceptedVoucherIds, setAcceptedVoucherIds] = useState<number[]>([])
    const [awardVoucherIds, setAwardVoucherIds] = useState<number[]>([])
    const [allVouchers, setAllVouchers] = useState<any[]>([])
    const [noidungStk, setNoidungStk] = useState('')
    
    // Section4: Email & Zalo
    const [linkZalo, setLinkZalo] = useState('')
    const [fileEmail, setFileEmail] = useState('')
    const [noidungEmail, setNoidungEmail] = useState('')
    
    // ✅ NEW: Categories & Upload state
    const [categories, setCategories] = useState<any[]>([])
    const [uploadingImage, setUploadingImage] = useState(false)
    const [teacherBankAccounts, setTeacherBankAccounts] = useState<any[]>([])
    const [teacherBankAccountId, setTeacherBankAccountId] = useState<number | null>(null)
    const [showAwardDropdown, setShowAwardDropdown] = useState(false)
    const [showAcceptedDropdown, setShowAcceptedDropdown] = useState(false)
    
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
    
    // ✅ Fetch categories (CourseCategory objects from API)
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const catRes = await fetch('/api/courses/categories').then(r => r.json())
                if (catRes.categories && Array.isArray(catRes.categories)) {
                    setCategories(catRes.categories)
                }
            } catch (err) {
                console.error("Fetch categories error:", err)
            }
        }
        fetchCategories()
    }, [])

    useEffect(() => {
        fetch('/api/vouchers')
            .then(r => r.json())
            .then(data => setAllVouchers(data.vouchers || []))
            .catch(() => {})
    }, [])

    useEffect(() => {
        if (phiCoc > 0 && allVouchers.length > 0 && !isEditMode) {
            if (!acceptedVoucherIds.includes(4)) {
                setAcceptedVoucherIds(prev => prev.includes(4) ? prev : [...prev, 4])
            }
        }
    }, [phiCoc, allVouchers, isEditMode])
    
    useEffect(() => {
        const fetchData = async () => {
            const res = await fetch('/api/auth/session').then(r => r.json())
            const isAdminUser = res?.user?.role === 'ADMIN'
            const isTeacherUser = res?.user?.role === 'TEACHER'
            setIsAdmin(isAdminUser)
            setIsTeacher(isTeacherUser)
             
            if (isAdminUser || isTeacherUser) {
                const teachersRes = await getTeachersAction()
                if (teachersRes.success) {
                    setTeachers(teachersRes.teachers || [])
                }
                
                // Mặc định là chính mình nếu đang tạo mới
                if (!courseId && res?.user?.id) {
                    setTeacherId(res.user.id.toString())
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
                          setCategoryId(courseRes.categoryId || null)
                          setType(courseRes.type || 'NORMAL')
                        setStatus(courseRes.status ?? true)
                        setPin(courseRes.pin || 0)
                        setDateJoin(isValidDateFormat(courseRes.date_join || '') ? courseRes.date_join : '')
                        setTeacherId(courseRes.teacherId?.toString() || '')
                        
                        setMoTaNgan(courseRes.mo_ta_ngan || '')
                        setMoTaDai(courseRes.mo_ta_dai || '')
                        setLinkAnhBia(courseRes.link_anh_bia || '')
                        
                        setPhiCoc(courseRes.phi_coc || 0)
                        setFeeType(courseRes.feeType || 'MIEN_PHI')
                        setAcceptedVoucherIds(courseRes.acceptedVouchers?.map((v: any) => v.voucherId) || [])
                        setAwardVoucherIds(courseRes.voucherAwards?.map((v: any) => v.voucherId) || [])
                        setNoidungStk(courseRes.noidung_stk || '')
                        
                        setLinkZalo(courseRes.link_zalo || '')
                        setFileEmail(courseRes.file_email || '')
                        setNoidungEmail(courseRes.noidung_email || '')
                        setTeacherBankAccountId(courseRes.teacherBankAccountId || null)
                        
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

    // ✅ Fetch teacher bank accounts when teacherId changes
    useEffect(() => {
        async function fetchTeacherAccounts() {
            if (!teacherId) {
                setTeacherBankAccounts([])
                return
            }
            try {
                const res = await fetch(`/api/user/bank-accounts?userId=${teacherId}`)
                const data = await res.json()
                if (data.accounts) setTeacherBankAccounts(data.accounts)
            } catch (err) {
                console.error("Fetch teacher bank accounts error:", err)
            }
        }
        fetchTeacherAccounts()
    }, [teacherId])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setMessage(null)
        
            if (isEditMode && courseId) {
                // ✅ EDIT MODE: Gọi updateCourseAction (THÊM MỚI)
                const updateData: any = {
                    id_khoa: idKhoa,
                    teacherBankAccountId,
                name_lop: nameLop,
                name_khoa: nameKhoa || null,
                categoryId,
                type,
                status,
                pin,
                date_join: dateJoin || null,
                mo_ta_ngan: moTaNgan || null,
                mo_ta_dai: moTaDai || null,
                link_anh_bia: linkAnhBia || null,
                phi_coc: phiCoc,
                feeType,
                acceptedVoucherIds,
                awardVoucherIds,
                noidung_stk: noidungStk || null,
                link_zalo: linkZalo || null,
                file_email: fileEmail || null,
                noidung_email: noidungEmail || null,
            }

            // Cho phép Admin/Teacher thay đổi Giáo viên
            if (isAdmin || isTeacher) {
                updateData.teacherId = teacherId ? parseInt(teacherId) : null
            }

            const res = await updateCourseAction(parseInt(courseId), updateData)
            
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
            if (categoryId) formData.append('categoryId', categoryId.toString())
            formData.append('type', type)
            formData.append('status', status.toString())
            formData.append('pin', pin.toString())
            if (dateJoin) formData.append('date_join', dateJoin)
            if (moTaNgan) formData.append('mo_ta_ngan', moTaNgan)
            if (moTaDai) formData.append('mo_ta_dai', moTaDai)
            if (linkAnhBia) formData.append('link_anh_bia', linkAnhBia)
            formData.append('phi_coc', phiCoc.toString())
            formData.append('feeType', feeType)
            formData.append('acceptedVoucherIds', JSON.stringify(acceptedVoucherIds))
            formData.append('awardVoucherIds', JSON.stringify(awardVoucherIds))
            if (teacherBankAccountId) formData.append('teacherBankAccountId', teacherBankAccountId.toString())
            if (noidungStk) formData.append('noidung_stk', noidungStk)
            if (linkZalo) formData.append('link_zalo', linkZalo)
            if (fileEmail) formData.append('file_email', fileEmail)
            if (noidungEmail) formData.append('noidung_email', noidungEmail)
            if ((isAdmin || isTeacher) && teacherId) formData.append('teacherId', teacherId)
            
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

    const handleDeleteLesson = async (lessonId: string) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa bài học này?')) return
        const res = await deleteLessonAction(lessonId)
        if (res.success) {
            setMessage({ type: 'success', text: 'Đã xóa bài học thành công!' })
            // Refresh lessons
            const courseRes = await fetch(`/api/courses/${courseId}`).then(r => r.json())
            if (courseRes && !courseRes.error) setLessons(courseRes.lessons || [])
        } else {
            setMessage({ type: 'error', text: res.error || 'Lỗi khi xóa bài học' })
        }
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
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Mã khóa học *</label>
                            <input 
                                type="text" 
                                value={idKhoa} 
                                onChange={(e) => setIdKhoa(e.target.value.toUpperCase())} 
                                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none" 
                                placeholder="VD: SK_NP5" 
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
                                  value={categoryId ?? ''} 
                                  onChange={(e) => setCategoryId(e.target.value ? parseInt(e.target.value) : null)}
                                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none"
                              >
                                  <option value="">Khác</option>
                                  {categories.map((cat: any) => (
                                      <option key={cat.id} value={cat.id}>{cat.name}</option>
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
                                <option value="SYS">Hệ thống (SYS)</option>
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
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Voucher áp dụng cho khóa này</label>
                                <div className="mt-2">
                                    {acceptedVoucherIds.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mb-2">
                                            {acceptedVoucherIds.map(vId => {
                                                const v = allVouchers.find((x: any) => x.id === vId)
                                                if (!v) return null
                                                return (
                                                    <span key={vId} className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold">
                                                        {v.name} <span className="text-blue-400 text-[10px]">({v.type})</span>
                                                        <button type="button" onClick={() => setAcceptedVoucherIds(acceptedVoucherIds.filter(id => id !== vId))} className="ml-0.5 text-blue-400 hover:text-blue-700"><X className="w-3 h-3" /></button>
                                                    </span>
                                                )
                                            })}
                                        </div>
                                    )}
                                    <div className="relative">
                                        <button type="button" onClick={() => setShowAcceptedDropdown(!showAcceptedDropdown)} className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-50 border border-dashed border-gray-300 rounded-lg text-xs font-bold text-gray-500 hover:bg-gray-100 hover:border-gray-400 transition-all">
                                            <Plus className="w-3.5 h-3.5" /> Thêm voucher
                                        </button>
                                        {showAcceptedDropdown && (
                                            <div className="absolute z-50 mt-1 w-64 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                                                {allVouchers.filter((v: any) => !acceptedVoucherIds.includes(v.id)).length === 0 ? (
                                                    <p className="px-3 py-2 text-xs text-gray-400">Đã thêm tất cả</p>
                                                ) : (
                                                    allVouchers.filter((v: any) => !acceptedVoucherIds.includes(v.id)).map((v: any) => (
                                                        <button key={v.id} type="button" onClick={() => { setAcceptedVoucherIds([...acceptedVoucherIds, v.id]); setShowAcceptedDropdown(false) }} className="w-full text-left px-3 py-2 hover:bg-blue-50 flex items-center gap-2 text-xs font-bold text-gray-700 transition-colors">
                                                            <Plus className="w-3 h-3 text-blue-500" />
                                                            <span>{v.name}</span>
                                                            <span className="text-[10px] text-gray-400 ml-auto">({v.type})</span>
                                                        </button>
                                                    ))
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Voucher thưởng khi kích hoạt</label>
                                <div className="mt-2">
                                    {awardVoucherIds.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mb-2">
                                            {awardVoucherIds.map(vId => {
                                                const v = allVouchers.find((x: any) => x.id === vId)
                                                if (!v) return null
                                                return (
                                                    <span key={vId} className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-xs font-bold">
                                                        {v.name} <span className="text-purple-400 text-[10px]">({v.type})</span>
                                                        <button type="button" onClick={() => setAwardVoucherIds(awardVoucherIds.filter(id => id !== vId))} className="ml-0.5 text-purple-400 hover:text-purple-700"><X className="w-3 h-3" /></button>
                                                    </span>
                                                )
                                            })}
                                        </div>
                                    )}
                                    <div className="relative">
                                        <button type="button" onClick={() => setShowAwardDropdown(!showAwardDropdown)} className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-50 border border-dashed border-gray-300 rounded-lg text-xs font-bold text-gray-500 hover:bg-gray-100 hover:border-gray-400 transition-all">
                                            <Plus className="w-3.5 h-3.5" /> Thêm voucher
                                        </button>
                                        {showAwardDropdown && (
                                            <div className="absolute z-50 mt-1 w-64 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                                                {allVouchers.filter((v: any) => !awardVoucherIds.includes(v.id)).length === 0 ? (
                                                    <p className="px-3 py-2 text-xs text-gray-400">Đã thêm tất cả</p>
                                                ) : (
                                                    allVouchers.filter((v: any) => !awardVoucherIds.includes(v.id)).map((v: any) => (
                                                        <button key={v.id} type="button" onClick={() => { setAwardVoucherIds([...awardVoucherIds, v.id]); setShowAwardDropdown(false) }} className="w-full text-left px-3 py-2 hover:bg-purple-50 flex items-center gap-2 text-xs font-bold text-gray-700 transition-colors">
                                                            <Plus className="w-3 h-3 text-purple-500" />
                                                            <span>{v.name}</span>
                                                            <span className="text-[10px] text-gray-400 ml-auto">({v.type})</span>
                                                        </button>
                                                    ))
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
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
                        {(isAdmin || isTeacher) && (
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Giáo viên</label>
                                <select 
                                    value={teacherId} 
                                    onChange={(e) => setTeacherId(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none"
                                >
                                    <option value="">Tự động (session)</option>
                                    {teachers.map((t: any) => (
                                        <option key={t.id} value={t.id}>[#{t.id}] {t.name || t.email}</option>
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
                        <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Mô tả ngắn (Enter để xuống dòng)</label>
                        <textarea 
                            value={moTaNgan} 
                            onChange={(e) => setMoTaNgan(e.target.value)}
                            onKeyDown={(e) => handleTextareaKeyDown(e, setMoTaNgan)}
                            rows={6}
                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm outline-none resize-y" 
                            placeholder="Mô tả ngắn gọn... (Enter để xuống dòng sẽ tự thêm <br>)" 
                        />
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
                                 type="text" 
                                 value={linkAnhBia} 
                                 onChange={(e) => setLinkAnhBia(e.target.value)} 
                                 className="flex-1 bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none" 
                                 placeholder="https://... hoặc /uploads/courses/..." 
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
                    
                    {teacherBankAccounts.length > 0 && (
                        <div className="space-y-1.5 mb-4">
                            <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Chọn từ tài khoản đã lưu</label>
                            <select
                                value={teacherBankAccountId ?? ''}
                                onChange={(e) => {
                                    const id = e.target.value ? parseInt(e.target.value) : null
                                    setTeacherBankAccountId(id)
                                }}
                                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none"
                            >
                                <option value="">Chọn tài khoản...</option>
                                {teacherBankAccounts.map((acc: any) => (
                                    <option key={acc.id} value={acc.id}>
                                        {acc.accountHolder} - {acc.accountNumber} {acc.bankName ? `(${acc.bankName})` : ''} {acc.isDefault ? '(Mặc định)' : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
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
                            <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Dạng phí</label>
                            <select value={feeType} onChange={(e) => setFeeType(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none">
                                <option value="MIEN_PHI">Miễn phí</option>
                                <option value="PHI_TUY_TINH">Phí tùy tâm</option>
                                <option value="PHI_CAM_KET">Phí cam kết</option>
                                <option value="PHI_DONG_HANH">Phí đồng hành</option>
                                <option value="PHI_TOI_THIEU">Phí tối thiểu</option>
                            </select>
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
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowImport(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-xs font-black uppercase rounded-xl hover:bg-green-700 transition-all"
                            >
                                <Upload className="w-4 h-4" /> Import
                            </button>
                            <button 
                                onClick={() => setShowAddLesson(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-xs font-black uppercase rounded-xl hover:bg-blue-700 transition-all"
                            >
                                + Thêm bài học
                            </button>
                        </div>
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
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setSelectedLesson(lesson)}
                                            className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center hover:bg-gray-900 hover:text-white transition-all active:scale-90"
                                        >
                                            <Settings className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteLesson(lesson.id)}
                                            className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-600 hover:text-white transition-all active:scale-90"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
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
                            title: data.title, videoUrl: data.videoUrl, order: data.order, type: data.type, content: data.content
                        })
                        if (res.success) {
                            setMessage({ type: 'success', text: 'Đã cập nhật bài học thành công!' })
                            // Refresh data
                            const courseRes = await fetch(`/api/courses/${courseId}`).then(r => r.json())
                            if (courseRes && !courseRes.error) setLessons(courseRes.lessons || [])
                        }
                    }}
                    onDelete={handleDeleteLesson}
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

            {/* ✅ THÊM MỚI: AddLessonModal */}
            {showAddLesson && (
                <AddLessonModal
                    courseId={courseId || ''}
                    onClose={() => setShowAddLesson(false)}
                    onComplete={async () => {
                        const courseRes = await fetch(`/api/courses/${courseId}`).then(r => r.json())
                        if (courseRes && !courseRes.error) setLessons(courseRes.lessons || [])
                        setShowAddLesson(false)
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
