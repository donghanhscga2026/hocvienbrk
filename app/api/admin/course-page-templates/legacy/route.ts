import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { domainContext } from '@/lib/website/domain-context'

export const dynamic = 'force-dynamic'
const idSchema = z.string().uuid()
const removalSchema = z.object({ id: idSchema, updatedAt: z.string().datetime(), execute: z.boolean().default(false), confirm: z.literal('DELETE_LEGACY_TEMPLATE').optional() }).strict()
const select = { id: true, name: true, description: true, sourceType: true, createdAt: true, updatedAt: true } as const
async function admin() {
  const session = await auth(), id = Number(session?.user?.id ?? NaN)
  if (!Number.isSafeInteger(id) || id < 0 || await domainContext()) return NextResponse.json({ error: 'Chỉ Admin được quản lý mẫu cũ tại hệ thống chính.' }, { status: 403 })
  // Kiểm tra quyền hiện tại trước cả thao tác xem và xóa.
  const actor = await prisma.user.findUnique({ where: { id }, select: { role: true } })
  if (actor?.role !== 'ADMIN') return NextResponse.json({ error: 'Chỉ Admin được quản lý mẫu cũ.' }, { status: 403 })
  return null
}
function failure(error: unknown) {
  console.error('[Legacy templates]', error instanceof Error ? error.message : 'Unknown error')
  return NextResponse.json({ error: 'Chưa xử lý được mẫu cũ. Hãy tải lại để kiểm tra trước khi thử lại.' }, { status: 503 })
}
export async function GET(request: Request) {
  try {
    const denied = await admin(); if (denied) return denied
    const params = new URL(request.url).searchParams, id = params.get('id'), page = Number(params.get('page') || 0)
    if (id && !idSchema.safeParse(id).success || !Number.isSafeInteger(page) || page < 0 || page > 10000) return NextResponse.json({ error: 'Yêu cầu không hợp lệ.' }, { status: 400 })
    const q = (params.get('q') || '').trim().slice(0, 200)
    const items = await prisma.coursePageTemplate.findMany({ where: id ? { id } : q ? { name: { contains: q, mode: 'insensitive' } } : {}, select, orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }], skip: page * 30, take: 31 })
    return NextResponse.json({ items: items.slice(0, 30), hasMore: items.length > 30 }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021' && String(error.meta?.table).includes('course_page_templates')) return NextResponse.json({ items: [], hasMore: false })
    return failure(error)
  }
}
export async function DELETE(request: Request) {
  try {
    const denied = await admin(); if (denied) return denied
    const parsed = removalSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: 'Yêu cầu xóa mẫu không hợp lệ.' }, { status: 400 })
    const { id, updatedAt, execute, confirm } = parsed.data
    if (execute && confirm !== 'DELETE_LEGACY_TEMPLATE') return NextResponse.json({ error: 'Cần xác nhận xóa mẫu cũ.' }, { status: 400 })
    const template = await prisma.coursePageTemplate.findUnique({ where: { id }, select })
    if (!template) return NextResponse.json({ error: 'Mẫu không còn trong kho cũ.' }, { status: 404 })
    if (template.updatedAt.toISOString() !== updatedAt) return NextResponse.json({ error: 'Mẫu đã thay đổi. Hãy tải lại trước khi xóa.' }, { status: 409 })
    // Trang đã áp dụng giữ snapshot riêng; không xóa file Storage hoặc lịch sử.
    const affects = { templates: 1, coursePages: 0, versions: 0, mediaFiles: 0 }
    if (!execute) return NextResponse.json({ dryRun: true, template, affects })
    const result = await prisma.coursePageTemplate.deleteMany({ where: { id, updatedAt: new Date(updatedAt) } })
    if (result.count !== 1) return NextResponse.json({ error: 'Mẫu vừa thay đổi hoặc đã bị xóa. Hãy tải lại.' }, { status: 409 })
    return NextResponse.json({ success: true, deleted: id, affects })
  } catch (error) { return failure(error) }
}
