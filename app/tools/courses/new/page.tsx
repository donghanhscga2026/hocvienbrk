'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createCourseAction, getTeachersAction } from '@/app/actions/course-actions'
import { BookOpen, DollarSign, Settings, Loader2, ArrowLeft, Upload, CheckCircle2, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import MainHeader from '@/components/layout/MainHeader'

export default function CreateCoursePage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
    const [isAdmin, setIsAdmin] = useState(false)
    const [teachers, setTeachers] = useState<any[]>([])
    
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
        }
        fetchData()
    }, [])
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setMessage(null)
        
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
        
        setLoading(false)
    }
    
    return (
        <div className="min-h-screen bg-gray-50">
            <MainHeader title="TẠO KHÓA HỌC MỚI" toolSlug="courses" />
            
            <div className="max-w-2xl mx-auto space-y-8 p-4 pb-32">
                <Link href="/tools/courses" className="inline-flex items-center gap-2 text-xs font-black text-gray-400 uppercase hover:text-purple-600 transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Quay lại danh sách
                </Link>
                
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
                                <option value="Lập trình">Lập trình</option>
                                <option value="Marketing">Marketing</option>
                                <option value="Kinh doanh">Kinh doanh</option>
                                <option value="Ngoại ngữ">Ngoại ngữ</option>
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
                        <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Mô tả ngắn (max 200 chars)</label>
                        <textarea 
                            value={moTaNgan} 
                            onChange={(e) => setMoTaNgan(e.target.value.slice(0, 200))} 
                            rows={2}
                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm outline-none" 
                            placeholder="Mô tả ngắn gọn..." 
                        />
                        <div className="text-right text-[10px] text-gray-400">{moTaNgan.length}/200</div>
                    </div>
                    
                    <div className="space-y-1.5 mt-4">
                        <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Mô tả dài</label>
                        <textarea 
                            value={moTaDai} 
                            onChange={(e) => setMoTaDai(e.target.value)} 
                            rows={4}
                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm outline-none" 
                            placeholder="Mô tả chi tiết khóa học..." 
                        />
                    </div>
                    
                    <div className="space-y-1.5 mt-4">
                        <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Link ảnh bìa</label>
                        <input 
                            type="url" 
                            value={linkAnhBia} 
                            onChange={(e) => setLinkAnhBia(e.target.value)} 
                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none" 
                            placeholder="https://..." 
                        />
                        {linkAnhBia && <img src={linkAnhBia} alt="Preview" className="w-full h-40 object-cover rounded-2xl mt-2" />}
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
                    Tạo Khóa học
                </button>
            </div>
        </div>
    )
}