'use server'

import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { logActivity } from '@/lib/activity-logger'
import { syncConnectedAccount } from '@/lib/social/youtube-sync'

/** Ngắt liên kết tài khoản của chính mình: xóa token, giữ lịch sử số liệu. */
export async function unlinkMyAccount(accountId: number): Promise<{ ok: boolean; error?: string }> {
    const session = await auth()
    if (!session?.user?.id) return { ok: false, error: 'Bạn cần đăng nhập.' }
    const userId = Number(session.user.id)
    const account = await prisma.connectedAccount.findFirst({ where: { id: accountId, userId } })
    if (!account) return { ok: false, error: 'Không tìm thấy tài khoản liên kết.' }
    await prisma.connectedAccount.update({
        where: { id: accountId },
        data: { status: 'REVOKED', accessToken: null, refreshToken: null, tokenExpiresAt: null },
    })
    await logActivity({
        userId, action: 'SOCIAL_ACCOUNT_UNLINKED',
        detail: `Ngắt liên kết ${account.provider}: ${account.displayName ?? account.externalId}`,
        metadata: { accountId, provider: account.provider },
    }).catch(() => undefined)
    revalidatePath('/ket-noi-tai-khoan')
    return { ok: true }
}

/** Đồng bộ ngay tài khoản của chính mình (không chờ cron). */
export async function syncMyAccount(accountId: number): Promise<{ ok: boolean; error?: string }> {
    const session = await auth()
    if (!session?.user?.id) return { ok: false, error: 'Bạn cần đăng nhập.' }
    const account = await prisma.connectedAccount.findFirst({ where: { id: accountId, userId: Number(session.user.id) } })
    if (!account) return { ok: false, error: 'Không tìm thấy tài khoản liên kết.' }
    const outcome = await syncConnectedAccount(accountId)
    revalidatePath('/ket-noi-tai-khoan')
    return outcome.ok ? { ok: true } : { ok: false, error: outcome.error ?? 'Đồng bộ thất bại.' }
}
