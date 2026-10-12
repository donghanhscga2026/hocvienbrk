import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { getCurrentDeploymentBrand } from '@/lib/site-profile/deployment-runtime'
import { crmBody, crmResponse } from '@/lib/crm/http'
import { CrmError } from '@/lib/crm/service'
import { ZodError } from 'zod'
import { revalidatePath } from 'next/cache'
import { courseProjectOptions, saveCourseProjects, saveOffering } from '@/lib/wi300/project-content-service'

async function actor() {
  if (!await getCurrentDeploymentBrand()) throw new CrmError('Không tìm thấy trang.', 404)
  const session = await auth()
  const id = session?.user?.id == null ? NaN : Number(session.user.id)
  if (!Number.isSafeInteger(id) || id < 0) throw new CrmError('Vui lòng đăng nhập.', 401)
  return id
}
function courseId(request: Request) {
  const text = new URL(request.url).searchParams.get('course')
  if (!text || !/^\d+$/.test(text) || !Number.isSafeInteger(Number(text)) || Number(text) <= 0) throw new CrmError('Mã khóa học không hợp lệ.')
  return Number(text)
}
function failure(error: unknown) {
  if (error instanceof CrmError) return crmResponse({ error: error.message }, error.status)
  if (error instanceof ZodError || error instanceof SyntaxError) return crmResponse({ error: 'Dữ liệu không hợp lệ.' }, 400)
  console.error('[WI project content]', error instanceof Error ? error.name : 'Unknown')
  return crmResponse({ error: 'Không xử lý được nội dung. Vui lòng thử lại.' }, 503)
}
export async function GET(request: Request) {
  try { return crmResponse({ projects: await courseProjectOptions(prisma, await actor(), courseId(request)) }) } catch (error) { return failure(error) }
}
export async function PUT(request: Request) {
  try {
    const id = await actor(), raw = await crmBody(request, 64000)
    const result = new URL(request.url).searchParams.has('course') ? await saveCourseProjects(prisma, id, courseId(request), raw) : await saveOffering(prisma, id, raw)
    revalidatePath('/du-an', 'layout'); revalidatePath('/san-pham'); revalidatePath('/'); revalidatePath('/kham-pha')
    return crmResponse(result)
  } catch (error) { return failure(error) }
}
