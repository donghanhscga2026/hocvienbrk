'use client'

import type { ReactNode } from 'react'
import { Users, TrendingUp, BookOpen } from 'lucide-react'
import { RosterMember } from './MemberRosterPanel'

type Lesson = { id: string; order: number; title: string }

function StatCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
    return (
        <div className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl p-4">
            <div className="w-10 h-10 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
                {icon}
            </div>
            <div className="min-w-0">
                <div className="text-xl font-black text-gray-800 truncate">{value}</div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider truncate">{label}</div>
            </div>
        </div>
    )
}

export default function CourseStatsTab({ members, lessons }: { members: RosterMember[]; lessons: Lesson[] }) {
    const totalMembers = members.length

    const percents = members.map(m => m.completionPercent).filter((p): p is number => p !== null)
    const avgPercent = percents.length > 0 ? Math.round(percents.reduce((a, b) => a + b, 0) / percents.length) : null

    const dayStats = lessons.map(l => {
        let onTime = 0, late = 0, missing = 0
        members.forEach(m => {
            const d = m.days.find(x => x.order === l.order)
            if (d?.status === 'onTime') onTime++
            else if (d?.status === 'late') late++
            else missing++
        })
        return { order: l.order, title: l.title, onTime, late, missing }
    })

    return (
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <StatCard icon={<Users className="w-5 h-5" />} label="Tổng học viên" value={String(totalMembers)} />
                <StatCard icon={<TrendingUp className="w-5 h-5" />} label="% đúng hạn trung bình" value={avgPercent === null ? '—' : `${avgPercent}%`} />
                <StatCard icon={<BookOpen className="w-5 h-5" />} label="Số ngày bài học" value={String(lessons.length)} />
            </div>

            <div>
                <div className="text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Tình hình nộp bài theo từng ngày</div>
                {dayStats.length === 0 ? (
                    <div className="text-sm text-gray-400 py-6 text-center">Khóa học chưa có bài học nào</div>
                ) : (
                    <div className="space-y-2.5">
                        {dayStats.map(d => {
                            const total = Math.max(1, totalMembers)
                            const onTimePct = (d.onTime / total) * 100
                            const latePct = (d.late / total) * 100
                            const missingPct = (d.missing / total) * 100
                            return (
                                <div key={d.order} className="bg-white border border-gray-100 rounded-xl p-3">
                                    <div className="flex items-center justify-between gap-2 mb-1.5">
                                        <span className="text-xs font-bold text-gray-700 truncate">Ngày {d.order} — {d.title}</span>
                                        <span className="text-[10px] font-bold text-gray-400 shrink-0">{d.onTime + d.late}/{totalMembers} đã nộp</span>
                                    </div>
                                    <div className="flex w-full h-3 rounded-full overflow-hidden bg-gray-100">
                                        {onTimePct > 0 && <div className="bg-emerald-500" style={{ width: `${onTimePct}%` }} />}
                                        {latePct > 0 && <div className="bg-purple-500" style={{ width: `${latePct}%` }} />}
                                        {missingPct > 0 && <div className="bg-red-300" style={{ width: `${missingPct}%` }} />}
                                    </div>
                                    <div className="flex items-center gap-3 mt-1.5 text-[10px] font-bold text-gray-500">
                                        <span className="text-emerald-600">Đúng hạn: {d.onTime}</span>
                                        <span className="text-purple-600">Muộn: {d.late}</span>
                                        <span className="text-red-500">Chưa nộp: {d.missing}</span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
