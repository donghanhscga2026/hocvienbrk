import { z } from 'zod'
import { getCrmActor } from '@/lib/crm/auth'
import { crmBody, crmFailure, crmResponse } from '@/lib/crm/http'
import { CrmError } from '@/lib/crm/service'
import { deactivateCareTemplate, updateCareTemplate } from '@/lib/care/templates-store'
export const dynamic = 'force-dynamic'

const patchSchema = z.object({
  shortcut: z.string().min(1).max(40).optional(),
  name: z.string().min(1).max(160).optional(),
  body: z.string().min(1).max(2200).optional(),
  scope: z.enum(['SYSTEM', 'COURSE', 'PERSONAL']).optional(),
  courseId: z.number().int().positive().nullable().optional(),
  isActive: z.boolean().optional(),
}).strict()

async function parseId(params: Promise<{ id: string }>): Promise<number> {
  const { id } = await params
  const value = Number(id)
  if (!Number.isInteger(value) || value <= 0) throw new CrmError('Mã câu mẫu không hợp lệ.', 400)
  return value
}

/** Sửa câu mẫu (kiểm quyền trong templates-store theo phạm vi/chủ sở hữu). */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const raw = await crmBody(request, 8000)
    const actor = await getCrmActor()
    const id = await parseId(params)
    const patch = patchSchema.parse(raw)
    const template = await updateCareTemplate(actor, id, patch)
    return crmResponse({ template })
  } catch (e) { return crmFailure(e) }
}

/** Xóa câu mẫu = tắt mẫu (xóa mềm) để giữ vết các hẹn giờ đã gắn mẫu này. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await getCrmActor()
    const id = await parseId(params)
    const template = await deactivateCareTemplate(actor, id)
    return crmResponse({ template })
  } catch (e) { return crmFailure(e) }
}
