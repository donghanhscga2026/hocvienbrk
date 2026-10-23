'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { refreshMyBadges } from '@/app/actions/badge-actions'
import { awardAllBadgesAction } from '@/app/actions/badge-actions'

export function RefreshBadgesButton() {
    const router = useRouter()
    const [busy, setBusy] = useState(false)
    const [msg, setMsg] = useState<string | null>(null)

    async function onRefresh() {
        setBusy(true); setMsg(null)
        const res = await refreshMyBadges()
        setBusy(false)
        if (!res.ok) { setMsg(res.error ?? 'Không cập nhật được.'); return }
        setMsg(res.awarded && res.awarded.length > 0 ? `Chúc mừng! Bạn vừa nhận ${res.awarded.length} huy hiệu mới.` : 'Số liệu của bạn đã là mới nhất.')
        router.refresh()
    }

    return (
        <span className="inline-flex items-center gap-3">
            <button type="button" disabled={busy} onClick={onRefresh} className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {busy ? 'Đang kiểm tra...' : 'Cập nhật huy hiệu của tôi'}
            </button>
            {msg && <span className="text-sm text-gray-500">{msg}</span>}
        </span>
    )
}

export function AwardAllButton() {
    const router = useRouter()
    const [busy, setBusy] = useState(false)
    const [msg, setMsg] = useState<string | null>(null)

    async function onRun() {
        setBusy(true); setMsg(null)
        const res = await awardAllBadgesAction()
        setBusy(false)
        if (!res.ok) { setMsg(res.error ?? 'Không chạy được.'); return }
        setMsg(`Đã xét ${res.users} thành viên, trao ${res.awardedTotal} huy hiệu mới.`)
        router.refresh()
    }

    return (
        <span className="inline-flex items-center gap-3">
            <button type="button" disabled={busy} onClick={onRun} className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {busy ? 'Đang chạy...' : 'Chạy trao huy hiệu toàn hệ thống'}
            </button>
            {msg && <span className="text-sm text-gray-500">{msg}</span>}
        </span>
    )
}
