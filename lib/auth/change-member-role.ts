import type { PrismaClient } from '@prisma/client'
import { Role } from '@prisma/client'
import { canCreateProfile, isHighestAdmin, normalizeRole } from './roles'

/** Preserve enrollment/progress data. Reassign courses before removing teaching rights. */
export async function changeMemberRole(db: PrismaClient, actorId: number, userId: number, role: Role) {
  const next = normalizeRole(role)
  if (!Number.isSafeInteger(userId) || userId < 0 || !Object.values(Role).includes(next)) throw new Error('Vai trò hoặc mã thành viên không hợp lệ.')
  return db.$transaction(async tx => {
    const actor = await tx.user.findUnique({ where: { id: actorId }, select: { id: true, role: true } })
    if (!actor || !isHighestAdmin(actor.id, actor.role)) throw new Error('Chỉ admin cao nhất được phân quyền thành viên.')
    const user = await tx.user.findUnique({ where: { id: userId }, select: { role: true } })
    if (!user) throw new Error('Không tìm thấy thành viên.')
    if (user.role === next) return { success: true as const, role: next }
    if (!canCreateProfile(next)) {
      const assigned = await tx.course.count({ where: { teacherId: userId } })
      if (assigned) throw new Error(`Tài khoản còn phụ trách ${assigned} khóa học. Hãy chuyển người phụ trách các khóa trước khi thu hồi quyền giảng dạy.`)
    }
    await tx.user.update({ where: { id: userId }, data: { role: next } })
    return { success: true as const, role: next }
  }, { isolationLevel: 'Serializable' })
}
