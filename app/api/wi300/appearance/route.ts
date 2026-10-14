import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { getCurrentDeploymentBrand } from '@/lib/site-profile/deployment-runtime'
import { appearanceAdmin, readAppearance, saveAppearance } from '@/lib/wi300/appearance-service'
import { crmBody, crmResponse } from '@/lib/crm/http'
import { CrmError } from '@/lib/crm/service'
import { ZodError } from 'zod'
import { revalidatePath } from 'next/cache'

async function actor() {
  if (!await getCurrentDeploymentBrand()) throw new CrmError('Không tìm thấy trang.', 404)
  const session = await auth()
  return session?.user?.id == null ? NaN : Number(session.user.id)
}
function failure(error: unknown) {
  if (error instanceof CrmError) return crmResponse({ error: error.message }, error.status)
  if (error instanceof ZodError) return crmResponse({ error: error.issues[0]?.message || 'Cài đặt không hợp lệ.' }, 400)
  if (error instanceof SyntaxError) return crmResponse({ error: 'JSON không hợp lệ.' }, 400)
  console.error('[Wi appearance]', error instanceof Error ? error.name : 'Unknown')
  return crmResponse({ error: 'Chưa lưu được giao diện. Vui lòng thử lại.' }, 503)
}
export async function GET() {
  try { await appearanceAdmin(prisma, await actor()); return crmResponse(await readAppearance(prisma)) } catch (error) { return failure(error) }
}
export async function PUT(request: Request) {
  try {
    const id = await actor()
    await appearanceAdmin(prisma, id)
    const body = await crmBody(request, 100000)
    const state = await saveAppearance(prisma, id, body)
    // Draft/restore không thay đổi nội dung công khai hoặc cache website.
    revalidatePath('/tools/wi-appearance')
    revalidatePath('/tools/wi-website')
    if ((body as { action: string }).action === 'publish') revalidatePath('/', 'layout')
    return crmResponse(state)
  } catch (error) { return failure(error) }
}
