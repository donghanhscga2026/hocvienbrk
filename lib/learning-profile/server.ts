import 'server-only'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { normalizeRole } from '@/lib/auth/roles'
import { domainContext } from '@/lib/website/domain-context'
import { LearningProfileError } from './shared'
import type { LearningActor } from './service'

/** No cross-request cache: role revocation takes effect on the next request. */
export async function learningProfileActor(): Promise<LearningActor> {
  if (await domainContext()) throw new LearningProfileError('Mở hồ sơ học tập trên hệ thống chính.', 403)
  const session = await auth()
  const id = session?.user?.id == null ? NaN : Number(session.user.id)
  if (!Number.isSafeInteger(id) || id < 0) throw new LearningProfileError('Vui lòng đăng nhập.', 401)
  const actor = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } })
  if (!actor) throw new LearningProfileError('Phiên đăng nhập không còn hợp lệ.', 401)
  return { id: actor.id, role: normalizeRole(actor.role) }
}
