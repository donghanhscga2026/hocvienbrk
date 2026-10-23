'use server'

import prisma from '@/lib/prisma'
import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'
import { logActivity } from '@/lib/activity-logger'
import { normalizeMetrics, validateMetrics, type BaselineMetrics } from '@/lib/baseline/growth'

export interface SaveBaselineInput {
    courseId: number
    kind: 'A' | 'B'
    metrics: Partial<Record<keyof BaselineMetrics, unknown>>
    note?: string
}

export interface SaveBaselineResult {
    ok: boolean
    error?: string
}

/**
 * Học viên tự ghi Điểm A / Điểm B cho một khóa mình đang học (ACTIVE).
 * - recordedAt luôn do server ấn định (không nhận ngày từ client → không
 *   thể có ngày tương lai như dữ liệu bẩn của WIPA OS).
 * - Mỗi (học viên, khóa, loại) chỉ một dòng — ghi lại là cập nhật, kèm
 *   ActivityLog để truy vết lần sửa.
 */
export async function saveMyBaseline(input: SaveBaselineInput): Promise<SaveBaselineResult> {
    const session = await auth()
    if (!session?.user?.id) return { ok: false, error: 'Bạn cần đăng nhập.' }
    const userId = Number(session.user.id)

    const courseId = Math.trunc(Number(input.courseId))
    if (!courseId || (input.kind !== 'A' && input.kind !== 'B')) {
        return { ok: false, error: 'Dữ liệu không hợp lệ.' }
    }

    const errors = validateMetrics(input.metrics ?? {})
    if (errors.length > 0) return { ok: false, error: errors.join(' ') }
    const metrics = normalizeMetrics(input.metrics ?? {})

    const enrollment = await prisma.enrollment.findFirst({
        where: { userId, courseId, status: 'ACTIVE' },
        select: { id: true },
    })
    if (!enrollment) return { ok: false, error: 'Bạn chưa ghi danh khóa học này (hoặc ghi danh chưa kích hoạt).' }

    const note = typeof input.note === 'string' ? input.note.trim().slice(0, 500) || null : null

    await prisma.learnerBaseline.upsert({
        where: { userId_courseId_kind: { userId, courseId, kind: input.kind } },
        update: { ...metrics, note, recordedAt: new Date() },
        create: { userId, courseId, kind: input.kind, ...metrics, note },
    })

    await logActivity({
        userId,
        action: 'BASELINE_SAVED',
        detail: `Ghi Điểm ${input.kind} cho khóa #${courseId}`,
        metadata: { courseId, kind: input.kind, ...metrics },
    }).catch(() => undefined)

    revalidatePath('/diem-a-b')
    revalidatePath('/tools/diem-a-b')
    return { ok: true }
}
