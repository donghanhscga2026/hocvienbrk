import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { courseEditorActor } from '@/lib/course-page/permissions'
import { CrmError } from '@/lib/crm/service'
import { appFrameKey, builtInAppOrigins } from '@/lib/wi300/app-frame-domains'
import { appFrameStateSchema, readAppFrameSettings } from '@/lib/wi300/app-frame-settings'

const headers = { 'Cache-Control': 'private, no-store' }
async function admin() {
  if (process.env.SITE_VARIANT?.trim().toLowerCase() !== 'wi300')
    throw new CrmError('Chức năng chỉ dành cho Wi300.', 404)
  const actor = await courseEditorActor()
  if (actor.role !== 'ADMIN') throw new CrmError('Chỉ admin được quản lý tên miền App.', 403)
  return actor
}
function errorResponse(error: unknown) {
  return NextResponse.json(
    { error: error instanceof Error ? error.message : 'Không lưu được tên miền App.' },
    { status: error instanceof CrmError ? error.status : 400, headers },
  )
}
export async function GET() {
  try {
    await admin()
    return NextResponse.json(
      { ...(await readAppFrameSettings(prisma)), builtIn: builtInAppOrigins },
      { headers },
    )
  } catch (error) {
    return errorResponse(error)
  }
}
export async function PUT(request: Request) {
  try {
    if (request.headers.get('origin') !== new URL(request.url).origin)
      throw new CrmError('Nguồn yêu cầu không hợp lệ.', 403)
    await admin()
    const input = appFrameStateSchema.parse(await request.json())
    const key = appFrameKey()
    const state = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`
      await admin()
      const previous = await readAppFrameSettings(tx, key)
      if (input.revision !== previous.revision)
        throw new CrmError('Danh sách đã thay đổi. Tải lại trước khi lưu.', 409)
      const value = {
        revision: previous.revision + 1,
        origins: [...new Set(input.origins)].filter((origin) => !builtInAppOrigins.includes(origin)),
      }
      await tx.systemConfig.upsert({ where: { key }, create: { key, value }, update: { value } })
      return value
    })
    return NextResponse.json({ ...state, builtIn: builtInAppOrigins }, { headers })
  } catch (error) {
    return errorResponse(error)
  }
}
