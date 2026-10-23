import 'server-only'
import { cache } from 'react'
import { auth } from '@/auth'
import { canCreateProfile } from '@/lib/auth/roles'
import prisma from '@/lib/prisma'
import { headers } from 'next/headers'
import { CrmError } from '@/lib/crm/service'
import { isPlatformHost, requestHostname } from './domain-shared'

export const WEBSITE_MANAGER_ROLE = 'WEBSITE_MANAGER'
export const websiteActor = cache(async (request?: Request) => {
  const host = requestHostname((request?.headers || await headers()).get('host') || '')
  if (!host || !isPlatformHost(host)) throw new CrmError('Quản lý website tại hệ thống chính.', 403)
  const session = await auth(), id = Number(session?.user?.id)
  if (session?.user?.id == null || !Number.isSafeInteger(id) || id < 0) throw new CrmError('Vui lòng đăng nhập.', 401)
  const user = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } })
  if (!user) throw new CrmError('Phiên đăng nhập không hợp lệ.', 401)
  return user
})
export function canManageWebsite(profile: { userId: number | null; members: { userId: number; role: string }[] }, actor: { id: number; role: string }, ownerOnly = false) {
  return actor.role === 'ADMIN' || profile.userId === actor.id && canCreateProfile(actor.role) || !ownerOnly && profile.members.some(member => member.userId === actor.id && member.role === WEBSITE_MANAGER_ROLE)
}
/** Mã website đến từ URL của chính tab đang mở; luôn kiểm tra quyền lại ở máy chủ. */
export async function managedProfile(profileId?: number, ownerOnly = false, request?: Request) {
  const actor = await websiteActor(request)
  if (profileId !== undefined && (!Number.isSafeInteger(profileId) || profileId < 1)) throw new CrmError('Mã website không hợp lệ.', 400)
  const profile = await prisma.siteProfile.findUnique({ where: profileId === undefined ? { userId: actor.id } : { id: profileId }, include: { members: true, user: { select: { role: true } } } })
  if (!profile || !canManageWebsite(profile, actor, ownerOnly)) throw new CrmError('Không tìm thấy website hoặc bạn chưa được cấp quyền quản trị.', 404)
  return profile
}
