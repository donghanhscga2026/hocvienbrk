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

export default function MemberDayChips({ days, todayOrder }: {
    days: { order: number; status: DayStatus }[]
    todayOrder?: number
}) {
    if (!days || days.length === 0) return null
    return (
        <div className="flex flex-wrap gap-1">
            {days.map(d => {
                const isToday = d.order === todayOrder
                return (
                    <span
                        key={d.order}
                        title={`Ngày ${d.order}: ${STATUS_LABEL[d.status]}${isToday ? ' (bài hôm nay)' : ''}`}
                        className={`inline-flex items-center justify-center w-4 h-4 rounded text-[8px] font-black shrink-0 ${STATUS_STYLE[d.status]} ${isToday ? 'today-ring-pulse' : ''}`}
                    >
                        {d.order}
                    </span>
                )
            })}
        </div>
    )
}
