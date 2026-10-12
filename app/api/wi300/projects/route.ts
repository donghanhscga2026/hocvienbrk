import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { getCurrentDeploymentBrand } from '@/lib/site-profile/deployment-runtime'
import { crmBody, crmResponse } from '@/lib/crm/http'
import { CrmError } from '@/lib/crm/service'
import { createProject, deleteProject, managedProjects, saveProject } from '@/lib/wi300/project-service'
import { ZodError } from 'zod'
import { revalidatePath } from 'next/cache'

async function actor() {
  if (!await getCurrentDeploymentBrand()) throw new CrmError('Không tìm thấy trang.', 404)
  const session = await auth()
  const id = session?.user?.id == null ? NaN : Number(session.user.id)
  if (!Number.isSafeInteger(id) || id < 0) throw new CrmError('Vui lòng đăng nhập.', 401)
  return id
}
function failure(error: unknown) {
  if (error instanceof CrmError) return crmResponse({ error: error.message }, error.status)
  if (error instanceof ZodError) return crmResponse({ error: error.issues[0]?.message || 'Dữ liệu không hợp lệ.' }, 400)
  if (error instanceof SyntaxError) return crmResponse({ error: 'JSON không hợp lệ.' }, 400)
  console.error('[WI300 projects]', error instanceof Error ? error.name : 'Unknown')
  return crmResponse({ error: 'Chưa xử lý được dự án. Vui lòng thử lại.' }, 503)
}
export async function GET() {
  try { return crmResponse(await managedProjects(prisma, await actor())) } catch (error) { return failure(error) }
}
export async function PUT(request: Request) {
  try {
    const id = await actor()
    const slug = new URL(request.url).searchParams.get('slug') || ''
    const project = await saveProject(prisma, id, slug, await crmBody(request, 64000))
    revalidatePath('/'); revalidatePath('/kham-pha'); revalidatePath('/du-an'); revalidatePath(`/du-an/${slug}`)
    return crmResponse({ project })
  } catch (error) { return failure(error) }
}
export async function POST(request: Request) {
  try {
    const project = await createProject(prisma, await actor(), await crmBody(request, 64000))
    revalidatePath('/du-an/quan-ly')
    return crmResponse({ project }, 201)
  } catch (error) { return failure(error) }
}
export async function DELETE(request: Request) {
  try {
    const slug = new URL(request.url).searchParams.get('slug') || ''
    const result = await deleteProject(prisma, await actor(), slug, await crmBody(request, 64000))
    revalidatePath('/'); revalidatePath('/kham-pha'); revalidatePath('/du-an'); revalidatePath(`/du-an/${slug}`); revalidatePath('/du-an/quan-ly')
    return crmResponse(result)
  } catch (error) { return failure(error) }
}
