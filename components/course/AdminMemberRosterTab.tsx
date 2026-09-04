'use client'

import { useMemo, useState } from 'react'
import { Loader2, Plus, Minus, AlertTriangle, Save, FileSpreadsheet, ImageDown } from 'lucide-react'
import {
    updateCourseMemberAssignmentsAction,
    updateCourseMemberLabelAction,
    exportCourseMembersAction,
} from '@/app/actions/admin-actions'
import MemberDayChips from './MemberDayChips'
import MemberDetailPanel from './MemberDetailPanel'
import { teamLabel, groupLabel, CourseMemberLabels, RosterMember, formatStartDate, recentDayWindow } from './MemberRosterPanel'
import { downloadRosterAsImage } from '@/lib/course/export-roster-image'

function localPhone(phone: string | null | undefined) {
    if (!phone) return null
    return phone.startsWith('+84') ? '0' + phone.slice(3) : phone
}

type CardDisplayToggles = { role: boolean; code: boolean; phone: boolean }
type EditPatch = { memberRole: 'TV' | 'PS'; team: number; group: number }

function MemberCard({ member, dirty, effective, onChange, ssMode, display, onSelect }: {
    member: RosterMember
    dirty: boolean
    effective: EditPatch
    onChange: (patch: Partial<EditPatch>) => void
    ssMode: boolean
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
                {display.phone && member.user.phone && (
                    <span className="text-[9px] font-mono text-gray-500 shrink-0">{localPhone(member.user.phone)}</span>
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
                    {member.completionPercent == null ? '—' : `${member.completionPercent}%`}
                </span>
            </button>
            {/* Dòng 3: Kết quả nộp bài 7 ngày gần nhất tính theo lịch riêng — ô viền
                nhấp nháy cam/đỏ là bài cần hoàn thành hôm nay của người này */}
            {member.days?.length > 0 && (
                <MemberDayChips days={recentDayWindow(member.days, member.todayOrder)} todayOrder={member.todayOrder} />
            )}
        </div>
    )
}

function EditableLabel({ value, onSave, className }: {
    value: string
    onSave: (name: string) => void
    className?: string
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
                className="bg-white border border-violet-300 rounded px-1 py-0.5 text-xs font-black text-violet-700 outline-none"
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

export default function AdminMemberRosterTab({ courseId, courseName, members, labels, reload }: {
    courseId: number
    courseName: string
    members: RosterMember[]
    labels: CourseMemberLabels
    reload: () => void
}) {
    const [editedMembers, setEditedMembers] = useState<Record<number, EditPatch>>({})
    const [savingAssignments, setSavingAssignments] = useState(false)
    const [ssMode, setSsMode] = useState(false)
    const [cardDisplay, setCardDisplay] = useState<CardDisplayToggles>({ role: true, code: true, phone: true })
    const [selectedMember, setSelectedMember] = useState<RosterMember | null>(null)
    const [exportingStudents, setExportingStudents] = useState(false)
    const [exportingImage, setExportingImage] = useState(false)

    const hasCustomAssignment = useMemo(() => {
        return members.some(m => m.memberRole === 'PS' || m.team !== 1 || m.group !== 1)
    }, [members])

    const groupedByTeam = useMemo(() => {
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
    }, [members])

    const handleMemberChange = (enrollmentId: number, base: EditPatch, patch: Partial<EditPatch>) => {
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
        const updates = Object.entries(editedMembers).map(([enrollmentId, v]) => ({ enrollmentId: Number(enrollmentId), ...v }))
        if (updates.length === 0) return
        setSavingAssignments(true)
        try {
            const res = await updateCourseMemberAssignmentsAction(courseId, updates)
            if (res.success) {
                setEditedMembers({})
                reload()
            } else {
                alert(res.error || 'Có lỗi xảy ra khi cập nhật')
            }
        } catch {
            alert('Có lỗi xảy ra khi cập nhật')
        }
        setSavingAssignments(false)
    }

    const handleSaveLabel = async (kind: 'team' | 'group', team: number, group: number | null, name: string) => {
        const res = await updateCourseMemberLabelAction(courseId, kind, team, group, name)
        if (res.success) reload()
        else alert(res.error || 'Có lỗi xảy ra khi đổi tên')
    }

    const handleExportStudents = async () => {
        setExportingStudents(true)
        try {
            const res = await exportCourseMembersAction(courseId, courseName)
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
                startDate: m.startDate,
                days: m.days || [],
            }))
            downloadRosterAsImage(courseName, rows)
        } finally {
            setExportingImage(false)
        }
    }

    const pendingCount = Object.keys(editedMembers).length
    const cardGridClass = "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2"
    const renderCard = (m: RosterMember) => {
        const base: EditPatch = { memberRole: m.memberRole, team: m.team, group: m.group }
        const effective = editedMembers[m.id] ?? base
        return (
            <MemberCard
                key={m.id}
                member={m}
                effective={effective}
                dirty={!!editedMembers[m.id]}
                onChange={(patch) => handleMemberChange(m.id, base, patch)}
                ssMode={ssMode}
                display={cardDisplay}
                onSelect={() => setSelectedMember(m)}
            />
        )
    }

    return (
        <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto">
                {members.length === 0 ? (
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
                                        value={teamLabel(team, labels)}
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
                                                value={groupLabel(team, groupNum, labels)}
                                                onSave={(name) => handleSaveLabel('group', team, groupNum, name)}
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

            {selectedMember && (
                <MemberDetailPanel
                    member={{
                        enrollmentId: selectedMember.id,
                        name: selectedMember.user.name,
                        code: selectedMember.user.id,
                        memberRole: (editedMembers[selectedMember.id]?.memberRole ?? selectedMember.memberRole),
                        teamText: teamLabel(editedMembers[selectedMember.id]?.team ?? selectedMember.team, labels),
                        groupText: groupLabel(
                            editedMembers[selectedMember.id]?.team ?? selectedMember.team,
                            editedMembers[selectedMember.id]?.group ?? selectedMember.group,
                            labels
                        ),
                        phone: selectedMember.user.phone,
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
