'use client'

export type DayStatus = 'missing' | 'late' | 'onTime'

const STATUS_STYLE: Record<DayStatus, string> = {
    onTime: 'bg-emerald-500/15 text-emerald-600',
    late: 'bg-purple-500/15 text-purple-600',
    missing: 'bg-red-500/15 text-red-600',
}

const STATUS_LABEL: Record<DayStatus, string> = {
    onTime: 'Đã nộp đúng hạn',
    late: 'Nộp muộn',
    missing: 'Chưa nộp',
}

export default function MemberDayChips({ days }: { days: { order: number; status: DayStatus }[] }) {
    if (!days || days.length === 0) return null
    return (
        <div className="flex flex-wrap gap-1">
            {days.map(d => (
                <span
                    key={d.order}
                    title={`Ngày ${d.order}: ${STATUS_LABEL[d.status]}`}
                    className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-black shrink-0 ${STATUS_STYLE[d.status]}`}
                >
                    {d.order}
                </span>
            ))}
        </div>
    )
}
