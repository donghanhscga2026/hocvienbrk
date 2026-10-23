import prisma from '@/lib/prisma'
import { crmBody, crmResponse } from '@/lib/crm/http'
import { contentActor, contentFailure } from '@/lib/content/admin-http'
import { listManagedPosts, saveManagedPost, deleteManagedContent, readManagedPost } from '@/lib/content/admin-service'
import { appearanceAdmin } from '@/lib/wi300/appearance-service'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
function invalidate() { revalidatePath('/', 'layout'); revalidatePath('/tools/posts') }
export async function GET(request: Request) {
  try {
    const actor = await contentActor(), params = new URL(request.url).searchParams
    await appearanceAdmin(prisma, actor)
    if (params.has('id')) {
      return crmResponse({ post: await readManagedPost(prisma, z.string().min(1).max(200).parse(params.get('id'))) })
    }
    const page = z.coerce.number().int().min(0).max(100000).parse(params.get('page') || 0)
    const category = params.get('category'), status = params.get('status')
    return crmResponse(await listManagedPosts(prisma, actor, page, params.get('q') || '', category ? z.coerce.number().int().min(0).parse(category) : undefined,
      status === 'published' ? true : status === 'draft' ? false : undefined))
  } catch (error) { return contentFailure(error) }
}
export async function POST(request: Request) {
  try {
    const actor = await contentActor(); await appearanceAdmin(prisma, actor)
    const post = await saveManagedPost(prisma, actor, await crmBody(request, 420000))
    invalidate(); return crmResponse({ post })
  } catch (error) { return contentFailure(error) }
}
export async function DELETE(request: Request) {
  try {
    const actor = await contentActor(); await appearanceAdmin(prisma, actor)
    const input = z.object({ id: z.string().min(1).max(200), version: z.string().min(1) }).strict().parse(await crmBody(request, 2000))
    const result = await deleteManagedContent(prisma, actor, 'post', input.id, input.version)
    invalidate(); return crmResponse(result)
  } catch (error) { return contentFailure(error) }
}
