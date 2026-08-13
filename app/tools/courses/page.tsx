'use client'

import { useState, useEffect, useMemo } from 'react'
import { getAdminCoursesAction, bulkToggleCourseStatusAction, bulkUpdateCoursesOptionsAction, getCourseMembersAction, getCourseMemberRosterAction, updateCourseMemberAssignmentsAction, updateCourseMemberLabelAction, exportCourseMembersAction } from '@/app/actions/admin-actions'
import { BookOpen, Users, DollarSign, Settings, Loader2, Plus, Minus, Eye, EyeOff, CheckSquare, X, Search, Tag, Trash2, Save, Edit2, Palette, AlertTriangle, FileSpreadsheet, ImageDown } from 'lucide-react'
import Link from 'next/link'
import MainHeader from '@/components/layout/MainHeader'
import { getCoursePages, updateCoursePage, createCoursePage } from '@/app/actions/course-page-actions'
import MemberDayChips, { DayStatus } from '@/components/course/MemberDayChips'
import MemberDetailPanel from '@/components/course/MemberDetailPanel'
import { downloadRosterAsImage } from '@/lib/course/export-roster-image'

const RECENT_DAYS = 7

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

const TEAM_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
type CourseMemberLabels = { teams?: Record<string, string>; groups?: Record<string, string> }

function teamLabel(team: number, labels?: CourseMemberLabels) {
    const custom = labels?.teams?.[String(team)]
    if (custom) return custom
    return team >= 1 && team <= 26 ? `Team ${TEAM_LETTERS[team - 1]}` : `Team ${team}`
}

function groupLabel(team: number, group: number, labels?: CourseMemberLabels) {
    return labels?.groups?.[`${team}:${group}`] || `Group ${group}`
}

function localPhone(phone: string | null | undefined) {
    if (!phone) return null
    return phone.startsWith('+84') ? '0' + phone.slice(3) : phone
}

type CardDisplayToggles = { role: boolean; code: boolean; phone: boolean }

function MemberCard({ member, dirty, effective, onChange, ssMode, phone, days, completionPercent, display, onSelect }: {
    member: any
    dirty: boolean
    effective: { memberRole: 'TV' | 'PS'; team: number; group: number }
    onChange: (patch: Partial<{ memberRole: 'TV' | 'PS'; team: number; group: number }>) => void
    ssMode: boolean
    phone?: string | null
    days?: { order: number; status: DayStatus }[]
    completionPercent?: number | null
    display: CardDisplayToggles
    onSelect: () => void
}) {
    const isPS = effective.memberRole === 'PS'
    return (
        <div className={`rounded-xl border p-2 space-y-1 transition-all ${dirty ? 'border-yellow-400 ring-2 ring-yellow-200 bg-yellow-50' : 'border-gray-100 bg-white hover:border-gray-200'}`}>
            {/* Dòng 1: TV | Mã | SĐT | T | G (Team/Group chỉ hiện khi bật chế độ SS) */}
            <div className="flex items-center gap-0.5 flex-wrap">
                {display.role && (
                    <button
                        type="button"
                        onClick={() => onChange({ memberRole: isPS ? 'TV' : 'PS' })}
                        className={`px-1 py-0.5 rounded text-[9px] font-black shrink-0 transition-colors ${isPS ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-500'}`}
                        title={isPS ? 'Phụng sự — bấm để đổi thành Thành viên' : 'Thành viên — bấm để đổi thành Phụng sự'}
                    >
                        {effective.memberRole}
                    </button>
                )}
                {display.code && (
                    <span className="text-[10px] font-bold font-mono text-purple-600 bg-purple-50 px-1 py-0.5 rounded shrink-0">
                        #{member.user.id}
                    </span>
                )}
                {display.phone && phone && (
                    <span className="text-[9px] font-mono text-gray-500 shrink-0">{localPhone(phone)}</span>
                )}
                {ssMode && (
                    <div className="flex items-center bg-gray-50 border border-gray-200 rounded overflow-hidden shrink-0">
                        <button type="button" onClick={() => onChange({ team: Math.max(1, effective.team - 1) })}
                            className="w-3 h-4 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100">
                            <Minus className="w-2 h-2" />
                        </button>
                        <span className="text-[8px] font-black text-gray-600 px-0.5 min-w-[14px] text-center">T{effective.team}</span>
                        <button type="button" onClick={() => onChange({ team: effective.team + 1 })}
                            className="w-3 h-4 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100">
                            <Plus className="w-2 h-2" />
                        </button>
                    </div>
                )}
                {ssMode && !isPS && (
                    <div className="flex items-center bg-gray-50 border border-gray-200 rounded overflow-hidden shrink-0">
                        <button type="button" onClick={() => onChange({ group: Math.max(1, effective.group - 1) })}
                            className="w-3 h-4 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100">
                            <Minus className="w-2 h-2" />
                        </button>
                        <span className="text-[8px] font-black text-gray-600 px-0.5 min-w-[14px] text-center">G{effective.group}</span>
                        <button type="button" onClick={() => onChange({ group: effective.group + 1 })}
                            className="w-3 h-4 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100">
                            <Plus className="w-2 h-2" />
                        </button>
                    </div>
                )}
            </div>
            {/* Dòng 2: Họ tên + % hoàn thành — bấm để xem chi tiết đủ số ngày */}
            <button
                type="button"
                onClick={onSelect}
                className="w-full flex items-center justify-between gap-1 text-left hover:underline decoration-dashed underline-offset-2"
                title="Xem chi tiết toàn bộ tiến độ"
            >
                <span className="text-xs font-bold text-gray-700 truncate" title={member.user.name || 'Chưa có tên'}>
                    {member.user.name || 'Chưa có tên'}
                </span>
                <span className="text-[10px] font-black text-violet-600 shrink-0">
                    {completionPercent == null ? '—' : `${completionPercent}%`}
                </span>
            </button>
            {/* Dòng 3: Kết quả nộp bài 7 ngày gần nhất */}
            {days && days.length > 0 && <MemberDayChips days={days.slice(-RECENT_DAYS)} />}
        </div>
    )
}

function ToggleCheckbox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
    return (
        <label className="flex items-center gap-1 cursor-pointer select-none shrink-0">
            <input
                type="checkbox"
                checked={checked}
                onChange={e => onChange(e.target.checked)}
                className="rounded border-gray-300 accent-violet-600 cursor-pointer w-3.5 h-3.5"
            />
            <span className="text-[10px] font-bold text-gray-500">{label}</span>
        </label>
    )
}

function EditableLabel({ value, onSave, className, inputClassName }: {
    value: string
    onSave: (name: string) => void
    className?: string
    inputClassName?: string
}) {
    const [editing, setEditing] = useState(false)
    const [draft, setDraft] = useState(value)

    if (editing) {
        return (
            <input
                autoFocus
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onFocus={e => e.currentTarget.select()}
                onBlur={() => {
                    setEditing(false)
                    const trimmed = draft.trim()
                    if (trimmed && trimmed !== value) onSave(trimmed)
                    else setDraft(value)
                }}
                onKeyDown={e => {
                    if (e.key === 'Enter') e.currentTarget.blur()
                    if (e.key === 'Escape') { setDraft(value); setEditing(false) }
                }}
                className={inputClassName || 'bg-white border border-violet-300 rounded px-1 py-0.5 text-xs font-black text-violet-700 outline-none'}
                style={{ width: `${Math.max(draft.length + 1, 5)}ch` }}
            />
        )
    }
    return (
        <button
            type="button"
            onClick={() => { setDraft(value); setEditing(true) }}
            className={className || 'hover:underline decoration-dashed underline-offset-2'}
            title="Bấm để đổi tên"
        >
            {value}
        </button>
    )
}

function CoursesTab() {
    const [courses, setCourses] = useState<any[]>([])
    const [coursePages, setCoursePages] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [isAdmin, setIsAdmin] = useState(false)
    const [currentUserId, setCurrentUserId] = useState<number | null>(null)
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
    const [batchLoading, setBatchLoading] = useState(false)

    const [viewStudents, setViewStudents] = useState<{ courseId: number; courseName: string } | null>(null)
    const [members, setMembers] = useState<any[]>([])
    const [memberLabels, setMemberLabels] = useState<CourseMemberLabels>({})
    const [roster, setRoster] = useState<Record<number, { phone: string | null; days: { order: number; status: DayStatus }[]; completionPercent: number | null }>>({})
    const [dayOrders, setDayOrders] = useState<number[]>([])
    const [selectedMember, setSelectedMember] = useState<any | null>(null)
    const [studentsLoading, setStudentsLoading] = useState(false)
    const [exportingStudents, setExportingStudents] = useState(false)
    const [exportingImage, setExportingImage] = useState(false)
    const [editedMembers, setEditedMembers] = useState<Record<number, { memberRole: 'TV' | 'PS'; team: number; group: number }>>({})
    const [savingAssignments, setSavingAssignments] = useState(false)
    const [ssMode, setSsMode] = useState(false)
    const [cardDisplay, setCardDisplay] = useState<CardDisplayToggles>({ role: true, code: true, phone: true })

    const [search, setSearch] = useState('')
    const [filterStatus, setFilterStatus] = useState('ACTIVE')
    const [filterCategory, setFilterCategory] = useState('ALL')
    const [filterTeacher, setFilterTeacher] = useState('ALL')

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
            const pages = await getCoursePages()
            setCoursePages(pages)
            setLoading(false)
        }
        fetchCourses()
    }, [])

    useEffect(() => {
        fetch('/api/vouchers').then(r => r.json()).then(data => setAllVouchers(data.vouchers || [])).catch(() => {})
    }, [])

    const categoryOptions = useMemo(() => {
        const map = new Map<number, string>()
        courses.forEach((c: any) => {
            if (c.courseCategory) map.set(c.courseCategory.id, c.courseCategory.name)
        })
        return Array.from(map.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name))
    }, [courses])

    const handleToggleTemplate = async (slug: string, page: any, currentVal: boolean) => {
        if (page) {
            const res = await updateCoursePage(page.id, { useTemplate: !currentVal })
            if (res.success) {
                setCoursePages(prev => prev.map(p => p.id === page.id ? { ...p, useTemplate: !currentVal } : p))
            } else {
                alert(res.error || 'Có lỗi xảy ra khi cập nhật cấu hình')
            }
        } else {
            const res = await createCoursePage({
                slug,
                name: slug,
                useTemplate: true
            })
            if (res.success && res.page) {
                setCoursePages(prev => [...prev, res.page])
            } else {
                alert(res.error || 'Có lỗi xảy ra khi khởi tạo cấu hình')
            }
        }
    }

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

    const hasCustomAssignment = useMemo(() => {
        return members.some((m: any) => m.memberRole === 'PS' || m.team !== 1 || m.group !== 1)
    }, [members])

    const groupedByTeam = useMemo(() => {
        const map = new Map<number, { ps: any[]; groups: Map<number, any[]> }>()
        members.forEach((m: any) => {
            if (!map.has(m.team)) map.set(m.team, { ps: [], groups: new Map() })
            const bucket = map.get(m.team)!
            if (m.memberRole === 'PS') {
                bucket.ps.push(m)
            } else {
                if (!bucket.groups.has(m.group)) bucket.groups.set(m.group, [])
                bucket.groups.get(m.group)!.push(m)
            }
        })
        return Array.from(map.entries())
            .sort((a, b) => a[0] - b[0])
            .map(([team, bucket]) => ({
                team,
                ps: bucket.ps,
                groups: Array.from(bucket.groups.entries()).sort((a, b) => a[0] - b[0])
            }))
    }, [members])

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

    const loadMembers = async (courseId: number) => {
        setStudentsLoading(true)
        try {
            const [res, rosterRes] = await Promise.all([
                getCourseMembersAction(courseId),
                getCourseMemberRosterAction(courseId),
            ])
            if (res.success) {
                setMembers(res.members || [])
                setMemberLabels((res.labels as CourseMemberLabels) || {})
            } else {
                alert(res.error || 'Có lỗi xảy ra khi tải danh sách thành viên')
            }
            if (rosterRes.success) {
                const map: Record<number, { phone: string | null; days: { order: number; status: DayStatus }[]; completionPercent: number | null }> = {}
                for (const m of (rosterRes.members as any[]) || []) {
                    map[m.id] = { phone: m.user?.phone ?? null, days: m.days || [], completionPercent: m.completionPercent ?? null }
                }
                setRoster(map)
                setDayOrders(((rosterRes.lessons as any[]) || []).map(l => l.order))
            } else {
                setRoster({})
                setDayOrders([])
            }
        } catch {}
        setStudentsLoading(false)
    }

    const handleViewStudents = async (courseId: number, courseName: string) => {
        setViewStudents({ courseId, courseName })
        setMembers([])
        setMemberLabels({})
        setRoster({})
        setDayOrders([])
        setEditedMembers({})
        setSsMode(false)
        setSelectedMember(null)
        await loadMembers(courseId)
    }

    const handleExportImage = () => {
        if (!viewStudents || members.length === 0) return
        setExportingImage(true)
        try {
            const sorted = [...members].sort((a, b) => {
                if (a.team !== b.team) return a.team - b.team
                if (a.memberRole !== b.memberRole) return a.memberRole === 'PS' ? -1 : 1
                if (a.group !== b.group) return a.group - b.group
                return a.id - b.id
            })
            const rows = sorted.map((m, idx) => ({
                stt: idx + 1,
                name: m.user.name || '',
                code: m.user.id,
                teamText: teamLabel(m.team, memberLabels),
                groupText: m.memberRole === 'PS' ? '—' : groupLabel(m.team, m.group, memberLabels),
                isPS: m.memberRole === 'PS',
                days: roster[m.id]?.days || [],
            }))
            downloadRosterAsImage(viewStudents.courseName, rows, dayOrders)
        } finally {
            setExportingImage(false)
        }
    }

    const handleSaveLabel = async (kind: 'team' | 'group', team: number, group: number | null, name: string) => {
        if (!viewStudents) return
        const prevLabels = memberLabels
        setMemberLabels(prev => {
            const next: CourseMemberLabels = { teams: { ...prev.teams }, groups: { ...prev.groups } }
            if (kind === 'team') next.teams![String(team)] = name
            else next.groups![`${team}:${group}`] = name
            return next
        })
        const res = await updateCourseMemberLabelAction(viewStudents.courseId, kind, team, group, name)
        if (!res.success) {
            setMemberLabels(prevLabels)
            alert(res.error || 'Có lỗi xảy ra khi đổi tên')
        }
    }

    const handleMemberChange = (enrollmentId: number, base: { memberRole: 'TV' | 'PS'; team: number; group: number }, patch: Partial<{ memberRole: 'TV' | 'PS'; team: number; group: number }>) => {
        setEditedMembers(prev => {
            const current = prev[enrollmentId] ?? base
            const next = { ...current, ...patch }
            const rest = { ...prev }
            if (next.memberRole === base.memberRole && next.team === base.team && next.group === base.group) {
                delete rest[enrollmentId]
            } else {
                rest[enrollmentId] = next
            }
            return rest
        })
    }

    const handleSaveAssignments = async () => {
        if (!viewStudents) return
        const updates = Object.entries(editedMembers).map(([enrollmentId, v]) => ({ enrollmentId: Number(enrollmentId), ...v }))
        if (updates.length === 0) return
        setSavingAssignments(true)
        try {
            const res = await updateCourseMemberAssignmentsAction(viewStudents.courseId, updates)
            if (res.success) {
                setEditedMembers({})
                await loadMembers(viewStudents.courseId)
            } else {
                alert(res.error || 'Có lỗi xảy ra khi cập nhật')
            }
        } catch {
            alert('Có lỗi xảy ra khi cập nhật')
        }
        setSavingAssignments(false)
    }

    const handleExportStudents = async () => {
        if (!viewStudents) return
        setExportingStudents(true)
        try {
            const res = await exportCourseMembersAction(viewStudents.courseId, viewStudents.courseName)
            if (res.success && res.sheetUrl) {
                window.open(res.sheetUrl, '_blank')
            } else if (res.success && res.csvContent) {
                const blob = new Blob([res.csvContent], { type: 'text/csv;charset=utf-8;' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `${res.fileName || 'thanh-vien'}.csv`
                a.click()
                URL.revokeObjectURL(url)
                alert('Không tạo được Google Sheet, đã tải file CSV thay thế.')
            } else {
                alert(res.error || 'Lỗi xuất danh sách')
            }
        } catch {
            alert('Lỗi xuất danh sách')
        }
        setExportingStudents(false)
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
                const refreshed = await getAdminCoursesAction()
                if (refreshed.success) setCourses(refreshed.courses || [])
                const pages = await getCoursePages()
                setCoursePages(pages)
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
                            onClick={() => { setBulkOpts({...defaultBulkOpts}); setShowBulkOptions(true) }}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-gray-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-gray-800 transition-colors"
                        >
                            <Settings className="w-3 h-3" />
                            Tùy chỉnh
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
                                            <div className="mb-2.5">
                                                <Link
                                                    href={`/khoa-hoc/${course.id_khoa || course.id}`}
                                                    className="font-black text-orange-600 text-sm leading-tight break-words hover:text-orange-700 hover:underline underline-offset-2"
                                                    title={course.name_lop}
                                                >
                                                    {course.name_lop}
                                                </Link>
                                            </div>

                                            <div className="flex items-center gap-3 text-[10px] text-gray-500 font-bold flex-wrap pb-2.5 border-b border-gray-100">
                                                <div className="flex items-center gap-1">
                                                    <DollarSign className="w-3 h-3 text-green-500" />
                                                    {course.phi_coc.toLocaleString()}đ
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <BookOpen className="w-3 h-3 text-blue-400" />
                                                    {course._count?.lessons} bài
                                                </div>
                                                <button
                                                    onClick={() => handleViewStudents(course.id, course.name_lop)}
                                                    className="flex items-center gap-1 hover:text-purple-600 transition-colors"
                                                    title="Xem thành viên đã đăng ký"
                                                >
                                                    <Users className="w-3 h-3 text-purple-500" />
                                                    {course._count?.enrollments} TV
                                                </button>
                                                {course.teacher && (
                                                    <span className="text-[10px] text-gray-400 font-medium ml-auto">
                                                        GV: {course.teacher.name || course.teacher.email}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center justify-between gap-2 pt-2.5 flex-wrap">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    {/* Nút bật/tắt Publish (Hiển thị) */}
                                                    <div className="flex items-center gap-1 bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded-lg">
                                                        <span className="text-[9px] font-black text-gray-500">Đăng:</span>
                                                        <button
                                                            onClick={() => handleToggleCourseStatus(course.id, course.status)}
                                                            className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                                                course.status ? 'bg-green-600' : 'bg-gray-300'
                                                            }`}
                                                            title={course.status ? "Đang hiển thị" : "Đang ẩn"}
                                                        >
                                                            <span
                                                                className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                                                    course.status ? 'translate-x-3' : 'translate-x-0'
                                                                }`}
                                                            />
                                                        </button>
                                                    </div>

                                                    {/* Nút bật/tắt Template Động */}
                                                    {(() => {
                                                        const page = coursePages.find((p) => p.slug === course.id_khoa)
                                                        const isTemplateApplied = page ? page.useTemplate !== false : false
                                                        return (
                                                            <div className="flex items-center gap-1 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-lg">
                                                                <span className="text-[9px] font-black text-purple-700">Mẫu:</span>
                                                                <button
                                                                    onClick={() => handleToggleTemplate(course.id_khoa, page, isTemplateApplied)}
                                                                    className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                                                        isTemplateApplied ? 'bg-purple-700' : 'bg-gray-300'
                                                                    }`}
                                                                    title={isTemplateApplied ? "Đang áp dụng template động" : "Đang dùng giao diện gốc"}
                                                                >
                                                                    <span
                                                                        className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                                                            isTemplateApplied ? 'translate-x-3' : 'translate-x-0'
                                                                        }`}
                                                                    />
                                                                </button>
                                                                {isTemplateApplied && page && (
                                                                    <Link
                                                                        href={`/tools/courses/${page.id}/edit`}
                                                                        className="inline-flex items-center justify-center w-5 h-5 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-full transition-all ml-1"
                                                                        title="Thiết lập giao diện Template"
                                                                    >
                                                                        <Palette className="w-3 h-3" />
                                                                    </Link>
                                                                )}
                                                            </div>
                                                        )
                                                    })()}
                                                </div>

                                                <div className="flex items-center gap-2 ml-auto">
                                                    <Link
                                                        href={`/tools/courses/${course.id}`}
                                                        className="inline-flex items-center justify-center gap-1 px-3 py-1 bg-black text-yellow-400 rounded-lg hover:bg-zinc-800 active:scale-95 transition-all text-xs font-black shadow-sm"
                                                        title="Sửa cấu hình khóa học"
                                                    >
                                                        <Settings className="w-3.5 h-3.5" />
                                                        <span>Sửa</span>
                                                    </Link>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {viewStudents && (() => {
                const pendingCount = Object.keys(editedMembers).length
                const cardGridClass = "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2"
                const renderCard = (m: any) => {
                    const base = { memberRole: m.memberRole, team: m.team, group: m.group }
                    const effective = editedMembers[m.id] ?? base
                    return (
                        <MemberCard
                            key={m.id}
                            member={m}
                            effective={effective}
                            dirty={!!editedMembers[m.id]}
                            onChange={(patch) => handleMemberChange(m.id, base, patch)}
                            ssMode={ssMode}
                            phone={roster[m.id]?.phone}
                            days={roster[m.id]?.days}
                            completionPercent={roster[m.id]?.completionPercent}
                            display={cardDisplay}
                            onSelect={() => setSelectedMember(m)}
                        />
                    )
                }
                return (
                <>
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
                    onClick={() => setViewStudents(null)}
                >
                    <div
                        className="bg-white w-[95vw] h-[85vh] max-w-[1600px] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-violet-600 to-purple-600 text-white shrink-0">
                            <h2 className="font-bold text-sm">Thành viên — {viewStudents!.courseName}</h2>
                            <button onClick={() => setViewStudents(null)} className="p-1 rounded-lg hover:bg-white/20">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {studentsLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                                </div>
                            ) : members.length === 0 ? (
                                <div className="p-8 text-center text-gray-400 text-sm">Không có thành viên nào</div>
                            ) : !hasCustomAssignment ? (
                                <div className={`${cardGridClass} p-4`}>
                                    {members.map(renderCard)}
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-100">
                                    {groupedByTeam.map(({ team, ps, groups }) => (
                                        <div key={team}>
                                            <div className="bg-violet-50 border-y border-violet-100 px-4 py-2 flex items-center gap-2 flex-wrap">
                                                <EditableLabel
                                                    value={teamLabel(team, memberLabels)}
                                                    onSave={(name) => handleSaveLabel('team', team, null, name)}
                                                    className="text-xs font-black text-violet-700 shrink-0 hover:underline decoration-dashed underline-offset-2"
                                                />
                                                {ps.length > 0 ? (
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <span className="text-[10px] font-bold text-violet-500 shrink-0">Phụng sự:</span>
                                                        {ps.map(renderCard)}
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] text-amber-600 font-bold flex items-center gap-1">
                                                        <AlertTriangle className="w-3 h-3" /> Chưa có phụng sự
                                                    </span>
                                                )}
                                            </div>
                                            {groups.map(([groupNum, groupMembers]) => (
                                                <div key={groupNum} className="px-4 py-3">
                                                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-wider px-1 pb-1.5 flex items-center gap-1.5">
                                                        <EditableLabel
                                                            value={groupLabel(team, groupNum, memberLabels)}
                                                            onSave={(name) => handleSaveLabel('group', team, groupNum, name)}
                                                            className="hover:underline decoration-dashed underline-offset-2"
                                                        />
                                                        {groupMembers.length < 3 && (
                                                            <span className="text-amber-600 font-bold normal-case flex items-center gap-0.5">
                                                                <AlertTriangle className="w-3 h-3" /> {groupMembers.length}/3
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className={cardGridClass}>
                                                        {groupMembers.map(renderCard)}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="px-6 py-3 bg-slate-50 border-t shrink-0 flex items-center justify-between gap-3 flex-wrap">
                            <div className="flex items-center gap-3 flex-wrap">
                                <span className="text-xs text-gray-500 font-medium shrink-0">
                                    {members.length} thành viên{pendingCount > 0 ? ` — ${pendingCount} đang chỉnh chưa lưu` : ''}
                                </span>
                                <label className="flex items-center gap-1.5 cursor-pointer select-none shrink-0">
                                    <input
                                        type="checkbox"
                                        checked={ssMode}
                                        onChange={e => setSsMode(e.target.checked)}
                                        className="rounded border-gray-300 accent-yellow-500 cursor-pointer"
                                    />
                                    <span className="text-xs font-bold text-gray-500" title="Sắp xếp Team / Group">SS</span>
                                </label>
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider shrink-0 ml-2">Hiển thị:</span>
                                <ToggleCheckbox checked={cardDisplay.role} onChange={v => setCardDisplay(d => ({ ...d, role: v }))} label="Vai trò" />
                                <ToggleCheckbox checked={cardDisplay.code} onChange={v => setCardDisplay(d => ({ ...d, code: v }))} label="Mã" />
                                <ToggleCheckbox checked={cardDisplay.phone} onChange={v => setCardDisplay(d => ({ ...d, phone: v }))} label="SĐT" />
                            </div>

                            <div className="flex items-center gap-2 ml-auto">
                                {ssMode && (
                                    <button
                                        onClick={handleSaveAssignments}
                                        disabled={savingAssignments || pendingCount === 0}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-black text-xs font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {savingAssignments ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                        Cập nhật{pendingCount > 0 ? ` (${pendingCount})` : ''}
                                    </button>
                                )}
                                <button
                                    onClick={handleExportImage}
                                    disabled={exportingImage || members.length === 0}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Xuất bảng tổng hợp nộp bài ra file ảnh PNG"
                                >
                                    {exportingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageDown className="w-3.5 h-3.5" />}
                                    Xuất ảnh
                                </button>
                                <button
                                    onClick={handleExportStudents}
                                    disabled={exportingStudents || members.length === 0}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {exportingStudents ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
                                    Xuất Google Sheet
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {selectedMember && (
                    <MemberDetailPanel
                        member={{
                            name: selectedMember.user.name,
                            code: selectedMember.user.id,
                            memberRole: (editedMembers[selectedMember.id]?.memberRole ?? selectedMember.memberRole),
                            teamText: teamLabel(editedMembers[selectedMember.id]?.team ?? selectedMember.team, memberLabels),
                            groupText: groupLabel(
                                editedMembers[selectedMember.id]?.team ?? selectedMember.team,
                                editedMembers[selectedMember.id]?.group ?? selectedMember.group,
                                memberLabels
                            ),
                            phone: roster[selectedMember.id]?.phone,
                            completionPercent: roster[selectedMember.id]?.completionPercent ?? null,
                            days: roster[selectedMember.id]?.days || [],
                        }}
                        onClose={() => setSelectedMember(null)}
                    />
                )}
                </>
                )
            })()}

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
