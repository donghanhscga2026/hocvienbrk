'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { syncSalesLedgerAction } from '@/app/actions/sales-ledger-actions'

export default function SyncButton() {
    const router = useRouter()
    const [busy, setBusy] = useState(false)
    const [msg, setMsg] = useState<string | null>(null)

    async function onSync() {
        setBusy(true)
        setMsg(null)
        const res = await syncSalesLedgerAction()
        setBusy(false)
        if (!res.ok) { setMsg(res.error ?? 'Đồng bộ thất bại.'); return }
        setMsg(`Đã quét ${res.result?.scannedPaid} đơn PAID, ghi thêm ${res.result?.accrualsCreated} dòng doanh số và ${res.result?.reversalsCreated} dòng đảo.`)
        router.refresh()
    }

    return (
        <span className="inline-flex items-center gap-3">
            <button type="button" disabled={busy} onClick={onSync} className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {busy ? 'Đang đồng bộ...' : 'Đồng bộ ngay'}
            </button>
            {msg && <span className="text-sm text-gray-500">{msg}</span>}
        </span>
    )
}
