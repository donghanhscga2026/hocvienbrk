import prisma from '@/lib/prisma'
import { crmBody, crmResponse } from '@/lib/crm/http'
import { contentActor, contentFailure } from '@/lib/content/admin-http'
import { listManagedCategories, saveManagedCategory, deleteManagedContent } from '@/lib/content/admin-service'
import { appearanceAdmin } from '@/lib/wi300/appearance-service'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
export async function GET() {
  try { return crmResponse({ data: await listManagedCategories(prisma, await contentActor()) }) } catch (error) { return contentFailure(error) }
}
export async function POST(request: Request) {
  try {
    const actor = await contentActor(); await appearanceAdmin(prisma, actor)
    const data = await saveManagedCategory(prisma, actor, await crmBody(request, 16000))
    revalidatePath('/', 'layout'); return crmResponse({ data })
  } catch (error) { return contentFailure(error) }
}
export async function DELETE(request: Request) {
  try {
    const actor = await contentActor(); await appearanceAdmin(prisma, actor)
    const input = z.object({ id: z.number().int().min(0) }).strict().parse(await crmBody(request, 2000))
    const result = await deleteManagedContent(prisma, actor, 'category', input.id)
    revalidatePath('/', 'layout'); return crmResponse(result)
  } catch (error) { return contentFailure(error) }
}
