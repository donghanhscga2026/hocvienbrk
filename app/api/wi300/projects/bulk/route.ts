import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { getCurrentDeploymentBrand } from '@/lib/site-profile/deployment-runtime'
import { crmBody, crmResponse } from '@/lib/crm/http'
import { CrmError } from '@/lib/crm/service'
import { bulkProjects } from '@/lib/wi300/project-service'
import { ZodError } from 'zod'
import { revalidatePath } from 'next/cache'

export async function POST(request: Request) {
  try {
    if (!await getCurrentDeploymentBrand()) throw new CrmError('Không tìm thấy trang.', 404)
    const session = await auth(), id = session?.user?.id == null ? NaN : Number(session.user.id)
    if (!Number.isSafeInteger(id) || id < 0) throw new CrmError('Vui lòng đăng nhập.', 401)
    const result = await bulkProjects(prisma, id, await crmBody(request, 20000))
    revalidatePath('/'); revalidatePath('/kham-pha'); revalidatePath('/du-an'); revalidatePath('/du-an/quan-ly')
    for (const project of result.projects) revalidatePath(`/du-an/${project.slug}`)
    return crmResponse(result)
  } catch (error) {
    if (error instanceof CrmError) return crmResponse({ error: error.message }, error.status)
    if (error instanceof ZodError || error instanceof SyntaxError) return crmResponse({ error: 'Dữ liệu thao tác không hợp lệ.' }, 400)
    console.error('[WI300 project bulk]', error instanceof Error ? error.name : 'Unknown')
    return crmResponse({ error: 'Chưa xác nhận được kết quả. Tải lại dữ liệu để kiểm tra trước khi thử tiếp.' }, 503)
  }
}
