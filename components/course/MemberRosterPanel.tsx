'use client'

import { useState } from 'react'
import { Loader2, ImageDown } from 'lucide-react'
import MemberDayChips, { DayStatus } from './MemberDayChips'
import MemberDetailPanel from './MemberDetailPanel'
import { downloadRosterAsImage } from '@/lib/course/export-roster-image'

const RECENT_DAYS = 7

export const TEAM_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
export type CourseMemberLabels = { teams?: Record<string, string>; groups?: Record<string, string> }

export function teamLabel(team: number, labels?: CourseMemberLabels) {
    const custom = labels?.teams?.[String(team)]
    if (custom) return custom
    return team >= 1 && team <= 26 ? `Team ${TEAM_LETTERS[team - 1]}` : `Team ${team}`
}

export function groupLabel(team: number, group: number, labels?: CourseMemberLabels) {
    return labels?.groups?.[`${team}:${group}`] || `Group ${group}`
}

export type RosterMember = {
    id: number
    memberRole: 'TV' | 'PS'
    team: number
    group: number
    user: { id: number; name: string | null; phone: string | null }
    days: { order: number; status: DayStatus }[]
    completionPercent: number | null
    todayOrder: number
    startDate: string | Date
}

type DisplayToggles = { role: boolean; code: boolean; phone: boolean }

export function localPhone(phone: string | null) {
    if (!phone) return null
    return phone.startsWith('+84') ? '0' + phone.slice(3) : phone
}

export function formatStartDate(date: string | Date) {
    return new Date(date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' })
}

/**
 * Cắt cửa sổ hiển thị RECENT_DAYS ngày kết thúc đúng tại "hôm nay" CỦA RIÊNG
 * thành viên đó (todayOrder) — không cắt cứng theo cuối danh sách bài học
 * chung của khóa, vì mỗi người bắt đầu 1 ngày khác nhau nên "bài cần làm hôm
 * nay" của mỗi người là khác nhau (xem lib/course/deadline.ts).
 */
export function recentDayWindow(days: { order: number; status: DayStatus }[], todayOrder: number) {
    const windowEnd = Math.min(days.length, Math.max(1, todayOrder))
    const windowStart = Math.max(1, windowEnd - RECENT_DAYS + 1)
    return days.filter(d => d.order >= windowStart && d.order <= windowEnd)
}

function MemberRow({ member, display, onSelect }: { member: RosterMember; display: DisplayToggles; onSelect: () => void }) {
    const isPS = member.memberRole === 'PS'
    const recentDays = recentDayWindow(member.days, member.todayOrder)
    return (
        <div className={`rounded-xl border p-2 space-y-1 ${isPS ? 'border-amber-200 bg-amber-50' : 'border-gray-100 bg-white'}`}>
            {/* Dòng 1: TV | Mã | SĐT ... ngày bắt đầu (căn phải) */}
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
                <span className="text-[9px] font-mono text-gray-400 shrink-0 ml-auto" title="Ngày bắt đầu học">
                    {formatStartDate(member.startDate)}
                </span>
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
                    {member.completionPercent === null ? '—' : `${member.completionPercent}%`}
                </span>
            </button>
            {/* Dòng 3: Kết quả nộp bài 7 ngày gần nhất tính theo lịch riêng — ô viền
                nhấp nháy cam/đỏ là bài cần hoàn thành hôm nay của người này */}
            <MemberDayChips days={recentDays} todayOrder={member.todayOrder} />
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

export default function MemberRosterPanel({ members, labels, canViewPhone, courseName, dayOrders }: {
    members: RosterMember[]
    labels: CourseMemberLabels
    canViewPhone: boolean
    courseName: string
    dayOrders: number[]
}) {
    const [display, setDisplay] = useState<DisplayToggles>({ role: true, code: true, phone: true })
    const [exportingImage, setExportingImage] = useState(false)
    const [selectedMember, setSelectedMember] = useState<RosterMember | null>(null)

    const effectiveDisplay: DisplayToggles = { ...display, phone: display.phone && canViewPhone }

    const handleExportImage = () => {
        if (members.length === 0) return
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
                teamText: teamLabel(m.team, labels),
                groupText: m.memberRole === 'PS' ? '—' : groupLabel(m.team, m.group, labels),
                isPS: m.memberRole === 'PS',
                days: m.days || [],
            }))
            downloadRosterAsImage(courseName, rows, dayOrders)
        } finally {
            setExportingImage(false)
        }
    }

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
        <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto">
                {members.length === 0 ? (
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
                                        {ps.map(m => <MemberRow key={m.id} member={m} display={effectiveDisplay} onSelect={() => setSelectedMember(m)} />)}
                                    </div>
                                )}
                                {groups.map(([groupNum, groupMembers]) => (
                                    <div key={groupNum} className="px-4 py-3">
                                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-wider px-1 pb-1.5">
                                            {groupLabel(team, groupNum, labels)}
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                                            {groupMembers.map(m => <MemberRow key={m.id} member={m} display={effectiveDisplay} onSelect={() => setSelectedMember(m)} />)}
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
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-3 text-[10px] font-bold text-gray-500">
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500/60" /> Đúng hạn</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-purple-500/60" /> Nộp muộn</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500/60" /> Chưa nộp</span>
                    </div>
                    <button
                        onClick={handleExportImage}
                        disabled={exportingImage || members.length === 0}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Xuất bảng tổng hợp nộp bài ra file ảnh PNG"
                    >
                        {exportingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageDown className="w-3.5 h-3.5" />}
                        Xuất ảnh
                    </button>
                </div>
            </div>

            {selectedMember && (
                <MemberDetailPanel
                    member={{
                        enrollmentId: selectedMember.id,
                        name: selectedMember.user.name,
                        code: selectedMember.user.id,
                        memberRole: selectedMember.memberRole,
                        teamText: teamLabel(selectedMember.team, labels),
                        groupText: groupLabel(selectedMember.team, selectedMember.group, labels),
                        phone: canViewPhone ? selectedMember.user.phone : null,
                        completionPercent: selectedMember.completionPercent,
                        days: selectedMember.days,
                        todayOrder: selectedMember.todayOrder,
                    }}
                    onClose={() => setSelectedMember(null)}
                />
            )}
        </div>
    )
}
