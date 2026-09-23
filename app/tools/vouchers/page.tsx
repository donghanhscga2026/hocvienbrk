'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import {
    Plus, Trash2, Tag, RefreshCw, Loader2, X, Check, AlertTriangle,
    ChevronDown, ChevronUp, Shield, UserLock, Search, Filter
} from 'lucide-react'
import {
    createVoucher, deleteVoucher, getVouchersWithCourses,
    awardVoucherToCourse, acceptVoucherToCourse, removeVoucherFromCourse, getAdminCoursesAction
} from '@/app/actions/admin-actions'
import MainHeader from '@/components/layout/MainHeader'

interface VoucherData {
    id: number
    code: string
    name: string
    type: 'VIP' | 'ALL' | 'CASH'
    value: number
    durationDays: number | null
    description: string | null
    isActive: boolean
    createdAt: Date
    awardedCourses: { course: { id: number; id_khoa: string; name_lop: string; teacherId: number } }[]
    acceptedCourses: { course: { id: number; id_khoa: string; name_lop: string; teacherId: number } }[]
}

const typeColors: Record<string, string> = {
    VIP: 'bg-amber-100 text-amber-700 border-amber-200',
    ALL: 'bg-blue-100 text-blue-700 border-blue-200',
    CASH: 'bg-green-100 text-green-700 border-green-200',
}

export default function VouchersPage() {
    const { data: session } = useSession()
    const userRole = session?.user?.role as string
    const isAdmin = userRole === 'ADMIN'
    const isTeacher = userRole === 'TEACHER'

    const [vouchers, setVouchers] = useState<VoucherData[]>([])
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState(false)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [showManageModal, setShowManageModal] = useState<number | null>(null)
    const [manageVoucher, setManageVoucher] = useState<VoucherData | null>(null)
    const [coursesList, setCoursesList] = useState<{ id: number; id_khoa: string; name_lop: string }[]>([])
    const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [successMsg, setSuccessMsg] = useState<string | null>(null)
    const [filterType, setFilterType] = useState<string>('ALL')

    const fetchVouchers = useCallback(async () => {
        try {
            setLoading(true)
            const res = await fetch('/api/vouchers')
            const data = await res.json()
            if (data.vouchers) {
                setVouchers(data.vouchers)
            } else if (data.error) {
                setError(data.error)
            }
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchVouchers() }, [fetchVouchers])

    const openManageModal = async (voucher: VoucherData) => {
        setManageVoucher(voucher)
        setShowManageModal(voucher.id)
        try {
            const result = await getAdminCoursesAction()
            if (result.success && result.courses) {
                setCoursesList(result.courses.map((c: any) => ({ id: c.id, id_khoa: c.id_khoa, name_lop: c.name_lop })))
            }
        } catch {}
    }

    const handleAwardToCourse = async (voucherId: number, courseId: number) => {
        setActionLoading(true)
        const result = await awardVoucherToCourse({ voucherId, courseId })
        if (result.success) { fetchVouchers(); setSuccessMsg('✅ Đã gắn voucher làm thưởng khi kích hoạt!') }
        else { setError(result.error || 'Thất bại') }
        setActionLoading(false)
    }

    const handleAcceptToCourse = async (voucherId: number, courseId: number) => {
        setActionLoading(true)
        const result = await acceptVoucherToCourse({ voucherId, courseId })
        if (result.success) { fetchVouchers(); setSuccessMsg('✅ Đã gắn voucher để chấp nhận!') }
        else { setError(result.error || 'Thất bại') }
        setActionLoading(false)
    }

    const handleRemoveFromCourse = async (voucherId: number, courseId: number, type: 'award' | 'accepted') => {
        setActionLoading(true)
        const result = await removeVoucherFromCourse({ voucherId, courseId, type })
        if (result.success) { fetchVouchers(); setSuccessMsg('✅ Đã xoá liên kết voucher!') }
        else { setError(result.error || 'Thất bại') }
        setActionLoading(false)
    }

    const handleCreate = async (formData: FormData) => {
        setActionLoading(true); setError(null); setSuccessMsg(null)
        const data = {
            code: formData.get('code') as string,
            name: formData.get('name') as string,
            type: formData.get('type') as 'VIP' | 'ALL' | 'CASH',
            value: Number(formData.get('value')) || 0,
            durationDays: formData.get('durationDays') ? Number(formData.get('durationDays')) : null,
            description: formData.get('description') as string || null,
        }
        const result = await createVoucher(data)
        if (result.success) { setShowCreateModal(false); setSuccessMsg('✅ Đã tạo voucher mới!'); fetchVouchers() }
        else { setError(result.error || 'Tạo voucher thất bại') }
        setActionLoading(false)
    }

    const handleDelete = async (voucherId: number) => {
        setActionLoading(true); setError(null)
        const result = await deleteVoucher(voucherId)
        if (result.success) { setSuccessMsg('✅ Đã xóa voucher!'); fetchVouchers() }
        else { setError(result.error || 'Xóa voucher thất bại') }
        setActionLoading(false)
        setDeleteConfirmId(null)
    }

    const handleAwardSelect = (voucherId: number, e: React.ChangeEvent<HTMLSelectElement>) => {
        const courseId = Number(e.target.value)
        if (courseId) handleAwardToCourse(voucherId, courseId)
    }

    const handleAcceptSelect = (voucherId: number, e: React.ChangeEvent<HTMLSelectElement>) => {
        const courseId = Number(e.target.value)
        if (courseId) handleAcceptToCourse(voucherId, courseId)
    }

    const filteredVouchers = filterType === 'ALL' ? vouchers : vouchers.filter(v => v.type === filterType)
    const stats = { total: vouchers.length, vip: vouchers.filter(v => v.type === 'VIP').length, all: vouchers.filter(v => v.type === 'ALL').length, cash: vouchers.filter(v => v.type === 'CASH').length }

    if (loading) {
        return <div className="flex items-center justify-center min-h-screen bg-brk-background"><Loader2 className="h-8 w-8 text-brk-accent animate-spin" /></div>
    }

    return (
        <div className="min-h-screen bg-brk-background">
            <MainHeader title="Quản lý Voucher" />
            <main className="max-w-7xl mx-auto px-4 py-8">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-black text-brk-on-surface flex items-center gap-3">
                            <Tag className="h-7 w-7 text-brk-accent" /> Quản lý Voucher
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">{isAdmin ? 'Tất cả voucher trong hệ thống' : 'Voucher của các khóa bạn quản lý'}</p>
                    </div>
                    {isAdmin && (
                        <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 px-4 py-2 bg-brk-accent text-white rounded-xl hover:bg-brk-accent/90 transition-all font-bold text-sm shadow-lg">
                            <Plus className="h-4 w-4" /> Tạo Voucher mới
                        </button>
                    )}
                </div>

                {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-sm"><AlertTriangle className="h-4 w-4 shrink-0" /> {error}</div>}
                {successMsg && <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2 text-green-700 text-sm"><Check className="h-4 w-4 shrink-0" /> {successMsg}</div>}

                <div className="grid grid-cols-4 gap-4 mb-6">
                    {[
                        { label: 'Tổng', value: stats.total, color: 'bg-gray-100 text-gray-700' },
                        { label: 'VIP', value: stats.vip, color: 'bg-amber-100 text-amber-700' },
                        { label: 'All Access', value: stats.all, color: 'bg-blue-100 text-blue-700' },
                        { label: 'Cash', value: stats.cash, color: 'bg-green-100 text-green-700' },
                    ].map((s) => (
                        <div key={s.label} className={`${s.color} rounded-xl p-4 text-center border`}>
                            <div className="text-3xl font-black">{s.value}</div>
                            <div className="text-xs font-bold uppercase mt-1 opacity-70">{s.label}</div>
                        </div>
                    ))}
                </div>

                <div className="flex gap-2 mb-6">
                    {['ALL', 'VIP', 'CASH'].map((type) => (
                        <button key={type} onClick={() => setFilterType(type)}
                            className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all border ${filterType === type ? 'bg-brk-accent text-white border-brk-accent' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                            {type === 'ALL' ? 'All Access' : type}
                        </button>
                    ))}
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="text-left px-4 py-3 text-xs font-black text-gray-500 uppercase">Mã</th>
                                <th className="text-left px-4 py-3 text-xs font-black text-gray-500 uppercase">Tên</th>
                                <th className="text-left px-4 py-3 text-xs font-black text-gray-500 uppercase">Loại</th>
                                <th className="text-left px-4 py-3 text-xs font-black text-gray-500 uppercase">Giá trị</th>
                                <th className="text-left px-4 py-3 text-xs font-black text-gray-500 uppercase">Hạn</th>
                                <th className="text-left px-4 py-3 text-xs font-black text-gray-500 uppercase">Trạng thái</th>
                                <th className="text-left px-4 py-3 text-xs font-black text-gray-500 uppercase">Khóa liên kết</th>
                                <th className="text-right px-4 py-3 text-xs font-black text-gray-500 uppercase">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredVouchers.length === 0 ? (
                                <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400 text-sm">Không có voucher nào</td></tr>
                            ) : filteredVouchers.map((v) => (
                                <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3"><code className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">{v.code}</code></td>
                                    <td className="px-4 py-3 text-sm font-bold text-brk-on-surface">{v.name}</td>
                                    <td className="px-4 py-3"><span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${typeColors[v.type]}`}>{v.type}</span></td>
                                    <td className="px-4 py-3 text-sm font-bold">{v.value.toLocaleString('vi-VN')}đ</td>
                                    <td className="px-4 py-3 text-sm text-gray-600">{v.durationDays ? `${v.durationDays} ngày` : 'Không hạn'}</td>
                                    <td className="px-4 py-3"><span className={`inline-flex items-center gap-1 text-xs font-bold ${v.isActive ? 'text-green-600' : 'text-gray-400'}`}>{v.isActive ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />} {v.isActive ? 'Active' : 'Inactive'}</span></td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-wrap gap-1">
                                            {v.awardedCourses.slice(0, 2).map((ac, i) => <span key={`award-${i}`} className="inline-flex items-center px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded text-[10px] font-bold">🎁 {ac.course.name_lop}</span>)}
                                            {v.acceptedCourses.slice(0, 2).map((ac, i) => <span key={`accept-${i}`} className="inline-flex items-center px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-bold">✅ {ac.course.name_lop}</span>)}
                                            {v.awardedCourses.length + v.acceptedCourses.length > 4 && <span className="text-[10px] text-gray-400">+{v.awardedCourses.length + v.acceptedCourses.length - 4} hơn</span>}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {deleteConfirmId === v.id ? (
                                                <>
                                                    <button onClick={() => handleDelete(v.id)} disabled={actionLoading} className="px-2 py-1 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700">{actionLoading ? <Loader2 className="h-3 w-3 animate-spin mx-auto" /> : 'Xác nhận'}</button>
                                                    <button onClick={() => setDeleteConfirmId(null)} className="px-2 py-1 bg-gray-200 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-300">Huỷ</button>
                                                </>
                                            ) : (
                                                <button onClick={() => setDeleteConfirmId(v.id)} disabled={actionLoading} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Xóa voucher"><Trash2 className="h-4 w-4" /></button>
                                            )}
                                            <button onClick={() => openManageModal(v)} className="px-2 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-bold hover:bg-purple-200 transition-colors mt-1">🔗 Khóa</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {showCreateModal && (
                    <CreateVoucherModal onClose={() => setShowCreateModal(false)} onSubmit={handleCreate} loading={actionLoading} />
                )}
                {showManageModal !== null && manageVoucher && (
                    <ManageCoursesModal
                        voucher={manageVoucher} coursesList={coursesList}
                        onClose={() => { setShowManageModal(null); setManageVoucher(null) }}
                        onAwardSelect={(vid, e) => { const c = Number(e.target.value); if (c) handleAwardToCourse(vid, c) }}
                        onAcceptSelect={(vid, e) => { const c = Number(e.target.value); if (c) handleAcceptToCourse(vid, c) }}
                        onRemove={handleRemoveFromCourse}
                        loading={actionLoading}
                    />
                )}
            </main>
        </div>
    )
}

function CreateVoucherModal({ onClose, onSubmit, loading }: { onClose: () => void; onSubmit: (formData: FormData) => void; loading: boolean }) {
    const [code, setCode] = useState('')
    const [name, setName] = useState('')
    const [type, setType] = useState<'VIP' | 'ALL' | 'CASH'>('ALL')
    const [value, setValue] = useState('0')
    const [durationDays, setDurationDays] = useState('')
    const [description, setDescription] = useState('')

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        const formData = new FormData()
        formData.set('code', code); formData.set('name', name); formData.set('type', type)
        formData.set('value', value)
        if (durationDays) formData.set('durationDays', durationDays)
        if (description) formData.set('description', description)
        onSubmit(formData)
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-black text-brk-on-surface">Tạo Voucher mới</h2>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X className="h-5 w-5 text-gray-400" /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div><label className="text-xs font-bold uppercase text-gray-400 mb-1 block">Mã voucher *</label>
                        <input type="text" required value={code} onChange={e => setCode(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-brk-accent focus:ring-1 focus:ring-brk-accent" placeholder="VD: VIP001" />
                    </div>
                    <div><label className="text-xs font-bold uppercase text-gray-400 mb-1 block">Tên *</label>
                        <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-brk-accent focus:ring-1 focus:ring-brk-accent" placeholder="VD: Voucher VIP MB1" />
                    </div>
                    <div><label className="text-xs font-bold uppercase text-gray-400 mb-1 block">Loại *</label>
                        <select value={type} onChange={e => setType(e.target.value as 'VIP' | 'ALL' | 'CASH')} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-brk-accent focus:ring-1 focus:ring-brk-accent">
                            <option value="ALL">All Access</option><option value="VIP">VIP</option><option value="CASH">CASH</option>
                        </select>
                    </div>
                    <div><label className="text-xs font-bold uppercase text-gray-400 mb-1 block">Giá trị (đ)</label>
                        <input type="number" value={value} onChange={e => setValue(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-brk-accent focus:ring-1 focus:ring-brk-accent" />
                    </div>
                    <div><label className="text-xs font-bold uppercase text-gray-400 mb-1 block">Thời hạn (ngày)</label>
                        <input type="number" value={durationDays} onChange={e => setDurationDays(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-brk-accent focus:ring-1 focus:ring-brk-accent" placeholder="Không điền = không hạn" />
                    </div>
                    <div><label className="text-xs font-bold uppercase text-gray-400 mb-1 block">Mô tả</label>
                        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-brk-accent focus:ring-1 focus:ring-brk-accent resize-none" placeholder="Mô tả voucher..." />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-brk-accent text-white rounded-xl font-bold text-sm hover:bg-brk-accent/90 transition-colors disabled:opacity-50">
                            {loading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Tạo'}
                        </button>
                        <button type="button" onClick={onClose} className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-200 transition-colors">Huỷ</button>
                    </div>
                </form>
            </div>
        </div>
    )
}

function ManageCoursesModal({ voucher, coursesList, onClose, onAwardSelect, onAcceptSelect, onRemove, loading }: {
    voucher: VoucherData
    coursesList: { id: number; id_khoa: string; name_lop: string }[]
    onClose: () => void
    onAwardSelect: (voucherId: number, e: React.ChangeEvent<HTMLSelectElement>) => void
    onAcceptSelect: (voucherId: number, e: React.ChangeEvent<HTMLSelectElement>) => void
    onRemove: (voucherId: number, courseId: number, type: 'award' | 'accepted') => void
    loading: boolean
}) {
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-black text-brk-on-surface">🔗 Quản lý khóa cho: {voucher.name}</h2>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X className="h-5 w-5 text-gray-400" /></button>
                </div>
                <div className="mb-6">
                    <h3 className="text-sm font-black text-purple-700 uppercase mb-2">🎁 Award (tự động khi đăng ký)</h3>
                    {voucher.awardedCourses.slice(0, 5).map((ac, i) => (
                        <div key={`award-${i}`} className="flex items-center justify-between bg-purple-50 rounded-lg px-3 py-2 mb-1.5">
                            <span className="text-xs font-bold text-purple-800">{ac.course.name_lop} ({ac.course.id_khoa})</span>
                            <button onClick={() => onRemove(voucher.id, ac.course.id, 'award')} className="text-red-500 hover:text-red-700 text-xs font-bold" disabled={loading}>✕</button>
                        </div>
                    ))}
                    {voucher.awardedCourses.length === 0 && <p className="text-xs text-gray-400 italic">Chưa có khóa nào</p>}
                    <div className="mt-2">
                        <select onChange={(e) => onAwardSelect(voucher.id, e)} className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs outline-none focus:border-purple-400">
                            <option value="">Thêm award...</option>
                            {coursesList.filter(c => !voucher.awardedCourses.some(ac => ac.course.id === c.id)).map(c => <option key={c.id} value={c.id}>{c.name_lop} ({c.id_khoa})</option>)}
                        </select>
                    </div>
                </div>
                <div className="mb-6">
                    <h3 className="text-sm font-black text-blue-700 uppercase mb-2">✅ Accepted (người dùng nhấn nhận)</h3>
                    {voucher.acceptedCourses.slice(0, 5).map((ac, i) => (
                        <div key={`accept-${i}`} className="flex items-center justify-between bg-blue-50 rounded-lg px-3 py-2 mb-1.5">
                            <span className="text-xs font-bold text-blue-800">{ac.course.name_lop} ({ac.course.id_khoa})</span>
                            <button onClick={() => onRemove(voucher.id, ac.course.id, 'accepted')} className="text-red-500 hover:text-red-700 text-xs font-bold" disabled={loading}>✕</button>
                        </div>
                    ))}
                    {voucher.acceptedCourses.length === 0 && <p className="text-xs text-gray-400 italic">Chưa có khóa nào</p>}
                    <div className="mt-2">
                        <select onChange={(e) => onAcceptSelect(voucher.id, e)} className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs outline-none focus:border-blue-400">
                            <option value="">Thêm accepted...</option>
                            {coursesList.filter(c => !voucher.acceptedCourses.some(ac => ac.course.id === c.id)).map(c => <option key={c.id} value={c.id}>{c.name_lop} ({c.id_khoa})</option>)}
                        </select>
                    </div>
                </div>
            </div>
        </div>
    )
}
