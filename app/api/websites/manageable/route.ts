import prisma from '@/lib/prisma'
import { websiteActor, WEBSITE_MANAGER_ROLE } from '@/lib/website/management'
import { crmResponse } from '@/lib/crm/http'
import { websiteFailure } from '@/lib/website/http'
export async function GET(request: Request) {
  try {
    const actor = await websiteActor(request), params = new URL(request.url).searchParams
    const page = Number(params.get('page') || 1)
    if (!Number.isSafeInteger(page) || page < 1 || page > 10000) return crmResponse({ error: 'Trang không hợp lệ.' }, 400)
    const profiles = await prisma.siteProfile.findMany({
      where: actor.role === 'ADMIN' ? {} : { OR: [{ userId: actor.id }, { members: { some: { userId: actor.id, role: WEBSITE_MANAGER_ROLE } } }] },
      select: { id: true, userId: true, slug: true, title: true, isActive: true, user: { select: { name: true } } },
      orderBy: { id: 'asc' }, skip: (page - 1) * 50, take: 51,
    })
    return crmResponse({ profiles: profiles.slice(0, 50).map(profile => ({ ...profile, access: profile.userId === actor.id ? 'owner' : actor.role === 'ADMIN' ? 'admin' : 'collaborator' })), nextPage: profiles.length > 50 ? page + 1 : null, admin: actor.role === 'ADMIN' })
  } catch (error) { return websiteFailure(error) }
}
