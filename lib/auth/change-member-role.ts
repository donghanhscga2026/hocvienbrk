import type { PrismaClient } from '@prisma/client'
import { Role } from '@prisma/client'
import { canCreateProfile, getAssignableRoles, isRootAdmin, isTeachingRole, normalizeRole } from './roles'

/** Preserve enrollment/progress data. Reassign courses before removing teaching rights. */
export async function changeMemberRole(db: PrismaClient, actorId: number, userId: number, role: Role) {
  const next = normalizeRole(role)
  if (!Number.isSafeInteger(userId) || userId < 0 || !Object.values(Role).includes(next)) throw new Error('Vai trò hoặc mã thành viên không hợp lệ.')
  return db.$transaction(async tx => {
    const actor = await tx.user.findUnique({ where: { id: actorId }, select: { id: true, role: true } })
    if (!actor) throw new Error('Không tìm thấy tài khoản thực hiện.')
    const user = await tx.user.findUnique({ where: { id: userId }, select: { id: true, role: true } })
    if (!user) throw new Error('Không tìm thấy thành viên.')
    if (normalizeRole(user.role) === next) return { success: true as const, role: next }

    // Ma trận phân quyền gán vai trò (theo yêu cầu 2026-10-15):
    // - Root (id 0, 3773): toàn quyền — DUY NHẤT được gán/thu hồi quyền Quản trị (ADMIN).
    // - Quản trị thường: được gán mọi vai trò TRỪ Quản trị; không được đổi quyền của
    //   người đang là Quản trị (kể cả 2 tài khoản root).
    // - Giáo viên/Giảng viên: chỉ được gán Cộng sự (AFFILIATE) hoặc Thành viên (STUDENT)
    //   cho người đang là Thành viên/Cộng sự trong lớp mình phụ trách.
    const allowed = getAssignableRoles(actor.id, actor.role, user.id, user.role)
    if (!allowed) throw new Error('Không có quyền thay đổi vai trò của thành viên này.')
    if (!allowed.includes(next)) {
      throw new Error(next === Role.ADMIN
        ? 'Chỉ tài khoản root mới được phân quyền Quản trị.'
        : 'Vai trò này vượt quá quyền của bạn.')
    }

    // Giáo viên/Giảng viên chỉ được phân quyền trong phạm vi lớp mình phụ trách
    if (isTeachingRole(actor.role) && actor.role !== Role.ADMIN && !isRootAdmin(actor.id, actor.role)) {
      const inScope = await tx.enrollment.findFirst({
        where: { userId, course: { teacherId: actor.id } },
        select: { id: true },
      })
      if (!inScope) throw new Error('Chỉ được phân quyền cho thành viên trong lớp của bạn.')
    }

    if (!canCreateProfile(next)) {
      const assigned = await tx.course.count({ where: { teacherId: userId } })
      if (assigned) throw new Error(`Tài khoản còn phụ trách ${assigned} khóa học. Hãy chuyển người phụ trách các khóa trước khi thu hồi quyền giảng dạy.`)
    }
    await tx.user.update({ where: { id: userId }, data: { role: next } })
    return { success: true as const, role: next }
  }, { isolationLevel: 'Serializable' })
}
