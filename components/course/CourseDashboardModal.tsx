'use client'

import { useEffect, useState } from 'react'
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

export default function CourseDashboardModal({ courseId, courseName, onClose }: {
    courseId: number
    courseName: string
    onClose: () => void
}) {
    const [tab, setTab] = useState<Tab>('overview')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [members, setMembers] = useState<RosterMember[]>([])
    const [labels, setLabels] = useState<CourseMemberLabels>({})
    const [lessons, setLessons] = useState<Lesson[]>([])
    const [canViewPhone, setCanViewPhone] = useState(false)

    useEffect(() => {
        let cancelled = false
        setLoading(true)
        getCourseMemberRosterAction(courseId).then(res => {
            if (cancelled) return
            if (res.success) {
                setMembers((res.members as any[]) || [])
                setLabels((res.labels as CourseMemberLabels) || {})
                setLessons((res.lessons as any[]) || [])
                setCanViewPhone(!!res.canViewPhone)
            } else {
                setError(res.error || 'Có lỗi xảy ra khi tải dữ liệu khóa học')
            }
            setLoading(false)
        })
        return () => { cancelled = true }
    }, [courseId])

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
                                onClick={() => setTab(t.key)}
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
                ) : tab === 'overview' ? (
                    <CourseStatsTab members={members} lessons={lessons} />
                ) : tab === 'members' ? (
                    <MemberRosterPanel members={members} labels={labels} canViewPhone={canViewPhone} courseName={courseName} dayOrders={dayOrders} />
                ) : (
                    <CourseActivityFeedTab courseId={courseId} />
                )}
            </div>
        </div>
    )
}
