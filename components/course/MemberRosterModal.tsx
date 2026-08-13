'use client'

import { useEffect, useState } from 'react'
import { Loader2, X, Users } from 'lucide-react'
import { getCourseMemberRosterAction } from '@/app/actions/admin-actions'
import MemberDayChips, { DayStatus } from './MemberDayChips'

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

type RosterMember = {
    id: number
    memberRole: 'TV' | 'PS'
    team: number
    group: number
    user: { id: number; name: string | null; phone: string | null }
    days: { order: number; status: DayStatus }[]
}

type DisplayToggles = { role: boolean; code: boolean; phone: boolean }

function localPhone(phone: string | null) {
    if (!phone) return null
    return phone.startsWith('+84') ? '0' + phone.slice(3) : phone
}

function MemberRow({ member, display }: { member: RosterMember; display: DisplayToggles }) {
    const isPS = member.memberRole === 'PS'
    return (
        <div className={`rounded-xl border p-2 space-y-1 ${isPS ? 'border-amber-200 bg-amber-50' : 'border-gray-100 bg-white'}`}>
            {/* Dòng 1: TV | Mã | SĐT */}
            <div className="flex items-center gap-1 flex-wrap">
                {display.role && (
                    <span className={`px-1 py-0.5 rounded text-[9px] font-black shrink-0 ${isPS ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                        {member.memberRole}
                    </span>
                )}
                {display.code && (
                    <span className="text-[10px] font-bold font-mono text-purple-600 bg-purple-50 px-1 py-0.5 rounded shrink-0">
                        #{member.user.id}
                    </span>
                )}
                {display.phone && member.user.phone && (
                    <span className="text-[10px] font-mono text-gray-500 shrink-0">
                        {localPhone(member.user.phone)}
                    </span>
                )}
            </div>
            {/* Dòng 2: Họ tên */}
            <div className="text-xs font-bold text-gray-700 truncate" title={member.user.name || 'Chưa có tên'}>
                {member.user.name || 'Chưa có tên'}
            </div>
            {/* Dòng 3: Kết quả nộp bài từng ngày */}
            <MemberDayChips days={member.days} />
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

export default function MemberRosterModal({ courseId, courseName, onClose }: {
    courseId: number
    courseName: string
    onClose: () => void
}) {
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [members, setMembers] = useState<RosterMember[]>([])
    const [labels, setLabels] = useState<CourseMemberLabels>({})
    const [canViewPhone, setCanViewPhone] = useState(false)
    const [display, setDisplay] = useState<DisplayToggles>({ role: true, code: true, phone: true })

    useEffect(() => {
        let cancelled = false
        setLoading(true)
        getCourseMemberRosterAction(courseId).then(res => {
            if (cancelled) return
            if (res.success) {
                setMembers((res.members as any[]) || [])
                setLabels((res.labels as CourseMemberLabels) || {})
                setCanViewPhone(!!res.canViewPhone)
            } else {
                setError(res.error || 'Có lỗi xảy ra khi tải danh sách thành viên')
            }
            setLoading(false)
        })
        return () => { cancelled = true }
    }, [courseId])

    const effectiveDisplay: DisplayToggles = { ...display, phone: display.phone && canViewPhone }

    const groupedByTeam = (() => {
        const map = new Map<number, { ps: RosterMember[]; groups: Map<number, RosterMember[]> }>()
        members.forEach(m => {
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
    })()

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-white w-[95vw] h-[85vh] max-w-[1600px] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-violet-600 to-purple-600 text-white shrink-0">
                    <h2 className="font-bold text-sm flex items-center gap-2">
                        <Users className="w-4 h-4" /> Thành viên — {courseName}
                    </h2>
                    <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/20">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                        </div>
                    ) : error ? (
                        <div className="p-8 text-center text-gray-400 text-sm">{error}</div>
                    ) : members.length === 0 ? (
                        <div className="p-8 text-center text-gray-400 text-sm">Không có thành viên nào</div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {groupedByTeam.map(({ team, ps, groups }) => (
                                <div key={team}>
                                    <div className="bg-violet-50 border-y border-violet-100 px-4 py-2 flex items-center gap-2 flex-wrap">
                                        <span className="text-xs font-black text-violet-700 shrink-0">{teamLabel(team, labels)}</span>
                                        {ps.length > 0 && (
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className="text-[10px] font-bold text-violet-500 shrink-0">Phụng sự:</span>
                                            </div>
                                        )}
                                    </div>
                                    {ps.length > 0 && (
                                        <div className="px-4 py-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                                            {ps.map(m => <MemberRow key={m.id} member={m} display={effectiveDisplay} />)}
                                        </div>
                                    )}
                                    {groups.map(([groupNum, groupMembers]) => (
                                        <div key={groupNum} className="px-4 py-3">
                                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-wider px-1 pb-1.5">
                                                {groupLabel(team, groupNum, labels)}
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                                                {groupMembers.map(m => <MemberRow key={m.id} member={m} display={effectiveDisplay} />)}
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
                        <span className="text-xs text-gray-500 font-medium shrink-0">{members.length} thành viên</span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider shrink-0">Hiển thị:</span>
                        <ToggleCheckbox checked={display.role} onChange={v => setDisplay(d => ({ ...d, role: v }))} label="Vai trò" />
                        <ToggleCheckbox checked={display.code} onChange={v => setDisplay(d => ({ ...d, code: v }))} label="Mã" />
                        {canViewPhone && (
                            <ToggleCheckbox checked={display.phone} onChange={v => setDisplay(d => ({ ...d, phone: v }))} label="SĐT" />
                        )}
                    </div>
                    <div className="flex items-center gap-3 text-[10px] font-bold text-gray-500">
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500/60" /> Đúng hạn</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-purple-500/60" /> Nộp muộn</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500/60" /> Chưa nộp</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
