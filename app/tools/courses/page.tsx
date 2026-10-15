'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { getAdminCoursesAction, bulkToggleCourseStatusAction, bulkUpdateCoursesOptionsAction } from '@/app/actions/admin-actions'
import { getTeachersAction } from '@/app/actions/course-actions'
import { BookOpen, Users, Loader2, Plus, Eye, X, Search, Tag, Trash2, Save, Edit2 } from 'lucide-react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import CourseActionsMenu from '@/components/course/CourseActionsMenu'
import CourseExportButton from '@/components/course/CourseExportButton'
import ManagementWorkspace from '@/components/layout/ManagementWorkspace'
import MainHeader from '@/components/layout/MainHeader'
import type { ActivitySummary } from '@/components/course/CourseManagementActivity'

// Chỉ tải màn thống kê/học viên khi người dùng mở, giảm mã tải ban đầu.
const CourseDashboardModal = dynamic(() => import('@/components/course/CourseDashboardModal'), { ssr: false })
const AdminMemberRosterTab = dynamic(() => import('@/components/course/AdminMemberRosterTab'), { ssr: false })

export default function ToolsCoursesPage() {
    const [activeTab, setActiveTab] = useState<'courses' | 'categories'>('courses')

    return (
        <div className="min-h-screen bg-[#F7F9F5] text-[#24352A]">
            <MainHeader title="Quản lý khóa học" toolSlug="courses" />

            <ManagementWorkspace active="courses">
                <div><h1 className="text-2xl font-bold text-brk-primary">Quản lý khóa học</h1><p className="mt-2 text-sm text-[#617066]">Quản lý nội dung, học viên và hoạt động của từng khóa. Chọn mẫu Sales Page trong mục Trang bán khóa học.</p></div>

                <div className="mt-4 flex gap-2 rounded-2xl border border-[#E2E8DC] bg-white p-1.5 shadow-sm">
                    <button
                        onClick={() => setActiveTab('courses')}
                        className={`flex-1 rounded-xl px-3 py-3 text-xs font-semibold tracking-wide transition-colors ${activeTab === 'courses' ? 'bg-[#EAF3E7] text-[#206B25] shadow-sm ring-1 ring-[#CFE2CB]' : 'text-[#506153] hover:bg-[#F7F9F5] hover:text-[#206B25]'}`}
                    >
                        <BookOpen className="w-4 h-4 inline mr-2" /> Khóa học
                    </button>
                    <button
                        onClick={() => setActiveTab('categories')}
                        className={`flex-1 rounded-xl px-3 py-3 text-xs font-semibold tracking-wide transition-colors ${activeTab === 'categories' ? 'bg-[#EAF3E7] text-[#206B25] shadow-sm ring-1 ring-[#CFE2CB]' : 'text-[#506153] hover:bg-[#F7F9F5] hover:text-[#206B25]'}`}
                    >
                        <Tag className="w-4 h-4 inline mr-2" /> Danh mục
                    </button>
                </div>

                {activeTab === 'courses' ? <CoursesTab /> : <CategoriesTab />}
            </ManagementWorkspace>
        </div>
    )
}

function CoursesTab() {
    const [courses, setCourses] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState('')
    const courseRequest = useRef(0)
    const [filtersReady, setFiltersReady] = useState(false)
    const restoringFilters = useRef(false)
    const restoredActor = useRef<number | null>(null)
    const [isAdmin, setIsAdmin] = useState(false)
    const [visibilityScope, setVisibilityScope] = useState("shared")
    const [currentUserId, setCurrentUserId] = useState<number | null>(null)
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
    const [batchLoading, setBatchLoading] = useState(false)

    const [viewStudents, setViewStudents] = useState<{ courseId: number; courseName: string } | null>(null)

    const [search, setSearch] = useState('')
    const [filterStatus, setFilterStatus] = useState('ALL')
    const [filterCategory, setFilterCategory] = useState('ALL')
    const [filterProject, setFilterProject] = useState('ALL')
    const [projects, setProjects] = useState<{ slug: string; name: string; courseIds: number[] }[]>([])
    const [page, setPage] = useState(1)
    const [display, setDisplay] = useState<'list' | 'cards'>('list')
    const [activity, setActivity] = useState<ActivitySummary[]>([])
    const [activityError, setActivityError] = useState('')
    const [activityLoading, setActivityLoading] = useState(false)
    const [activityRevision, setActivityRevision] = useState(0)
    // ✅ Mặc định luôn xem khoá học CỦA CHÍNH MÌNH — kể cả ADMIN. Muốn xem toàn bộ
    // hoặc của GV khác thì chủ động đổi ở dropdown (chỉ ADMIN mới đổi được).
    const [filterTeacher, setFilterTeacher] = useState('SELF')
    const [teacherOptions, setTeacherOptions] = useState<{ id: number; name: string }[]>([])
    const [allCategories, setAllCategories] = useState<{ id: number; name: string }[]>([])

    const [showBulkOptions, setShowBulkOptions] = useState(false)
    const [bulkOptionsLoading, setBulkOptionsLoading] = useState(false)
    const [allVouchers, setAllVouchers] = useState<any[]>([])
    const defaultBulkOpts = {
        applyStatus: false, status: true,
        applyTemplate: false, useTemplate: false,
        applyCategory: false, categoryId: null as number | null,
        applyType: false, type: 'NORMAL',
        applyFeeType: false, feeType: 'MIEN_PHI',
        applyReferral: false, requiresReferralActivation: false,
        applyVouchers: false, acceptedVoucherIds: [] as number[],
    }
    const [bulkOpts, setBulkOpts] = useState(defaultBulkOpts)
    const [quickBulk, setQuickBulk] = useState({ status: '', categoryId: '', feeType: '' })

    // ✅ Tải danh sách khoá học theo đúng phạm vi đang chọn (server-side filter) —
    // thay vì tải hết rồi lọc ở client, giúp ADMIN mặc định chỉ tải khoá học của
    // chính mình, đỡ tốn băng thông/DB cho hệ thống nhiều khoá học.
    const fetchCourses = async (teacherFilter: string) => {
        const requestId = ++courseRequest.current
        setLoading(true); setLoadError(''); setCourses([]); setSelectedIds(new Set())
        const teacherId = teacherFilter === 'ALL' || teacherFilter === 'SELF' ? teacherFilter : parseInt(teacherFilter)
        try {
            const res = await getAdminCoursesAction({ teacherId })
            // Chỉ phản hồi của lựa chọn mới nhất được cập nhật danh sách.
            if (requestId !== courseRequest.current) return
            if (!res.success) throw new Error('Không tải được khóa học. Vui lòng thử lại hoặc đăng nhập lại.')
            setCourses(res.courses || [])
            setIsAdmin(res.isAdmin || false)
            setVisibilityScope(res.visibilityScope || "shared")
            setCurrentUserId(res.userId ?? null)
        } catch {
            if (requestId === courseRequest.current) setLoadError('Không tải được khóa học. Vui lòng thử lại hoặc đăng nhập lại.')
        } finally {
            if (requestId === courseRequest.current) setLoading(false)
        }
    }

    useEffect(() => {
        const requests = courseRequest
        void fetchCourses(filterTeacher)
        return () => { requests.current++ }
    }, [filterTeacher])

    useEffect(() => {
        fetch('/api/wi300/projects', { cache: 'no-store' }).then(async response => {
            if (response.ok) { const data = await response.json(); setProjects(data.projects || []) }
        }).catch(() => {})
        // ✅ Danh sách GV cho dropdown lọc — tải riêng, độc lập với phạm vi khoá học
        // đang xem, để ADMIN luôn chọn được bất kỳ GV nào (kể cả khi đang chỉ xem
        // khoá học của chính mình).
        getTeachersAction().then(res => {
            if (res.success) {
                setTeacherOptions((res.teachers || []).map((t: any) => ({ id: t.id, name: t.name || t.email || `#${t.id}` })))
            }
        })
        // ✅ Danh mục cho modal "Tùy chỉnh hàng loạt" — tải riêng từ API danh mục,
        // không phụ thuộc vào các khoá học đang được tải (có thể chỉ là tập con).
        fetch('/api/courses/categories').then(r => r.json()).then(data => {
            setAllCategories((data.categories || []).map((c: any) => ({ id: c.id, name: c.name })))
        }).catch(() => {})
    }, [])

    useEffect(() => {
        if (!showBulkOptions) return
        const controller = new AbortController()
        fetch('/api/vouchers', { signal: controller.signal }).then(r => r.json()).then(data => { if (!controller.signal.aborted) setAllVouchers(data.vouchers || []) }).catch(() => {})
        return () => controller.abort()
    }, [showBulkOptions])

    const categoryOptions = allCategories

    const handleToggleCourseStatus = async (courseId: number, currentStatus: boolean) => {
        const res = await bulkToggleCourseStatusAction([courseId], !currentStatus)
        if (res.success) {
            setCourses(prev => prev.map(c => c.id === courseId ? { ...c, status: !currentStatus } : c))
        } else {
            alert(res.error || 'Có lỗi xảy ra khi cập nhật trạng thái hiển thị')
        }
    }

    const categories = useMemo(() => {
        const cats = new Set(courses.map((c: any) => c.courseCategory?.name || c.category || 'Khác'))
        return Array.from(cats).sort()
    }, [courses])

    const filteredCourses = useMemo(() => {
        // ✅ Lọc theo GV đã do server thực hiện (fetchCourses) — ở đây chỉ còn lọc
        // theo tìm kiếm/trạng thái/danh mục trong tập đã tải.
        return courses.filter((course: any) => {
            if (search.trim()) {
                const q = search.toLowerCase()
                const match = (course.name_lop || '').toLowerCase().includes(q)
                    || (course.id_khoa || '').toLowerCase().includes(q)
                    || (course.name_khoa || '').toLowerCase().includes(q)
                    || (course.teacher?.name || '').toLowerCase().includes(q)
                if (!match) return false
            }
            if (filterStatus === 'ACTIVE' && !course.status) return false
            if (filterStatus === 'HIDDEN' && course.status) return false
            const catName = course.courseCategory?.name || course.category || 'Khác'
            if (filterCategory !== 'ALL' && catName !== filterCategory) return false
            if (filterProject !== 'ALL' && !projects.find(project => project.slug === filterProject)?.courseIds.includes(course.id)) return false
            return true
        })
    }, [courses, search, filterStatus, filterCategory, filterProject, projects])

    const totalPages = Math.max(1, Math.ceil(filteredCourses.length / 10))
    const currentPage = Math.min(page, totalPages)
    const visibleCourses = filteredCourses.slice((currentPage - 1) * 10, currentPage * 10)
    const activityIds = visibleCourses.map(course => course.id).join(',')
    // Nhớ bộ lọc theo tài khoản trong phiên; không lưu dữ liệu hoặc danh sách học viên.
    useEffect(() => {
        if (currentUserId == null || restoredActor.current === currentUserId) return
        restoredActor.current = currentUserId
        restoringFilters.current = true
        try {
            const saved = JSON.parse(window.sessionStorage.getItem('wi300-course-list:' + currentUserId) || 'null')
            if (saved && typeof saved === 'object') {
                if (typeof saved.search === 'string') setSearch(saved.search.slice(0, 200))
                if (['ALL', 'ACTIVE', 'HIDDEN'].includes(saved.status)) setFilterStatus(saved.status)
                if (typeof saved.category === 'string') setFilterCategory(saved.category)
                if (typeof saved.project === 'string') setFilterProject(saved.project)
                if (isAdmin && typeof saved.teacher === 'string' && /^(ALL|SELF|[0-9]+)$/.test(saved.teacher)) setFilterTeacher(saved.teacher)
                if (Number.isSafeInteger(saved.page) && saved.page > 0) setPage(saved.page)
                if (['list', 'cards'].includes(saved.display)) setDisplay(saved.display)
            }
        } catch {}
        setFiltersReady(true)
    }, [currentUserId, isAdmin])
    useEffect(() => {
        if (!filtersReady) return
        if (restoringFilters.current) { restoringFilters.current = false; return }
        setPage(1); setSelectedIds(new Set())
    }, [search, filterStatus, filterCategory, filterProject, filterTeacher, filtersReady])
    useEffect(() => {
        if (!filtersReady || currentUserId == null) return
        try { window.sessionStorage.setItem('wi300-course-list:' + currentUserId, JSON.stringify({ search, status: filterStatus, category: filterCategory, project: filterProject, teacher: filterTeacher, page, display })) } catch {}
    }, [filtersReady, currentUserId, search, filterStatus, filterCategory, filterProject, filterTeacher, page, display])
    useEffect(() => {
        const controller = new AbortController()
        setActivity([]); setActivityError('')
        if (!activityIds) { setActivityLoading(false); return }
        setActivityLoading(true)
        fetch(`/api/courses/management-activity?ids=${activityIds}`, { signal: controller.signal, cache: 'no-store' }).then(async response => {
            const data = await response.json()
            if (!response.ok) throw new Error(data.error || 'Không tải được hoạt động.')
            if (!controller.signal.aborted) setActivity(data.summary || [])
        }).catch(error => { if (!controller.signal.aborted) setActivityError(error.message) }).finally(() => { if (!controller.signal.aborted) setActivityLoading(false) })
        return () => controller.abort()
    }, [activityIds, activityRevision])

    const toggleSelect = (id: number) => {
        setSelectedIds(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const toggleSelectAll = () => {
        if (filteredCourses.length > 0 && filteredCourses.every(course => selectedIds.has(course.id))) {
            setSelectedIds(new Set())
        } else {
            setSelectedIds(new Set(filteredCourses.map(c => c.id)))
        }
    }

    // Các lựa chọn áp dụng trong một yêu cầu; không tự thay mức tiền học phí.
    const handleQuickBulk = async () => {
        const opts: { status?: boolean; categoryId?: number | null; feeType?: string } = {}
        if (quickBulk.status) opts.status = quickBulk.status === 'show'
        if (quickBulk.categoryId) opts.categoryId = quickBulk.categoryId === 'none' ? null : Number(quickBulk.categoryId)
        if (quickBulk.feeType) opts.feeType = quickBulk.feeType
        if (!Object.keys(opts).length || !selectedIds.size) return
        if (!confirm(`Áp dụng thay đổi cho ${selectedIds.size} khóa học đã chọn?`)) return
        setBatchLoading(true)
        try {
            const res = await bulkUpdateCoursesOptionsAction([...selectedIds], opts)
            if (!res.success) throw new Error(res.error || 'Không áp dụng được thay đổi')
            setQuickBulk({ status: '', categoryId: '', feeType: '' })
            await fetchCourses(filterTeacher)
        } catch (error) { alert(error instanceof Error ? error.message : 'Có lỗi xảy ra') }
        finally { setBatchLoading(false) }
    }

    const handleViewStudents = (courseId: number, courseName: string) => {
        setViewStudents({ courseId, courseName })
    }

    const handleBulkOptionsApply = async () => {
        const opts: any = {}
        let hasChange = false
        if (bulkOpts.applyStatus) { opts.status = bulkOpts.status; hasChange = true }
        if (bulkOpts.applyTemplate) { opts.useTemplate = bulkOpts.useTemplate; hasChange = true }
        if (bulkOpts.applyCategory) { opts.categoryId = bulkOpts.categoryId; hasChange = true }
        if (bulkOpts.applyType) { opts.type = bulkOpts.type; hasChange = true }
        if (bulkOpts.applyFeeType) { opts.feeType = bulkOpts.feeType; hasChange = true }
        if (bulkOpts.applyReferral) { opts.requiresReferralActivation = bulkOpts.requiresReferralActivation; hasChange = true }
        if (bulkOpts.applyVouchers) { opts.acceptedVoucherIds = bulkOpts.acceptedVoucherIds; hasChange = true }

        if (!hasChange) { alert('Vui lòng chọn ít nhất một tùy chỉnh để áp dụng'); return }
        if (!confirm(`Xác nhận áp dụng tùy chỉnh cho ${selectedIds.size} khóa học?`)) return

        setBulkOptionsLoading(true)
        try {
            const res = await bulkUpdateCoursesOptionsAction(Array.from(selectedIds), opts)
            if (res.success) {
                await fetchCourses(filterTeacher)
                setShowBulkOptions(false)
                setBulkOpts({...defaultBulkOpts})
                setSelectedIds(new Set())
            } else {
                alert(res.error || 'Có lỗi xảy ra')
            }
        } catch {
            alert('Có lỗi xảy ra')
        } finally {
            setBulkOptionsLoading(false)
        }
    }

    return (
        <>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-gray-500">Nội dung và dữ liệu học viên trong một nơi.</p>
                <div className="flex flex-wrap gap-2"><CourseExportButton courseIds={selectedIds.size ? [...selectedIds] : filteredCourses.map(course => course.id)} label={selectedIds.size ? 'Xuất học viên khóa đã chọn' : 'Xuất học viên các khóa đang lọc'} /><Link data-help-id="link-new-course" href="/tools/courses/new" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brk-primary px-4 text-sm font-semibold text-white"><Plus size={17} />Tạo khóa học</Link></div>
            </div>
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                {[{ label: 'Tổng số khóa học', value: courses.length, icon: BookOpen, note: 'Trong phạm vi giảng viên đã chọn' }, { label: 'Lượt học viên đã kích hoạt', value: courses.reduce((sum, course) => sum + (course._count?.enrollments || 0), 0), icon: Users, note: 'Một học viên có thể được tính ở nhiều khóa' }, { label: 'Khóa học đang hiển thị', value: courses.filter(course => course.status).length, icon: Eye, note: 'Các khóa đang được công khai' }, { label: 'Yêu cầu hỗ trợ', value: activity.reduce((sum, item) => sum + item.requests, 0), icon: BookOpen, note: 'Yêu cầu cần trả lời của các khóa ở trang này' }].map(stat => { const Icon = stat.icon; return <div key={stat.label} className="flex items-start gap-3 rounded-xl border border-brk-outline bg-white p-4"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brk-background text-brk-primary"><Icon size={21} /></span><div className="min-w-0"><p className="text-xs text-gray-600">{stat.label}</p><strong className="mt-1 block text-2xl text-brk-primary">{loading || (stat.label === 'Yêu cầu hỗ trợ' && activityLoading) ? '…' : stat.label === 'Yêu cầu hỗ trợ' && activityError ? '—' : stat.value}</strong><p className="mt-1 text-[11px] leading-4 text-gray-500">{stat.note}</p></div></div> })}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(240px,2fr)_repeat(4,minmax(120px,1fr))]">
                <div className="relative self-end"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input aria-label="Tìm khóa học hoặc giảng viên" type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Tìm kiếm khóa học, giảng viên…" className="min-h-11 w-full rounded-xl border border-brk-outline bg-white pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-brk-primary/20" /></div>
                <label className="space-y-1 text-xs text-gray-600">Giảng viên<select aria-label="Lọc giảng viên" disabled={!isAdmin} value={isAdmin ? filterTeacher : 'SELF'} onChange={event => setFilterTeacher(event.target.value)} className="block min-h-11 w-full rounded-xl border border-brk-outline bg-white px-3 text-sm disabled:bg-gray-50"><option value="SELF">Khóa học của tôi</option>{isAdmin && <option value="ALL">Tất cả</option>}{isAdmin && teacherOptions.filter(teacher => teacher.id !== currentUserId).map(teacher => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}</select></label>
                <label className="space-y-1 text-xs text-gray-600">Danh mục<select aria-label="Lọc danh mục" value={filterCategory} onChange={event => setFilterCategory(event.target.value)} className="block min-h-11 w-full rounded-xl border border-brk-outline bg-white px-3 text-sm"><option value="ALL">Tất cả</option>{categories.map(category => <option key={category} value={category}>{category}</option>)}</select></label>
                <label className="space-y-1 text-xs text-gray-600">Dự án<select aria-label="Lọc theo dự án" value={filterProject} onChange={event => setFilterProject(event.target.value)} className="block min-h-11 w-full rounded-xl border border-brk-outline bg-white px-3 text-sm"><option value="ALL">Tất cả</option>{projects.map(project => <option key={project.slug} value={project.slug}>{project.name}</option>)}</select></label>
                <label className="space-y-1 text-xs text-gray-600">Hiển thị<select aria-label="Lọc hiển thị" value={filterStatus} onChange={event => setFilterStatus(event.target.value)} className="block min-h-11 w-full rounded-xl border border-brk-outline bg-white px-3 text-sm"><option value="ALL">Tất cả</option><option value="ACTIVE">Đang hiển thị</option><option value="HIDDEN">Đang ẩn</option></select></label>
            </div>
            {(search || filterStatus !== 'ALL' || filterCategory !== 'ALL' || filterProject !== 'ALL' || (isAdmin && filterTeacher !== 'SELF')) && <button type="button" onClick={() => { setSearch(''); setFilterStatus('ALL'); setFilterCategory('ALL'); setFilterProject('ALL'); if (isAdmin) setFilterTeacher('SELF') }} className="min-h-10 text-sm text-brk-primary">Xóa bộ lọc</button>}

            {selectedIds.size > 0 && (
                <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm">
                    <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-bold text-gray-700"><input type="checkbox" aria-label="Bỏ chọn khóa học đã chọn" checked disabled={batchLoading || bulkOptionsLoading} onChange={() => setSelectedIds(new Set())} className="h-4 w-4 accent-green-700" />Đã chọn {selectedIds.size} khóa học</label>
                    <div className="ml-auto flex w-full flex-wrap items-end gap-2 sm:w-auto">
                        <label className="text-xs text-gray-600">Ẩn/Hiện<select aria-label="Ẩn hoặc hiện khóa đã chọn" value={quickBulk.status} disabled={batchLoading || bulkOptionsLoading} onChange={event => setQuickBulk(prev => ({ ...prev, status: event.target.value }))} className="mt-1 block min-h-11 rounded-lg border px-3 text-sm"><option value="">Giữ nguyên</option><option value="hide">Ẩn</option><option value="show">Hiện</option></select></label>
                        <label className="text-xs text-gray-600">Danh mục<select aria-label="Danh mục khóa đã chọn" value={quickBulk.categoryId} disabled={batchLoading || bulkOptionsLoading} onChange={event => setQuickBulk(prev => ({ ...prev, categoryId: event.target.value }))} className="mt-1 block min-h-11 max-w-full rounded-lg border px-3 text-sm"><option value="">Giữ nguyên</option><option value="none">Không có danh mục</option>{categoryOptions.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
                        <label className="text-xs text-gray-600">Miễn phí/Có phí<select aria-label="Học phí khóa đã chọn" value={quickBulk.feeType} disabled={batchLoading || bulkOptionsLoading} onChange={event => setQuickBulk(prev => ({ ...prev, feeType: event.target.value }))} className="mt-1 block min-h-11 rounded-lg border px-3 text-sm"><option value="">Giữ nguyên</option><option value="MIEN_PHI">Miễn phí</option><optgroup label="Có phí"><option value="PHI_TUY_TINH">Có phí · Tùy tâm</option><option value="PHI_CAM_KET">Có phí · Cam kết</option><option value="PHI_DONG_HANH">Có phí · Đồng hành</option><option value="PHI_TOI_THIEU">Có phí · Tối thiểu</option></optgroup></select></label>
                        <button type="button" onClick={() => void handleQuickBulk()} disabled={batchLoading || bulkOptionsLoading || !Object.values(quickBulk).some(Boolean)} className="min-h-11 rounded-lg bg-brk-primary px-4 text-sm font-semibold text-white disabled:opacity-50">{batchLoading ? 'Đang áp dụng…' : 'Áp dụng'}</button>
                        <button type="button" disabled={batchLoading || bulkOptionsLoading} onClick={() => { setBulkOpts({ ...defaultBulkOpts }); setShowBulkOptions(true) }} className="min-h-11 px-2 text-xs font-semibold text-gray-600">Nâng cao</button>
                    </div>
                </div>
            )}

            {selectedIds.size === 0 && filteredCourses.length > 0 && (
                <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            aria-label="Chọn tất cả khóa học"
                            checked={filteredCourses.length > 0 && filteredCourses.every(course => selectedIds.has(course.id))}
                            onChange={toggleSelectAll}
                            className="rounded border-gray-300 accent-yellow-500 cursor-pointer"
                        />
                        <span className="text-xs font-bold text-gray-400">Chọn tất cả</span>
                    </label>
                    <span className="text-xs text-gray-300 ml-auto">{filteredCourses.length} / {courses.length} khóa học</span>
                </div>
            )}

            {loadError && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><p>{loadError}</p><button type="button" disabled={loading} onClick={() => void fetchCourses(filterTeacher)} className="min-h-11 rounded-lg border border-red-200 bg-white px-4 font-semibold disabled:opacity-50">Tải lại khóa học</button></div>}
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
                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500"><p>Yêu cầu cần trả lời và hoạt động chưa xem được đếm riêng.</p><button type="button" disabled={activityLoading} onClick={() => setActivityRevision(value => value + 1)} className="min-h-11 rounded-xl border border-brk-outline bg-white px-3 text-brk-primary disabled:opacity-50">Tải lại hoạt động</button></div>
                    {activityError && <p role="alert" className="text-sm text-red-700">{activityError} · Bấm Tải lại hoạt động để thử lại.</p>}
                    <div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold text-gray-600">Danh sách khóa học</p><div className="flex rounded-xl border border-brk-outline bg-white p-1">{(['list', 'cards'] as const).map(mode => <button key={mode} type="button" aria-pressed={display === mode} onClick={() => setDisplay(mode)} className={`min-h-10 rounded-lg px-3 text-sm ${display === mode ? 'bg-brk-background font-semibold text-brk-primary' : 'text-gray-500'}`}>{mode === 'list' ? 'Danh sách' : 'Thẻ'}</button>)}</div></div>
                    <div className={display === 'list' ? 'overflow-x-auto rounded-2xl border border-brk-outline bg-white' : 'rounded-2xl'}>
                        <div className={display === 'list' ? 'min-w-[1100px]' : ''}>
                        {display === 'list' && <div className="grid grid-cols-[24px_minmax(240px,2fr)_130px_minmax(100px,1fr)_100px_80px_minmax(140px,1.2fr)_120px] items-center gap-3 bg-brk-background px-4 py-3 text-xs font-semibold text-brk-on-surface"><span /><span>Khóa học / Giảng viên</span><span>Danh mục</span><span>Dự án</span><span>Hiển thị</span><span>Học viên</span><span>Hoạt động</span><span>Thao tác</span></div>}
                        <div className={display === 'cards' ? 'grid gap-4 sm:grid-cols-2 xl:grid-cols-3' : 'divide-y divide-brk-outline'}>
                        {visibleCourses.map(course => {
                            const summary = activity.find(item => item.courseId === course.id)
                            const names = projects.filter(project => project.courseIds.includes(course.id)).map(project => project.name)
                            return <article key={course.id} className={`gap-3 p-4 ${display === 'list' ? 'grid grid-cols-[24px_minmax(240px,2fr)_130px_minmax(100px,1fr)_100px_80px_minmax(140px,1.2fr)_120px] items-center' : 'grid rounded-2xl border border-brk-outline bg-white'} ${selectedIds.has(course.id) ? 'bg-brk-background ring-2 ring-inset ring-brk-primary' : ''}`}>
                                <input type="checkbox" aria-label={`Chọn ${course.name_lop}`} checked={selectedIds.has(course.id)} onChange={() => toggleSelect(course.id)} className="h-4 w-4 accent-green-700" />
                                <div className="flex min-w-0 items-center gap-3">{course.link_anh_bia ? <img src={course.link_anh_bia} alt="" loading="lazy" decoding="async" width={80} height={64} className="h-16 w-20 shrink-0 rounded-lg object-cover" /> : <div className="flex h-16 w-20 shrink-0 items-center justify-center rounded-lg bg-brk-background text-brk-primary"><BookOpen size={24} /></div>}<div className="min-w-0"><Link href={`/tools/courses/new?id=${course.id}`} className="break-words text-sm font-bold text-brk-primary">{course.name_lop}</Link><p className="mt-1 text-xs text-gray-500">{course.id_khoa}</p><p className="mt-1 text-xs text-gray-500">{course.teacher?.name || course.teacher?.email || 'Chưa phân công'} · {course._count?.lessons || 0} bài</p></div></div>
                                <p className="break-words text-xs font-medium text-brk-primary">{course.courseCategory?.name || course.category || 'Khác'}</p>
                                <p className="break-words text-xs text-gray-600">{names.join(', ') || 'Chưa liên kết'}</p>
                                <span className={`w-fit rounded-full px-2 py-1 text-xs ${course.status ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{course.status ? 'Hiển thị' : 'Đang ẩn'}</span>
                                <button type="button" onClick={() => handleViewStudents(course.id, course.name_lop)} className="min-h-11 text-left text-sm font-semibold text-brk-primary">{course._count?.enrollments || 0} →</button>
                                <div className="text-xs">{activityLoading ? <p role="status">Đang tải…</p> : summary ? <Link href={`/tools/courses/new?id=${course.id}&tab=activity`} className="block min-h-11 space-y-1 text-brk-primary"><p><strong>{summary.requests}</strong> yêu cầu cần trả lời</p><p><strong>{summary.submissions + summary.comments}</strong> hoạt động chưa xem</p></Link> : <p className="text-gray-500">Chưa tải được</p>}</div>
                                <div className="flex items-center gap-2"><Link href={`/tools/courses/new?id=${course.id}`} className="inline-flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-xl bg-brk-primary px-3 text-xs font-semibold text-white">Quản lý</Link><CourseActionsMenu id={course.id} slug={course.id_khoa} name={course.name_lop} status={course.status} admin={isAdmin} busy={batchLoading} onToggle={() => void handleToggleCourseStatus(course.id, course.status)} /></div>
                            </article>
                        })}
                        </div></div>
                    </div>
                    <div className="rounded-xl bg-brk-background p-4 text-sm text-gray-600">Trang bán khóa học có thư viện mẫu riêng. Mở <strong>Quản lý → Trang bán khóa học</strong> để chọn mẫu cho đúng khóa.</div>
                    <div className="flex flex-wrap items-center justify-between gap-3 text-sm"><p>{filteredCourses.length} khóa học · Trang {currentPage}/{totalPages}</p><div className="flex gap-2"><button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} className="min-h-11 rounded-xl border bg-white px-4 disabled:opacity-40">Trước</button><button type="button" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)} className="min-h-11 rounded-xl border bg-white px-4 disabled:opacity-40">Sau</button></div></div>
                </div>
            )}

            {viewStudents && (
                <CourseDashboardModal
                    courseId={viewStudents.courseId}
                    courseName={viewStudents.courseName}
                    onClose={() => setViewStudents(null)}
                    renderMembersTab={(ctx) => (
                        <AdminMemberRosterTab
                            courseId={ctx.courseId}
                            courseName={ctx.courseName}
                            members={ctx.members}
                            labels={ctx.labels}
                            reload={ctx.reload}
                        />
                    )}
                />
            )}

            {showBulkOptions && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
                    onClick={() => setShowBulkOptions(false)}>
                    <div className="bg-white w-full max-w-lg max-h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
                        onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-gray-800 to-gray-900 text-white shrink-0">
                            <div>
                                <h2 className="font-black text-sm uppercase tracking-wider">Tùy chỉnh hàng loạt</h2>
                                <p className="text-[10px] text-gray-300 mt-0.5">Áp dụng cho {selectedIds.size} khóa học đã chọn</p>
                            </div>
                            <button onClick={() => setShowBulkOptions(false)} className="p-1 rounded-lg hover:bg-white/20">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-5 space-y-3">
                            {/* 1. Trạng thái hiển thị */}
                            <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${bulkOpts.applyStatus ? 'bg-yellow-50 border-yellow-300' : 'bg-gray-50 border-gray-100'}`}>
                                <input type="checkbox" checked={bulkOpts.applyStatus} onChange={() => setBulkOpts(p => ({ ...p, applyStatus: !p.applyStatus }))} className="rounded accent-yellow-500 shrink-0 cursor-pointer" />
                                <span className="text-xs font-black text-gray-700 uppercase flex-1">Trạng thái</span>
                                <button type="button" disabled={!bulkOpts.applyStatus}
                                    onClick={() => setBulkOpts(p => ({ ...p, status: !p.status }))}
                                    className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-200 ${bulkOpts.applyStatus ? (bulkOpts.status ? 'bg-green-600' : 'bg-gray-300') : 'bg-gray-200 opacity-40'}`}>
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 mt-0.5 ${bulkOpts.status ? 'translate-x-4' : 'translate-x-0.5'}`} />
                                </button>
                                <span className={`text-[10px] font-bold w-8 text-right ${bulkOpts.applyStatus ? (bulkOpts.status ? 'text-green-600' : 'text-gray-400') : 'text-gray-300'}`}>
                                    {bulkOpts.status ? 'Hiện' : 'Ẩn'}
                                </span>
                            </div>

                            {/* 2. Template động */}
                            <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${bulkOpts.applyTemplate ? 'bg-yellow-50 border-yellow-300' : 'bg-gray-50 border-gray-100'}`}>
                                <input type="checkbox" checked={bulkOpts.applyTemplate} onChange={() => setBulkOpts(p => ({ ...p, applyTemplate: !p.applyTemplate }))} className="rounded accent-yellow-500 shrink-0 cursor-pointer" />
                                <span className="text-xs font-black text-gray-700 uppercase flex-1">Template động</span>
                                <button type="button" disabled={!bulkOpts.applyTemplate}
                                    onClick={() => setBulkOpts(p => ({ ...p, useTemplate: !p.useTemplate }))}
                                    className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-200 ${bulkOpts.applyTemplate ? (bulkOpts.useTemplate ? 'bg-purple-600' : 'bg-gray-300') : 'bg-gray-200 opacity-40'}`}>
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 mt-0.5 ${bulkOpts.useTemplate ? 'translate-x-4' : 'translate-x-0.5'}`} />
                                </button>
                                <span className={`text-[10px] font-bold w-8 text-right ${bulkOpts.applyTemplate ? (bulkOpts.useTemplate ? 'text-purple-600' : 'text-gray-400') : 'text-gray-300'}`}>
                                    {bulkOpts.useTemplate ? 'Bật' : 'Tắt'}
                                </span>
                            </div>

                            {/* 3. Yêu cầu kích hoạt referral */}
                            <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${bulkOpts.applyReferral ? 'bg-yellow-50 border-yellow-300' : 'bg-gray-50 border-gray-100'}`}>
                                <input type="checkbox" checked={bulkOpts.applyReferral} onChange={() => setBulkOpts(p => ({ ...p, applyReferral: !p.applyReferral }))} className="rounded accent-yellow-500 shrink-0 cursor-pointer" />
                                <span className="text-xs font-black text-gray-700 uppercase flex-1">Kích hoạt Referral</span>
                                <button type="button" disabled={!bulkOpts.applyReferral}
                                    onClick={() => setBulkOpts(p => ({ ...p, requiresReferralActivation: !p.requiresReferralActivation }))}
                                    className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-200 ${bulkOpts.applyReferral ? (bulkOpts.requiresReferralActivation ? 'bg-orange-600' : 'bg-gray-300') : 'bg-gray-200 opacity-40'}`}>
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 mt-0.5 ${bulkOpts.requiresReferralActivation ? 'translate-x-4' : 'translate-x-0.5'}`} />
                                </button>
                                <span className={`text-[10px] font-bold w-8 text-right ${bulkOpts.applyReferral ? (bulkOpts.requiresReferralActivation ? 'text-orange-600' : 'text-gray-400') : 'text-gray-300'}`}>
                                    {bulkOpts.requiresReferralActivation ? 'Bật' : 'Tắt'}
                                </span>
                            </div>

                            {/* 4. Danh mục */}
                            <div className={`p-3 rounded-xl border transition-all ${bulkOpts.applyCategory ? 'bg-yellow-50 border-yellow-300' : 'bg-gray-50 border-gray-100'}`}>
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input type="checkbox" checked={bulkOpts.applyCategory} onChange={() => setBulkOpts(p => ({ ...p, applyCategory: !p.applyCategory }))} className="rounded accent-yellow-500 shrink-0 cursor-pointer" />
                                    <span className="text-xs font-black text-gray-700 uppercase">Danh mục</span>
                                </label>
                                <select disabled={!bulkOpts.applyCategory}
                                    value={bulkOpts.categoryId ?? ''}
                                    onChange={e => setBulkOpts(p => ({ ...p, categoryId: e.target.value ? parseInt(e.target.value) : null }))}
                                    className="w-full mt-2 bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold outline-none disabled:opacity-40 disabled:cursor-not-allowed">
                                    <option value="">Không có (Khác)</option>
                                    {categoryOptions.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                                </select>
                            </div>

                            {/* 5. Loại khóa học */}
                            <div className={`p-3 rounded-xl border transition-all ${bulkOpts.applyType ? 'bg-yellow-50 border-yellow-300' : 'bg-gray-50 border-gray-100'}`}>
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input type="checkbox" checked={bulkOpts.applyType} onChange={() => setBulkOpts(p => ({ ...p, applyType: !p.applyType }))} className="rounded accent-yellow-500 shrink-0 cursor-pointer" />
                                    <span className="text-xs font-black text-gray-700 uppercase">Loại khóa học</span>
                                </label>
                                <select disabled={!bulkOpts.applyType}
                                    value={bulkOpts.type}
                                    onChange={e => setBulkOpts(p => ({ ...p, type: e.target.value }))}
                                    className="w-full mt-2 bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold outline-none disabled:opacity-40 disabled:cursor-not-allowed">
                                    <option value="NORMAL">Thường</option>
                                    <option value="CHALLENGE">Thử thách</option>
                                    <option value="LIB">Thư viện</option>
                                    <option value="SYS">Hệ thống</option>
                                </select>
                            </div>

                            {/* 6. Loại học phí */}
                            <div className={`p-3 rounded-xl border transition-all ${bulkOpts.applyFeeType ? 'bg-yellow-50 border-yellow-300' : 'bg-gray-50 border-gray-100'}`}>
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input type="checkbox" checked={bulkOpts.applyFeeType} onChange={() => setBulkOpts(p => ({ ...p, applyFeeType: !p.applyFeeType }))} className="rounded accent-yellow-500 shrink-0 cursor-pointer" />
                                    <span className="text-xs font-black text-gray-700 uppercase">Loại học phí</span>
                                </label>
                                <select disabled={!bulkOpts.applyFeeType}
                                    value={bulkOpts.feeType}
                                    onChange={e => setBulkOpts(p => ({ ...p, feeType: e.target.value }))}
                                    className="w-full mt-2 bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold outline-none disabled:opacity-40 disabled:cursor-not-allowed">
                                    <option value="MIEN_PHI">Miễn phí</option>
                                    <option value="PHI_TUY_TINH">Phí tùy tâm</option>
                                    <option value="PHI_CAM_KET">Phí cam kết</option>
                                    <option value="PHI_DONG_HANH">Phí đồng hành</option>
                                    <option value="PHI_TOI_THIEU">Phí tối thiểu</option>
                                </select>
                            </div>

                            {/* 7. Áp dụng Voucher — toggle cho từng voucher */}
                            <div className={`p-3 rounded-xl border transition-all ${bulkOpts.applyVouchers ? 'bg-yellow-50 border-yellow-300' : 'bg-gray-50 border-gray-100'}`}>
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input type="checkbox" checked={bulkOpts.applyVouchers} onChange={() => setBulkOpts(p => ({ ...p, applyVouchers: !p.applyVouchers }))} className="rounded accent-yellow-500 shrink-0 cursor-pointer" />
                                    <span className="text-xs font-black text-gray-700 uppercase">Áp dụng Voucher</span>
                                </label>
                                {allVouchers.length > 0 ? (
                                    <div className="mt-2 space-y-1.5">
                                        {allVouchers.map((v: any) => {
                                            const isOn = bulkOpts.acceptedVoucherIds.includes(v.id)
                                            return (
                                                <div key={v.id} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all ${bulkOpts.applyVouchers ? 'bg-white border border-gray-200' : 'bg-gray-100/50 border border-transparent opacity-40'}`}>
                                                    <button type="button" disabled={!bulkOpts.applyVouchers}
                                                        onClick={() => setBulkOpts(p => ({
                                                            ...p,
                                                            acceptedVoucherIds: isOn
                                                                ? p.acceptedVoucherIds.filter(id => id !== v.id)
                                                                : [...p.acceptedVoucherIds, v.id]
                                                        }))}
                                                        className={`relative inline-flex h-4 w-7 shrink-0 rounded-full transition-colors duration-200 ${bulkOpts.applyVouchers ? (isOn ? 'bg-blue-600' : 'bg-gray-300') : 'bg-gray-200'}`}>
                                                        <span className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition duration-200 mt-0.5 ${isOn ? 'translate-x-3' : 'translate-x-0.5'}`} />
                                                    </button>
                                                    <span className={`text-xs font-bold flex-1 ${bulkOpts.applyVouchers ? 'text-gray-700' : 'text-gray-400'}`}>{v.name}</span>
                                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${v.type === 'VIP' ? 'bg-amber-100 text-amber-700' : v.type === 'CASH' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{v.type}</span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                ) : (
                                    <p className="mt-2 text-[10px] text-gray-400 font-medium">Không có voucher nào trong hệ thống</p>
                                )}
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-gray-50 border-t shrink-0 flex items-center gap-3">
                            <button onClick={handleBulkOptionsApply} disabled={bulkOptionsLoading}
                                className="flex-1 bg-black text-yellow-400 py-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-zinc-800 transition-colors">
                                {bulkOptionsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Áp dụng
                            </button>
                            <button onClick={() => setShowBulkOptions(false)}
                                className="px-6 py-3 bg-gray-200 text-gray-600 rounded-xl text-xs font-black uppercase hover:bg-gray-300 transition-colors">
                                Hủy
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
