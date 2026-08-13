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

export default function MemberDayMatrix({ days, columns = 10 }: {
    days: { order: number; status: DayStatus }[]
    columns?: number
}) {
    if (!days || days.length === 0) return null
    return (
        <div
            className="grid gap-1.5"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
            {days.map(d => (
                <div
                    key={d.order}
                    title={`Ngày ${d.order}: ${STATUS_LABEL[d.status]}`}
                    className={`aspect-square rounded-md flex items-center justify-center text-[11px] font-black ${STATUS_STYLE[d.status]}`}
                >
                    {d.order}
                </div>
            ))}
        </div>
    )
}
