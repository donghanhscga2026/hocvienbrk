import { NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { courseEditorActor } from '@/lib/course-page/permissions'
import { serviceSchema } from '@/lib/offerings/service'
import { CrmError } from '@/lib/crm/service'
const headers = { 'Cache-Control': 'private, no-store' }
const schema = z
  .array(z.object({ id: z.string(), name: z.string().trim().min(1).max(120), config: serviceSchema }))
  .max(20)
function fail(error: unknown) {
  return NextResponse.json(
    {
      error:
        error instanceof CrmError ? error.message : 'Kiểm tra tên mẫu, cấu hình và các câu hỏi bắt buộc.',
    },
    { status: error instanceof CrmError ? error.status : 400, headers },
  )
}
export async function GET() {
  try {
    const actor = await courseEditorActor()
    const row = await prisma.systemConfig.findUnique({
      where: { key: `catalog:service-templates:${actor.id}` },
    })
    return NextResponse.json({ templates: schema.parse(row?.value || []) }, { headers })
  } catch (error) {
    return fail(error)
  }
}
export async function POST(request: Request) {
  try {
    if (request.headers.get('origin') !== new URL(request.url).origin)
      throw new CrmError('Nguồn yêu cầu không hợp lệ.', 403)
    const actor = await courseEditorActor()
    const text = await request.text()
    if (text.length > 150000) throw new CrmError('Mẫu quá dài.', 413)
    const input = z
      .object({ name: z.string().trim().min(1).max(120), config: serviceSchema })
      .strict()
      .parse(JSON.parse(text))
    const key = `catalog:service-templates:${actor.id}`
    const templates = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`
      const row = await tx.systemConfig.findUnique({ where: { key } })
      const old = schema.parse(row?.value || [])
      const previous = old.find((item) => item.name === input.name)
      if (!previous && old.length >= 20)
        throw new CrmError('Tối đa 20 mẫu. Dùng lại tên một mẫu để cập nhật.', 400)
      const value = [
        ...old.filter((item) => item.name !== input.name),
        { id: previous?.id || crypto.randomUUID(), ...input },
      ]
      await tx.systemConfig.upsert({ where: { key }, create: { key, value }, update: { value } })
      return value
    })
    return NextResponse.json({ templates }, { headers })
  } catch (error) {
    return fail(error)
  }
}
