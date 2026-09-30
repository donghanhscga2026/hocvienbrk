import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { ZodError } from 'zod'
import prisma from '@/lib/prisma'
import { getCrmActor } from '@/lib/crm/auth'
import { crmCommand, crmQuery } from '@/lib/crm/validation'
import { CrmError, readCrm, writeCrm } from '@/lib/crm/service'

export const dynamic = 'force-dynamic'
function respond(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'private, no-store' } })
}
function failure(error: unknown) {
  if (error instanceof CrmError) return respond({ error: error.message }, error.status)
  if (error instanceof ZodError) return respond({ error: error.issues[0]?.message || 'Dữ liệu không hợp lệ.' }, 400)
  if (error instanceof SyntaxError) return respond({ error: 'Dữ liệu JSON không hợp lệ.' }, 400)
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') return respond({ error: 'Email hoặc điện thoại đã có hồ sơ CRM. Hãy kiểm tra hoặc nhờ quản trị viên xử lý.' }, 409)
    if (error.code === 'P2021' || error.code === 'P2022') return respond({ error: 'CRM chưa được khởi tạo đầy đủ. Quản trị viên cần áp dụng migration CRM.' }, 503)
    if (error.code === 'P2034') return respond({ error: 'Có cập nhật đồng thời. Hãy tải lại và thử lại.' }, 409)
  }
  console.error('[CRM]', error instanceof Error ? error.name : 'Unknown error')
  return respond({ error: 'Không thể xử lý CRM lúc này. Vui lòng thử lại.' }, 500)
}
export async function GET(request: Request) {
  try {
    const actor = await getCrmActor()
    const query = crmQuery.parse(Object.fromEntries(new URL(request.url).searchParams))
    return respond(await readCrm(prisma, actor, query))
  } catch (error) { return failure(error) }
}
export async function POST(request: Request) {
  try {
    // Browser writes must originate from the same site; no permissive CORS or CSRF bypass.
    const origin = request.headers.get('origin')
    if (!origin || origin !== new URL(request.url).origin) throw new CrmError('Nguồn gửi yêu cầu không hợp lệ.', 403)
    if (!request.headers.get('content-type')?.includes('application/json')) throw new CrmError('Yêu cầu phải là JSON.', 415)
    const actor = await getCrmActor()
    const raw = await request.text()
    if (raw.length > 16000) throw new CrmError('Nội dung vượt quá giới hạn.', 413)
    const command = crmCommand.parse(JSON.parse(raw))
    return respond(await writeCrm(prisma, actor, command), command.action.endsWith('.create') ? 201 : 200)
  } catch (error) { return failure(error) }
}
