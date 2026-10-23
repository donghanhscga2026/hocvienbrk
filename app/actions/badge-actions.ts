'use server'

import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'
import { logActivity } from '@/lib/activity-logger'
import { awardBadgesForUser, awardBadgesForAllUsers } from '@/lib/badges/engine'

/** Thành viên tự cập nhật huy hiệu của mình (đo lại + trao cái đã đạt). */
export async function refreshMyBadges(): Promise<{ ok: boolean; error?: string; awarded?: string[] }> {
    const session = await auth()
    if (!session?.user?.id) return { ok: false, error: 'Bạn cần đăng nhập.' }
    const result = await awardBadgesForUser(Number(session.user.id))
    if (result.awarded.length > 0) {
        await logActivity({
            userId: Number(session.user.id), action: 'BADGES_AWARDED',
            detail: `Nhận ${result.awarded.length} huy hiệu mới: ${result.awarded.join(', ')}`,
            metadata: { codes: result.awarded },
        }).catch(() => undefined)
    }
    revalidatePath('/huy-hieu')
    return { ok: true, awarded: result.awarded }
}

/** Quản trị chạy trao huy hiệu cho toàn hệ thống ngay (không chờ cron). */
export async function awardAllBadgesAction(): Promise<{ ok: boolean; error?: string; users?: number; awardedTotal?: number }> {
    const session = await auth()
    if (!session?.user?.id) return { ok: false, error: 'Bạn cần đăng nhập.' }
    if (session.user.role !== 'ADMIN') return { ok: false, error: 'Chỉ quản trị viên.' }
    const result = await awardBadgesForAllUsers()
    await logActivity({
        userId: Number(session.user.id), action: 'BADGES_AWARDED_ALL',
        detail: `Chạy trao huy hiệu toàn hệ thống: ${result.users} thành viên, ${result.awardedTotal} huy hiệu mới`,
        metadata: { ...result },
    }).catch(() => undefined)
    revalidatePath('/tools/huy-hieu')
    return { ok: true, ...result }
}
