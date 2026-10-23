'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { requestLeave } from '@/app/actions/race-actions'

export default function LeaveForm({ raceId }: { raceId: number }) {
    const router = useRouter()
    const [date, setDate] = useState('')
    const [reason, setReason] = useState('')
    const [busy, setBusy] = useState(false)
    const [msg, setMsg] = useState<string | null>(null)

    async function onSubmit() {
        setBusy(true); setMsg(null)
        const res = await requestLeave({ raceId, date, reason })
        setBusy(false)
        if (!res.ok) { setMsg(res.error ?? 'Không gửi được.'); return }
        setMsg('Đã gửi xin nghỉ, chờ ban tổ chức duyệt.')
        setDate(''); setReason('')
        router.refresh()
    }

    return (
        <div className="flex flex-wrap items-end gap-2">
            <label className="block">
                <span className="block text-xs font-medium text-gray-500 mb-1">Ngày nghỉ</span>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </label>
            <label className="block flex-1 min-w-48">
                <span className="block text-xs font-medium text-gray-500 mb-1">Lý do (không bắt buộc)</span>
                <input value={reason} onChange={(e) => setReason(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="Việc gia đình, ốm..." />
            </label>
            <button type="button" disabled={busy || !date} onClick={onSubmit} className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {busy ? 'Đang gửi...' : 'Xin nghỉ ngày này'}
            </button>
            {msg && <span className="text-sm text-gray-500 w-full">{msg}</span>}
        </div>
    )
}
