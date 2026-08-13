'use client'

import { X } from 'lucide-react'
import MemberDayMatrix from './MemberDayMatrix'
import { DayStatus } from './MemberDayChips'

function localPhone(phone: string | null | undefined) {
    if (!phone) return null
    return phone.startsWith('+84') ? '0' + phone.slice(3) : phone
}

export default function MemberDetailPanel({ member, onClose }: {
    member: {
        name: string | null
        code: number
        memberRole: 'TV' | 'PS'
        teamText: string
        groupText: string
        phone?: string | null
        completionPercent: number | null
        days: { order: number; status: DayStatus }[]
    }
    onClose: () => void
}) {
    const isPS = member.memberRole === 'PS'
    const completedCount = member.days.filter(d => d.status !== 'missing').length

    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-white w-[95vw] max-w-2xl max-h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-violet-600 to-purple-600 text-white shrink-0">
                    <div className="min-w-0">
                        <h2 className="font-bold text-sm truncate">{member.name || 'Chưa có tên'}</h2>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-violet-100 flex-wrap">
                            <span className={`px-1.5 py-0.5 rounded font-black ${isPS ? 'bg-amber-400 text-amber-900' : 'bg-white/20'}`}>{member.memberRole}</span>
                            <span>#{member.code}</span>
                            <span>{member.teamText}</span>
                            {!isPS && <span>{member.groupText}</span>}
                            {member.phone && <span className="font-mono">{localPhone(member.phone)}</span>}
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/20 shrink-0">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="px-6 py-3 bg-violet-50 border-b border-violet-100 shrink-0 flex items-center gap-4">
                    <div>
                        <div className="text-2xl font-black text-violet-700">
                            {member.completionPercent === null ? '—' : `${member.completionPercent}%`}
                        </div>
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Đúng hạn tính đến hết hôm qua</div>
                    </div>
                    <div className="h-8 w-px bg-violet-200" />
                    <div>
                        <div className="text-2xl font-black text-gray-700">{completedCount}/{member.days.length}</div>
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tổng số ngày đã nộp</div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    <MemberDayMatrix days={member.days} columns={10} />
                </div>

                <div className="px-6 py-3 bg-slate-50 border-t shrink-0 flex items-center gap-3 text-[10px] font-bold text-gray-500">
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500" /> Đúng hạn</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-purple-500" /> Nộp muộn</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100 border border-red-200" /> Chưa nộp</span>
                </div>
            </div>
        </div>
    )
}
