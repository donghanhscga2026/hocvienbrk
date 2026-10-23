'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { unlinkMyAccount, syncMyAccount } from '@/app/actions/social-account-actions'

export default function AccountRow({ accountId, canSync }: { accountId: number; canSync: boolean }) {
    const router = useRouter()
    const [busy, setBusy] = useState(false)
    const [msg, setMsg] = useState<string | null>(null)

    async function onSync() {
        setBusy(true); setMsg(null)
        const res = await syncMyAccount(accountId)
        setBusy(false)
        setMsg(res.ok ? 'Đã đồng bộ số liệu mới nhất.' : (res.error ?? 'Đồng bộ thất bại.'))
        if (res.ok) router.refresh()
    }

    async function onUnlink() {
        if (!window.confirm('Ngắt liên kết tài khoản này? Lịch sử số liệu đã ghi vẫn được giữ, hệ thống chỉ dừng đồng bộ tiếp.')) return
        setBusy(true); setMsg(null)
        const res = await unlinkMyAccount(accountId)
        setBusy(false)
        if (!res.ok) { setMsg(res.error ?? 'Không ngắt được.'); return }
        router.refresh()
    }

    return (
        <span className="inline-flex items-center gap-2">
            {canSync && (
                <button type="button" disabled={busy} onClick={onSync} className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
                    {busy ? 'Đang xử lý...' : 'Đồng bộ ngay'}
                </button>
            )}
            <button type="button" disabled={busy} onClick={onUnlink} className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 disabled:opacity-50">
                Ngắt liên kết
            </button>
            {msg && <span className="text-xs text-gray-500">{msg}</span>}
        </span>
    )
}
