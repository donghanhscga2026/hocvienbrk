'use client'

import { useState, type ReactNode } from 'react'
import { Users, TrendingUp, BookOpen, ChevronDown, UserX } from 'lucide-react'
import { RosterMember, CourseMemberLabels, teamLabel, groupLabel, localPhone } from './MemberRosterPanel'

type Lesson = { id: string; order: number; title: string }

// Nhóm mang tên đúng chuỗi này bị loại khỏi mọi tính toán tỷ lệ hoàn thành
// (thành viên tạm dừng học có lý do riêng, không tính là "chưa hoàn thành").
const EXCLUDED_GROUP_NAME = 'Tạm dừng/có lý do'

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

function average(values: number[]): number | null {
    return values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null
}

export default function CourseStatsTab({ members, lessons, labels }: {
    members: RosterMember[]
    lessons: Lesson[]
    labels: CourseMemberLabels
}) {
    const [expandedDay, setExpandedDay] = useState<number | null>(null)
    const totalMembers = members.length

    const teamsWithPS = new Set(members.filter(m => m.memberRole === 'PS').map(m => m.team))

    // Thành viên KHÔNG được tính vào tỷ lệ hoàn thành (theo Team lẫn cả lớp)
    // nếu: (a) thuộc 1 Team chưa có Phụng sự, hoặc (b) thuộc Group tên đúng
    // "Tạm dừng/có lý do".
    const isCounted = (m: RosterMember) => {
        if (!teamsWithPS.has(m.team)) return false
        if (m.memberRole === 'PS') return true
        return groupLabel(m.team, m.group, labels) !== EXCLUDED_GROUP_NAME
    }

    const countedMembers = members.filter(isCounted)
    const avgPercent = average(countedMembers.map(m => m.completionPercent).filter((p): p is number => p !== null))

    const teamStats = (() => {
        const map = new Map<number, RosterMember[]>()
        members.forEach(m => {
            if (!map.has(m.team)) map.set(m.team, [])
            map.get(m.team)!.push(m)
        })
        return Array.from(map.entries())
            .sort((a, b) => a[0] - b[0])
            .map(([team, teamMembers]) => {
                const hasPS = teamsWithPS.has(team)
                const counted = teamMembers.filter(isCounted)
                const percent = hasPS
                    ? average(counted.map(m => m.completionPercent).filter((p): p is number => p !== null))
                    : null
                return { team, memberCount: teamMembers.length, countedCount: counted.length, hasPS, percent }
            })
    })()

    const dayStats = lessons.map(l => {
        let onTime = 0, late = 0
        const missingMembers: RosterMember[] = []
        members.forEach(m => {
            const d = m.days.find(x => x.order === l.order)
            if (d?.status === 'onTime') onTime++
            else if (d?.status === 'late') late++
            else missingMembers.push(m)
        })
        return { order: l.order, title: l.title, onTime, late, missing: missingMembers.length, missingMembers }
    })

    return (
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <StatCard icon={<Users className="w-5 h-5" />} label="Tổng học viên" value={String(totalMembers)} />
                <StatCard icon={<TrendingUp className="w-5 h-5" />} label="% đúng hạn trung bình" value={avgPercent === null ? '—' : `${avgPercent}%`} />
                <StatCard icon={<BookOpen className="w-5 h-5" />} label="Số ngày bài học" value={String(lessons.length)} />
            </div>

            {teamStats.length > 0 && (
                <div>
                    <div className="text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Tỷ lệ hoàn thành theo Team</div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {teamStats.map(t => (
                            <div key={t.team} className="bg-white border border-gray-100 rounded-xl p-4">
                                <div className="text-xs font-black text-violet-700 truncate">{teamLabel(t.team, labels)}</div>
                                {t.hasPS ? (
                                    <>
                                        <div className="text-2xl font-black text-gray-800 mt-1">{t.percent === null ? '—' : `${t.percent}%`}</div>
                                        <div className="text-[10px] font-bold text-gray-400 mt-0.5">{t.countedCount}/{t.memberCount} thành viên được tính</div>
                                    </>
                                ) : (
                                    <>
                                        <div className="text-2xl font-black text-gray-300 mt-1">—</div>
                                        <div className="text-[10px] font-bold text-amber-600 mt-0.5">Chưa có phụng sự — không tính</div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

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
                            const isExpanded = expandedDay === d.order
                            return (
                                <div key={d.order} className="bg-white border border-gray-100 rounded-xl overflow-hidden">
                                    <button
                                        type="button"
                                        onClick={() => setExpandedDay(isExpanded ? null : d.order)}
                                        className="w-full text-left p-3 hover:bg-gray-50 transition-colors"
                                    >
                                        <div className="flex items-center justify-between gap-2 mb-1.5">
                                            <span className="text-xs font-bold text-gray-700 truncate">Ngày {d.order} — {d.title}</span>
                                            <span className="flex items-center gap-1.5 shrink-0">
                                                <span className="text-[10px] font-bold text-gray-400">{d.onTime + d.late}/{totalMembers} đã nộp</span>
                                                <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                            </span>
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
                                    </button>
                                    {isExpanded && (
                                        <div className="border-t border-gray-100 bg-red-50/40 p-3">
                                            {d.missingMembers.length === 0 ? (
                                                <p className="text-[11px] text-gray-400 italic text-center py-2">Mọi người đã nộp bài ngày này 🎉</p>
                                            ) : (
                                                <>
                                                    <div className="flex items-center gap-1.5 text-[10px] font-black text-red-600 uppercase tracking-wider mb-2">
                                                        <UserX className="w-3.5 h-3.5" /> Chưa nộp ({d.missingMembers.length})
                                                    </div>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                                        {d.missingMembers.map(m => (
                                                            <div key={m.id} className="flex items-center justify-between gap-2 bg-white border border-red-100 rounded-lg px-2.5 py-1.5">
                                                                <span className="text-xs font-bold text-gray-800 truncate">{m.user.name || `#${m.user.id}`}</span>
                                                                {m.user.phone && (
                                                                    <span className="text-[11px] font-bold text-gray-500 shrink-0">{localPhone(m.user.phone)}</span>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
