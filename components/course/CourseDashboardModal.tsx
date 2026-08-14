'use client'

import { ReactNode, useCallback, useEffect, useState } from 'react'
import { Loader2, X, LayoutDashboard, Users, Rss } from 'lucide-react'
import { getCourseMemberRosterAction } from '@/app/actions/admin-actions'
import MemberRosterPanel, { RosterMember, CourseMemberLabels } from './MemberRosterPanel'
import CourseStatsTab from './CourseStatsTab'
import CourseActivityFeedTab from './CourseActivityFeedTab'

type Lesson = { id: string; order: number; title: string }
type Tab = 'overview' | 'members' | 'feed'

const TABS: { key: Tab; label: string; icon: typeof LayoutDashboard }[] = [
    { key: 'overview', label: 'Tổng quan', icon: LayoutDashboard },
    { key: 'members', label: 'Thành viên', icon: Users },
    { key: 'feed', label: 'Nhật ký hoạt động', icon: Rss },
]

export type MembersTabContext = {
    courseId: number
    courseName: string
    members: RosterMember[]
    labels: CourseMemberLabels
    canViewPhone: boolean
    dayOrders: number[]
    reload: () => void
}

/**
 * Khung Dashboard dùng chung cho mọi nơi cần mở "xem thành viên + thống kê"
 * của 1 khóa học (trang khóa học công khai, trang quản trị...). Tab "Thành
 * viên" mặc định là bảng đọc-only (MemberRosterPanel); nơi gọi cần thêm
 * quyền chỉnh sửa (như trang quản trị) truyền `renderMembersTab` để thay
 * bằng nội dung riêng, dùng chung đúng 1 lần fetch roster + khung modal.
 */
export default function CourseDashboardModal({ courseId, courseName, onClose, renderMembersTab }: {
    courseId: number
    courseName: string
    onClose: () => void
    renderMembersTab?: (ctx: MembersTabContext) => ReactNode
}) {
    const [tab, setTab] = useState<Tab>('overview')
    const [visitedTabs, setVisitedTabs] = useState<Set<Tab>>(new Set(['overview']))
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [members, setMembers] = useState<RosterMember[]>([])
    const [labels, setLabels] = useState<CourseMemberLabels>({})
    const [lessons, setLessons] = useState<Lesson[]>([])
    const [canViewPhone, setCanViewPhone] = useState(false)

    const load = useCallback(() => {
        setLoading(true)
        return getCourseMemberRosterAction(courseId).then(res => {
            if (res.success) {
                setMembers((res.members as any[]) || [])
                setLabels((res.labels as CourseMemberLabels) || {})
                setLessons((res.lessons as any[]) || [])
                setCanViewPhone(!!res.canViewPhone)
                setError(null)
            } else {
                setError(res.error || 'Có lỗi xảy ra khi tải dữ liệu khóa học')
            }
            setLoading(false)
        })
    }, [courseId])

    useEffect(() => { load() }, [load])

    // Giữ nguyên các tab đã mở trong DOM (chỉ ẩn/hiện bằng display) thay vì
    // unmount khi chuyển tab — tránh mất trạng thái đang chỉnh dở (ví dụ chế
    // độ SS + các thay đổi Team/Group chưa lưu ở tab Thành viên).
    const selectTab = (t: Tab) => {
        setTab(t)
        setVisitedTabs(prev => (prev.has(t) ? prev : new Set(prev).add(t)))
    }

    const dayOrders = lessons.map(l => l.order)

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-white w-[95vw] h-[88vh] max-w-[1600px] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-violet-600 to-purple-600 text-white shrink-0">
                    <h2 className="font-bold text-sm flex items-center gap-2">
                        <LayoutDashboard className="w-4 h-4" /> Dashboard khóa học — {courseName}
                    </h2>
                    <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/20">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex items-center gap-1 px-4 pt-3 shrink-0 border-b border-gray-100 bg-white">
                    {TABS.map(t => {
                        const Icon = t.icon
                        return (
                            <button
                                key={t.key}
                                type="button"
                                onClick={() => selectTab(t.key)}
                                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-t-lg transition-colors ${tab === t.key ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                <Icon className="w-3.5 h-3.5" />
                                {t.label}
                            </button>
                        )
                    })}
                </div>

                {loading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
                    </div>
                ) : error ? (
                    <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">{error}</div>
                ) : (
                    <>
                        {visitedTabs.has('overview') && (
                            <div style={{ display: tab === 'overview' ? 'flex' : 'none' }} className="flex-1 flex-col min-h-0">
                                <CourseStatsTab members={members} lessons={lessons} />
                            </div>
                        )}
                        {visitedTabs.has('members') && (
                            <div style={{ display: tab === 'members' ? 'flex' : 'none' }} className="flex-1 flex-col min-h-0">
                                {renderMembersTab
                                    ? renderMembersTab({ courseId, courseName, members, labels, canViewPhone, dayOrders, reload: load })
                                    : <MemberRosterPanel members={members} labels={labels} canViewPhone={canViewPhone} courseName={courseName} dayOrders={dayOrders} />}
                            </div>
                        )}
                        {visitedTabs.has('feed') && (
                            <div style={{ display: tab === 'feed' ? 'flex' : 'none' }} className="flex-1 flex-col min-h-0">
                                <CourseActivityFeedTab courseId={courseId} />
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}
