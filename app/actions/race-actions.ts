'use server'

import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { logActivity } from '@/lib/activity-logger'
import { syncRacePoints } from '@/lib/race/points-sync'

/**
 * Hành động của Cuộc đua tăng tốc. Quyền:
 * - Tạo cuộc đua / thêm người / tính lại điểm / duyệt nghỉ: ADMIN.
 * - Xin nghỉ: chính thành viên đã ghi danh cuộc đua đó.
 */

async function requireAdmin() {
    const session = await auth()
    if (!session?.user?.id) return null
    if (session.user.role !== 'ADMIN') return null
    return Number(session.user.id)
}

export interface CreateRaceInput {
    name: string
    courseId: number | null
    startsAt: string // YYYY-MM-DD
    endsAt: string
}

export async function createRace(input: CreateRaceInput): Promise<{ ok: boolean; error?: string; raceId?: number }> {
    const adminId = await requireAdmin()
    if (!adminId) return { ok: false, error: 'Chỉ quản trị viên mới tạo được cuộc đua.' }
    const name = (input.name ?? '').trim().slice(0, 200)
    if (!name) return { ok: false, error: 'Chưa nhập tên cuộc đua.' }
    const dateOk = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v ?? '')
    if (!dateOk(input.startsAt) || !dateOk(input.endsAt)) return { ok: false, error: 'Ngày bắt đầu/kết thúc không hợp lệ.' }
    const startsAt = new Date(`${input.startsAt}T00:00:00.000Z`)
    const endsAt = new Date(`${input.endsAt}T23:59:59.000Z`)
    if (endsAt <= startsAt) return { ok: false, error: 'Ngày kết thúc phải sau ngày bắt đầu.' }
    const race = await prisma.race.create({
        data: {
            name, courseId: input.courseId || null, startsAt, endsAt,
            status: 'DRAFT', createdById: adminId,
        },
    })
    await logActivity({
        userId: adminId, action: 'RACE_CREATED',
        detail: `Tạo cuộc đua "${name}" (${input.startsAt} → ${input.endsAt})`,
        metadata: { raceId: race.id },
    }).catch(() => undefined)
    revalidatePath('/tools/cuoc-dua')
    return { ok: true, raceId: race.id }
}

export async function setRaceStatus(raceId: number, status: 'DRAFT' | 'ACTIVE' | 'FINISHED'): Promise<{ ok: boolean; error?: string }> {
    const adminId = await requireAdmin()
    if (!adminId) return { ok: false, error: 'Chỉ quản trị viên.' }
    await prisma.race.update({ where: { id: raceId }, data: { status } })
    revalidatePath('/tools/cuoc-dua')
    revalidatePath('/cuoc-dua')
    return { ok: true }
}

/** Thêm toàn bộ học viên ACTIVE của khóa gắn với cuộc đua (giữ đội từ Enrollment.team). */
export async function enrollRaceFromCourse(raceId: number): Promise<{ ok: boolean; error?: string; added?: number }> {
    const adminId = await requireAdmin()
    if (!adminId) return { ok: false, error: 'Chỉ quản trị viên.' }
    const race = await prisma.race.findUnique({ where: { id: raceId }, select: { courseId: true } })
    if (!race?.courseId) return { ok: false, error: 'Cuộc đua này chưa gắn khóa học.' }
    const enrollments = await prisma.enrollment.findMany({
        where: { courseId: race.courseId, status: 'ACTIVE' },
        select: { userId: true, team: true },
    })
    if (enrollments.length === 0) return { ok: true, added: 0 }
    const result = await prisma.raceEnrollment.createMany({
        data: enrollments.map((e) => ({ raceId, userId: e.userId, team: e.team || 1 })),
        skipDuplicates: true,
    })
    revalidatePath('/tools/cuoc-dua')
    return { ok: true, added: result.count }
}

export async function syncRaceAction(raceId: number): Promise<{ ok: boolean; error?: string; members?: number }> {
    const adminId = await requireAdmin()
    if (!adminId) return { ok: false, error: 'Chỉ quản trị viên.' }
    const result = await syncRacePoints(raceId)
    await logActivity({
        userId: adminId, action: 'RACE_POINTS_SYNCED',
        detail: `Tính lại điểm cuộc đua #${raceId}: ${result.members} thành viên, ${result.eventsWritten} dòng đo`,
        metadata: { ...result },
    }).catch(() => undefined)
    revalidatePath('/tools/cuoc-dua')
    revalidatePath('/cuoc-dua')
    return { ok: true, members: result.members }
}

export async function requestLeave(input: { raceId: number; date: string; reason?: string }): Promise<{ ok: boolean; error?: string }> {
    const session = await auth()
    if (!session?.user?.id) return { ok: false, error: 'Bạn cần đăng nhập.' }
    const userId = Number(session.user.id)
    const enrolled = await prisma.raceEnrollment.findUnique({
        where: { raceId_userId: { raceId: input.raceId, userId } },
    })
    if (!enrolled) return { ok: false, error: 'Bạn chưa tham gia cuộc đua này.' }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date ?? '')) return { ok: false, error: 'Ngày nghỉ không hợp lệ.' }
    await prisma.raceLeave.create({
        data: {
            raceId: input.raceId, userId,
            date: new Date(`${input.date}T00:00:00.000Z`),
            reason: (input.reason ?? '').trim().slice(0, 300) || null,
        },
    })
    await logActivity({
        userId, action: 'RACE_LEAVE_REQUESTED',
        detail: `Xin nghỉ cuộc đua #${input.raceId} ngày ${input.date}`,
        metadata: { raceId: input.raceId, date: input.date },
    }).catch(() => undefined)
    revalidatePath('/cuoc-dua')
    return { ok: true }
}

export async function decideLeave(leaveId: number, approve: boolean): Promise<{ ok: boolean; error?: string }> {
    const adminId = await requireAdmin()
    if (!adminId) return { ok: false, error: 'Chỉ quản trị viên.' }
    const leave = await prisma.raceLeave.update({
        where: { id: leaveId },
        data: { status: approve ? 'APPROVED' : 'REJECTED' },
    })
    await logActivity({
        userId: adminId, action: 'RACE_LEAVE_DECIDED',
        detail: `${approve ? 'Duyệt' : 'Từ chối'} ngày nghỉ #${leaveId} của HV ${leave.userId} (cuộc đua #${leave.raceId})`,
        metadata: { leaveId, raceId: leave.raceId },
    }).catch(() => undefined)
    revalidatePath('/tools/cuoc-dua')
    revalidatePath('/cuoc-dua')
    return { ok: true }
}
