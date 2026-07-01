'use client'

import { useState, useEffect, useMemo } from 'react'
import { getAdminCoursesAction, bulkToggleCourseStatusAction, getStudentsAction } from '@/app/actions/admin-actions'
import { BookOpen, Users, DollarSign, Settings, Loader2, Plus, Eye, EyeOff, CheckSquare, X, Search, Tag, Trash2, Save, Edit2 } from 'lucide-react'
import Link from 'next/link'
import MainHeader from '@/components/layout/MainHeader'

export default function ToolsCoursesPage() {
    const [activeTab, setActiveTab] = useState<'courses' | 'categories'>('courses')

    return (
        <div className="min-h-screen bg-gray-50">
            <MainHeader title="KHÓA HỌC" toolSlug="courses" />

            <div className="p-4 max-w-4xl mx-auto space-y-4 pb-20">
                <div className="flex gap-2 bg-gray-100 p-1 rounded-2xl mt-4">
                    <button
                        onClick={() => setActiveTab('courses')}
                        className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'courses' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <BookOpen className="w-4 h-4 inline mr-2" /> Khóa học
                    </button>
                    <button
                        onClick={() => setActiveTab('categories')}
                        className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'categories' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <Tag className="w-4 h-4 inline mr-2" /> Danh mục
                    </button>
                </div>

                {activeTab === 'courses' ? <CoursesTab /> : <CategoriesTab />}
            </div>
        </div>
    )
}

function CoursesTab() {
    const [courses, setCourses] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [isAdmin, setIsAdmin] = useState(false)
    const [currentUserId, setCurrentUserId] = useState<number | null>(null)
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
    const [batchLoading, setBatchLoading] = useState(false)

    const [viewStudents, setViewStudents] = useState<{ courseId: number; courseName: string } | null>(null)
    const [studentsList, setStudentsList] = useState<any[]>([])
    const [studentsLoading, setStudentsLoading] = useState(false)

    const [search, setSearch] = useState('')
    const [filterStatus, setFilterStatus] = useState('ACTIVE')
    const [filterCategory, setFilterCategory] = useState('ALL')
    const [filterTeacher, setFilterTeacher] = useState('ALL')

    useEffect(() => {
        const fetchCourses = async () => {
            setLoading(true)
            const res = await getAdminCoursesAction()
            if (res.success) {
                setCourses(res.courses || [])
                setIsAdmin(res.isAdmin || false)
                setCurrentUserId(res.userId || null)
                if (!res.isAdmin && res.userId) {
                    setFilterTeacher(String(res.userId))
                }
            }
            setLoading(false)
        }
        fetchCourses()
    }, [])

    const categories = useMemo(() => {
        const cats = new Set(courses.map((c: any) => c.courseCategory?.name || c.category || 'Khác'))
        return Array.from(cats).sort()
    }, [courses])

    const teachers = useMemo(() => {
        const unique = new Map<number, string>()
        courses.forEach((c: any) => {
            if (c.teacher) unique.set(c.teacher.id, c.teacher.name || c.teacher.email || `Teacher #${c.teacher.id}`)
        })
        return Array.from(unique.entries()).map(([id, name]) => ({ id, name }))
    }, [courses])

    const filteredCourses = useMemo(() => {
        return courses.filter((course: any) => {
            if (search.trim()) {
                const q = search.toLowerCase()
                const match = (course.name_lop || '').toLowerCase().includes(q)
                    || (course.id_khoa || '').toLowerCase().includes(q)
                    || (course.name_khoa || '').toLowerCase().includes(q)
                if (!match) return false
            }
            if (filterStatus === 'ACTIVE' && !course.status) return false
            if (filterStatus === 'HIDDEN' && course.status) return false
            const catName = course.courseCategory?.name || course.category || 'Khác'
            if (filterCategory !== 'ALL' && catName !== filterCategory) return false
            if (filterTeacher !== 'ALL') {
                const tid = parseInt(filterTeacher)
                if (course.teacherId !== tid) return false
            }
            return true
        })
    }, [courses, search, filterStatus, filterCategory, filterTeacher])

    const toggleSelect = (id: number) => {
        setSelectedIds(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredCourses.length) {
            setSelectedIds(new Set())
        } else {
            setSelectedIds(new Set(filteredCourses.map(c => c.id)))
        }
    }

    const handleBulkAction = async (newStatus: boolean) => {
        const label = newStatus ? 'kích hoạt' : 'ẩn'
        if (!confirm(`Xác nhận ${label} ${selectedIds.size} khóa học?`)) return

        setBatchLoading(true)
        try {
            const res = await bulkToggleCourseStatusAction(Array.from(selectedIds), newStatus)
            if (res.success) {
                const refreshed = await getAdminCoursesAction()
                if (refreshed.success) setCourses(refreshed.courses || [])
                setSelectedIds(new Set())
            } else {
                alert(res.error || 'Có lỗi xảy ra')
            }
        } catch {
            alert('Có lỗi xảy ra')
        } finally {
            setBatchLoading(false)
        }
    }

    const handleViewStudents = async (courseId: number, courseName: string) => {
        setViewStudents({ courseId, courseName })
        setStudentsLoading(true)
        setStudentsList([])
        try {
            const res = await getStudentsAction(undefined, undefined, 0, 9999, 'id', 'asc', courseId)
            if (res.success) {
                setStudentsList(res.students || [])
            }
        } catch {}
        setStudentsLoading(false)
    }

    return (
        <>
            <div className="flex items-center justify-between mt-4">
                <div>
                    <p className="text-gray-600 text-sm">Quản lý nội dung & học phí</p>
                </div>
                <Link href="/tools/courses/new" className="bg-yellow-400 text-black p-2 rounded-xl inline-flex">
                    <Plus className="w-4 h-4" />
                </Link>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-3 space-y-2">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Tìm khóa học..."
                        className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-yellow-200 transition-all"
                    />
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Trạng Thái</span>
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                        className="text-xs bg-gray-50 border border-gray-100 rounded-lg px-2 py-1.5 font-medium outline-none focus:ring-2 focus:ring-yellow-200">
                        <option value="ALL">Tất cả trạng thái</option>
                        <option value="ACTIVE">Đang mở</option>
                        <option value="HIDDEN">Đã ẩn</option>
                    </select>
                    <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
                        className="text-xs bg-gray-50 border border-gray-100 rounded-lg px-2 py-1.5 font-medium outline-none focus:ring-2 focus:ring-yellow-200">
                        <option value="ALL">Tất cả danh mục</option>
                        {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                    {teachers.length > 0 && (
                        isAdmin ? (
                            <select value={filterTeacher} onChange={e => setFilterTeacher(e.target.value)}
                                className="text-xs bg-gray-50 border border-gray-100 rounded-lg px-2 py-1.5 font-medium outline-none focus:ring-2 focus:ring-yellow-200">
                                <option value="ALL">Tất cả GV</option>
                                {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        ) : (
                            <select disabled value={filterTeacher}
                                className="text-xs bg-gray-100 border border-gray-200 rounded-lg px-2 py-1.5 font-medium outline-none text-gray-500 cursor-not-allowed">
                                {teachers.filter(t => t.id === currentUserId).map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                        )
                    )}
                    {search || filterStatus !== 'ACTIVE' || filterCategory !== 'ALL' || (isAdmin && filterTeacher !== 'ALL') ? (
                        <button onClick={() => { setSearch(''); setFilterStatus('ACTIVE'); setFilterCategory('ALL'); if (isAdmin) setFilterTeacher('ALL') }}
                            className="text-xs text-gray-400 hover:text-gray-600 font-bold px-2 py-1">
                            Xóa lọc
                        </button>
                    ) : null}
                </div>
            </div>

            {selectedIds.size > 0 && (
                <div className="flex items-center gap-3 px-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm">
                    <CheckSquare className="w-4 h-4 text-gray-500 shrink-0" />
                    <span className="text-sm font-bold text-gray-700">Đã chọn {selectedIds.size} khóa học</span>
                    <div className="ml-auto flex gap-2">
                        <button
                            onClick={() => handleBulkAction(true)}
                            disabled={batchLoading}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-green-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-600 transition-colors disabled:opacity-50"
                        >
                            {batchLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3" />}
                            Kích hoạt
                        </button>
                        <button
                            onClick={() => handleBulkAction(false)}
                            disabled={batchLoading}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-yellow-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-yellow-600 transition-colors disabled:opacity-50"
                        >
                            {batchLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <EyeOff className="w-3 h-3" />}
                            Ẩn
                        </button>
                        <button
                            onClick={() => setSelectedIds(new Set())}
                            className="text-xs text-gray-400 hover:text-gray-600 font-bold px-2"
                        >
                            Bỏ chọn
                        </button>
                    </div>
                </div>
            )}

            {selectedIds.size === 0 && filteredCourses.length > 0 && (
                <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={filteredCourses.length > 0 && selectedIds.size === filteredCourses.length}
                            onChange={toggleSelectAll}
                            className="rounded border-gray-300 accent-yellow-500 cursor-pointer"
                        />
                        <span className="text-xs font-bold text-gray-400">Chọn tất cả</span>
                    </label>
                    <span className="text-xs text-gray-300 ml-auto">{filteredCourses.length} / {courses.length} khóa học</span>
                </div>
            )}

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                    <Loader2 className="w-8 h-8 animate-spin text-purple-500 mx-auto mb-3" />
                    <p className="text-xs font-black uppercase tracking-wider">Đang tải...</p>
                </div>
            ) : filteredCourses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                    <BookOpen className="w-10 h-10 mb-3" />
                    <p className="text-xs font-black uppercase tracking-wider">{courses.length === 0 ? 'Chưa có khóa học nào' : 'Không tìm thấy khóa học phù hợp'}</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredCourses.map((course) => {
                        const catName = course.courseCategory?.name || course.category || null
                        return (
                            <div
                                key={course.id}
                                className={`bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden transition-all ${
                                    !course.status ? 'opacity-60' : ''
                                } ${selectedIds.has(course.id) ? 'ring-2 ring-yellow-400' : 'hover:shadow-md'}`}
                            >
                                <div className="p-4">
                                    <div className="flex items-start gap-3">
                                        <div className="pt-0.5">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.has(course.id)}
                                                onChange={() => toggleSelect(course.id)}
                                                className="rounded border-gray-300 accent-yellow-500 cursor-pointer mt-1"
                                            />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                <span className="text-[10px] font-black font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200 shrink-0">
                                                    #{course.id}
                                                </span>
                                                <span className="text-[10px] font-bold font-mono text-gray-400">
                                                    {course.id_khoa}
                                                </span>
                                                {catName && catName !== 'Khác' && (
                                                    <span className="inline-block px-1.5 py-0.5 rounded-full text-[9px] font-black bg-purple-100 text-purple-700 border border-purple-200 shrink-0">
                                                        {catName}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="font-black text-orange-600 text-sm leading-tight break-words">
                                                    {course.name_lop}
                                                </div>
                                                <Link
                                                    href={`/tools/courses/${course.id}`}
                                                    className="shrink-0 inline-flex items-center justify-center w-8 h-8 bg-black text-yellow-400 rounded-full hover:bg-zinc-800 active:scale-90 transition-all shadow-md"
                                                >
                                                    <Settings className="w-4 h-4" />
                                                </Link>
                                            </div>

                                            <div className="flex items-center gap-3 mt-2">
                                                <div className="flex items-center gap-1 text-[10px] text-gray-500 font-bold">
                                                    <DollarSign className="w-3 h-3 text-green-500" />
                                                    {course.phi_coc.toLocaleString()}đ
                                                </div>
                                                <div className="flex items-center gap-1 text-[10px] text-gray-500 font-bold">
                                                    <BookOpen className="w-3 h-3 text-blue-400" />
                                                    {course._count?.lessons} bài
                                                </div>
                                                <button
                                                    onClick={() => handleViewStudents(course.id, course.name_lop)}
                                                    className="flex items-center gap-1 text-[10px] text-gray-500 font-bold hover:text-purple-600 transition-colors"
                                                    title="Xem học viên đã đăng ký"
                                                >
                                                    <Users className="w-3 h-3 text-purple-500" />
                                                    {course._count?.enrollments} HV
                                                </button>
                                                {course.teacher && (
                                                    <span className="text-[10px] text-gray-400 font-medium ml-auto">
                                                        GV: {course.teacher.name || course.teacher.email}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {viewStudents && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
                    onClick={() => setViewStudents(null)}
                >
                    <div
                        className="bg-white w-full max-w-lg max-h-[70vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-violet-600 to-purple-600 text-white shrink-0">
                            <h2 className="font-bold text-sm">Học viên — {viewStudents!.courseName}</h2>
                            <button onClick={() => setViewStudents(null)} className="p-1 rounded-lg hover:bg-white/20">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {studentsLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                                </div>
                            ) : studentsList.length === 0 ? (
                                <div className="p-8 text-center text-gray-400 text-sm">Không có học viên nào</div>
                            ) : (
                                <div className="divide-y divide-gray-100">
                                    {studentsList.map((s: any) => (
                                        <div key={s.id} className="flex items-center gap-3 px-6 py-3 hover:bg-gray-50">
                                            <span className="text-xs font-bold font-mono text-purple-600 bg-purple-50 px-2 py-0.5 rounded shrink-0">
                                                #{s.id}
                                            </span>
                                            <span className="text-sm font-medium text-gray-700 truncate">
                                                {s.name || 'Chưa có tên'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="px-6 py-3 bg-slate-50 border-t shrink-0 flex items-center justify-between">
                            <span className="text-xs text-gray-500 font-medium">
                                {studentsList.length} học viên
                            </span>
                            <button
                                onClick={() => setViewStudents(null)}
                                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-lg transition-colors"
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

function CategoriesTab() {
    const [categories, setCategories] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showAdd, setShowAdd] = useState(false)
    const [editingId, setEditingId] = useState<number | null>(null)
    const [editName, setEditName] = useState('')
    const [editColor, setEditColor] = useState('#6366f1')
    const [editIcon, setEditIcon] = useState('')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const loadCategories = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/courses/categories').then(r => r.json())
            if (res.categories) setCategories(res.categories)
        } catch {}
        setLoading(false)
    }

    useEffect(() => { loadCategories() }, [])

    const resetForm = () => {
        setEditName('')
        setEditColor('#6366f1')
        setEditIcon('')
        setError('')
    }

    const handleAdd = async () => {
        if (!editName.trim()) { setError('Tên danh mục là bắt buộc'); return }
        setSaving(true); setError('')
        try {
            const res = await fetch('/api/courses/categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: editName.trim(), color: editColor, icon: editIcon || null })
            }).then(r => r.json())
            if (res.success) {
                await loadCategories()
                setShowAdd(false); resetForm()
            } else {
                setError(res.error || 'Có lỗi xảy ra')
            }
        } catch { setError('Lỗi kết nối') }
        setSaving(false)
    }

    const handleUpdate = async (id: number) => {
        if (!editName.trim()) { setError('Tên danh mục là bắt buộc'); return }
        setSaving(true); setError('')
        try {
            const res = await fetch('/api/courses/categories', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, name: editName.trim(), color: editColor, icon: editIcon || null })
            }).then(r => r.json())
            if (res.success) {
                await loadCategories()
                setEditingId(null); resetForm()
            } else {
                setError(res.error || 'Có lỗi xảy ra')
            }
        } catch { setError('Lỗi kết nối') }
        setSaving(false)
    }

    const handleDelete = async (id: number, name: string) => {
        if (!confirm(`Xóa danh mục "${name}"? Hành động này không thể hoàn tác.`)) return
        try {
            const res = await fetch('/api/courses/categories', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            }).then(r => r.json())
            if (res.success) {
                await loadCategories()
            } else {
                alert(res.error || 'Không thể xóa danh mục này')
            }
        } catch { alert('Lỗi kết nối') }
    }

    const startEdit = (cat: any) => {
        setEditingId(cat.id)
        setEditName(cat.name)
        setEditColor(cat.color || '#6366f1')
        setEditIcon(cat.icon || '')
        setError('')
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mt-4">
                <div>
                    <p className="text-gray-600 text-sm">Quản lý danh mục khóa học</p>
                </div>
                <button
                    onClick={() => { setShowAdd(true); resetForm() }}
                    className="bg-yellow-400 text-black p-2 rounded-xl inline-flex"
                >
                    <Plus className="w-4 h-4" />
                </button>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                    <Loader2 className="w-8 h-8 animate-spin text-purple-500 mx-auto mb-3" />
                    <p className="text-xs font-black uppercase tracking-wider">Đang tải...</p>
                </div>
            ) : categories.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                    <Tag className="w-10 h-10 mb-3" />
                    <p className="text-xs font-black uppercase tracking-wider">Chưa có danh mục nào</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {categories.map((cat) => (
                        <div key={cat.id} className="bg-white border border-gray-200 rounded-xl p-4">
                            {editingId === cat.id ? (
                                <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase text-gray-400">Tên</label>
                                            <input type="text" value={editName}
                                                onChange={e => setEditName(e.target.value)}
                                                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-sm font-bold outline-none" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase text-gray-400">Màu</label>
                                            <input type="color" value={editColor}
                                                onChange={e => setEditColor(e.target.value)}
                                                className="w-full h-10 bg-gray-50 border border-gray-100 rounded-xl px-2 cursor-pointer" />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-gray-400">Icon (emoji)</label>
                                        <input type="text" value={editIcon}
                                            onChange={e => setEditIcon(e.target.value)}
                                            className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-sm font-bold outline-none"
                                            placeholder="📚" />
                                    </div>
                                    {error && <p className="text-xs text-red-500 font-bold">{error}</p>}
                                    <div className="flex gap-2">
                                        <button onClick={() => handleUpdate(cat.id)} disabled={saving}
                                            className="flex-1 bg-black text-yellow-400 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50">
                                            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                            Lưu
                                        </button>
                                        <button onClick={() => { setEditingId(null); resetForm() }}
                                            className="px-4 py-2 bg-gray-100 text-gray-500 rounded-xl text-xs font-black uppercase hover:bg-gray-200">
                                            Hủy
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg" style={{ backgroundColor: cat.color || '#6366f1' }}>
                                        {cat.icon || <Tag className="w-4 h-4 text-white" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-bold text-sm text-gray-900">{cat.name}</div>
                                        <div className="text-[10px] text-gray-400 font-mono">{cat.slug}</div>
                                    </div>
                                    <div className="text-xs text-gray-500 font-bold bg-gray-100 px-2 py-1 rounded-lg">
                                        {cat._count?.courses || 0} khóa
                                    </div>
                                    <button onClick={() => startEdit(cat)}
                                        className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center hover:bg-gray-100">
                                        <Edit2 className="w-3.5 h-3.5 text-gray-500" />
                                    </button>
                                    <button onClick={() => handleDelete(cat.id, cat.name)}
                                        className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center hover:bg-red-100">
                                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {showAdd && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
                    onClick={() => { setShowAdd(false); resetForm() }}>
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4"
                        onClick={e => e.stopPropagation()}>
                        <h3 className="font-black text-gray-900 uppercase tracking-tight">Thêm danh mục mới</h3>
                        <div className="space-y-3">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-gray-400">Tên danh mục *</label>
                                <input type="text" value={editName}
                                    onChange={e => setEditName(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold outline-none"
                                    placeholder="VD: Khoá học cơ bản" autoFocus />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-gray-400">Màu sắc</label>
                                    <input type="color" value={editColor}
                                        onChange={e => setEditColor(e.target.value)}
                                        className="w-full h-10 bg-gray-50 border border-gray-100 rounded-xl px-2 cursor-pointer" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-gray-400">Icon</label>
                                    <input type="text" value={editIcon}
                                        onChange={e => setEditIcon(e.target.value)}
                                        className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold outline-none"
                                        placeholder="📚" />
                                </div>
                            </div>
                            {error && <p className="text-xs text-red-500 font-bold">{error}</p>}
                        </div>
                        <div className="flex gap-2">
                            <button onClick={handleAdd} disabled={saving || !editName.trim()}
                                className="flex-1 bg-black text-yellow-400 py-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50">
                                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                                Thêm danh mục
                            </button>
                            <button onClick={() => { setShowAdd(false); resetForm() }}
                                className="px-6 py-3 bg-gray-100 text-gray-500 rounded-xl text-xs font-black uppercase hover:bg-gray-200">
                                Hủy
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
