'use client'

import { DayStatus } from './MemberDayChips'

const STATUS_STYLE: Record<DayStatus, string> = {
    onTime: 'bg-emerald-500 text-white',
    late: 'bg-purple-500 text-white',
    missing: 'bg-red-100 text-red-500',
}

const STATUS_LABEL: Record<DayStatus, string> = {
    onTime: 'Đã nộp đúng hạn',
    late: 'Nộp muộn',
    missing: 'Chưa nộp',
}

export default function MemberDayMatrix({ days, columns = 10, onSelectDay, todayOrder }: {
    days: { order: number; status: DayStatus }[]
    columns?: number
    onSelectDay?: (order: number) => void
    todayOrder?: number
}) {
    if (!days || days.length === 0) return null
    return (
        <div
            className="grid gap-1.5"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
            {days.map(d => {
                const isToday = d.order === todayOrder
                const todayClass = isToday ? (d.status === 'missing' ? 'today-ring-pulse' : 'today-ring-pulse-done') : ''
                return (
                    <button
                        key={d.order}
                        type="button"
                        onClick={onSelectDay ? () => onSelectDay(d.order) : undefined}
                        title={`Ngày ${d.order}: ${STATUS_LABEL[d.status]}${isToday ? ' (bài hôm nay)' : ''}`}
                        className={`aspect-square rounded-md flex items-center justify-center text-[10px] font-black ${STATUS_STYLE[d.status]} ${onSelectDay ? 'cursor-pointer hover:ring-2 hover:ring-violet-400' : 'cursor-default'} ${todayClass}`}
                    >
                        {d.order}
                    </button>
                )
            })}
        </div>
    )
}
