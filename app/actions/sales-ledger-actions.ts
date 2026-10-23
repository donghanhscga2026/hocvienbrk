'use server'

import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'
import { logActivity } from '@/lib/activity-logger'
import { syncSalesLedger, type SyncResult } from '@/lib/sales-ledger/sync'

/** Nút "Đồng bộ ngay" ở trang Sổ cái doanh số — chỉ ADMIN. */
export async function syncSalesLedgerAction(): Promise<{ ok: boolean; error?: string; result?: SyncResult }> {
    const session = await auth()
    if (!session?.user?.id) return { ok: false, error: 'Bạn cần đăng nhập.' }
    if (session.user.role !== 'ADMIN') return { ok: false, error: 'Chỉ quản trị viên mới đồng bộ được sổ cái.' }
    const result = await syncSalesLedger()
    await logActivity({
        userId: Number(session.user.id),
        action: 'SALES_LEDGER_SYNCED',
        detail: `Đồng bộ sổ cái doanh số: +${result.accrualsCreated} dòng ghi nhận, +${result.reversalsCreated} dòng đảo`,
        metadata: { ...result },
    }).catch(() => undefined)
    revalidatePath('/tools/so-cai-doanh-so')
    return { ok: true, result }
}
