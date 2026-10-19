import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { domainContext } from '@/lib/website/domain-context'

export const dynamic = 'force-dynamic'
const idSchema = z.string().uuid()
const removalSchema = z.object({ id: idSchema, execute: z.boolean().default(false), confirm: z.literal('DELETE_COURSE_HISTORY').optional() }).strict()
type Version = { id: string; coursePageId: string; name: string; versionNumber: number; createdAt: Date; kind: string | null; protected: boolean; live: boolean }
// Giữ bản cuối cùng để số phiên bản không bị tái sử dụng, và bản xuất bản mới nhất
// kể cả khi trang đang tắt: bật lại trang không được rơi về nội dung cũ hơn.
const hasNewer = Prisma.sql`EXISTS (SELECT 1 FROM public.course_page_versions n WHERE n.course_page_id=v.course_page_id AND n.version_number>v.version_number)`
const hasNewerPublished = Prisma.sql`EXISTS (SELECT 1 FROM public.course_page_versions n WHERE n.course_page_id=v.course_page_id AND n.snapshot->>'kind'='published' AND n.version_number>v.version_number)`
const protectedVersion = Prisma.sql`(NOT ${hasNewer} OR (v.snapshot->>'kind'='published' AND NOT ${hasNewerPublished}))`
const metadata = Prisma.sql`SELECT v.id, v.course_page_id AS "coursePageId", p.name, v.version_number AS "versionNumber", v.created_at AS "createdAt", v.snapshot->>'kind' AS kind,
  COALESCE(${protectedVersion},false) AS protected,
  COALESCE(p.status='published' AND p.use_template AND v.snapshot->>'kind'='published' AND NOT ${hasNewerPublished},false) AS live
  FROM public.course_page_versions v JOIN public.course_pages p ON p.id=v.course_page_id`

async function admin() {
  const session = await auth(), id = Number(session?.user?.id ?? NaN)
  if (!Number.isSafeInteger(id) || id < 0 || await domainContext()) return NextResponse.json({ error: 'Chỉ Admin được quản lý lịch sử tại hệ thống chính.' }, { status: 403 })
  const actor = await prisma.user.findUnique({ where: { id }, select: { role: true } })
  return actor?.role === 'ADMIN' ? null : NextResponse.json({ error: 'Chỉ Admin được quản lý lịch sử.' }, { status: 403 })
}
function failure(error: unknown) {
  console.error('[Course history]', error instanceof Error ? error.message : 'Unknown error')
  return NextResponse.json({ error: 'Chưa xử lý được lịch sử. Hãy tải lại để kiểm tra trước khi thử lại.' }, { status: 503 })
}
export async function GET(request: Request) {
  try {
    const denied = await admin(); if (denied) return denied
    const params = new URL(request.url).searchParams, id = params.get('id'), page = Number(params.get('page') || 0)
    if (id && !idSchema.safeParse(id).success || !Number.isSafeInteger(page) || page < 0 || page > 10000) return NextResponse.json({ error: 'Yêu cầu không hợp lệ.' }, { status: 400 })
    const q = (params.get('q') || '').trim().slice(0, 200)
    const where = id ? Prisma.sql`v.id=${id}` : Prisma.sql`position(lower(${q}) in lower(p.name))>0`
    const items = await prisma.$queryRaw<Version[]>(Prisma.sql`${metadata} WHERE ${where} ORDER BY v.created_at DESC,v.id ASC LIMIT 31 OFFSET ${page * 30}`)
    return NextResponse.json({ items: items.slice(0, 30), hasMore: items.length > 30 }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return failure(error) }
}
export async function DELETE(request: Request) {
  try {
    const denied = await admin(); if (denied) return denied
    const parsed = removalSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: 'Yêu cầu xóa lịch sử không hợp lệ.' }, { status: 400 })
    const { id, execute, confirm } = parsed.data
    if (execute && confirm !== 'DELETE_COURSE_HISTORY') return NextResponse.json({ error: 'Cần xác nhận xóa lịch sử.' }, { status: 400 })
    const [version] = await prisma.$queryRaw<Version[]>(Prisma.sql`${metadata} WHERE v.id=${id}`)
    if (!version) return NextResponse.json({ error: 'Phiên bản không còn trong lịch sử.' }, { status: 404 })
    if (version.protected) return NextResponse.json({ error: 'Giữ lại bản lưu mới nhất và bản xuất bản mới nhất của mỗi trang.' }, { status: 409 })
    const affects = { versions: 1, coursePages: 0, mediaFiles: 0 }
    if (!execute) return NextResponse.json({ dryRun: true, version, affects })
    // Kiểm tra lại trong chính câu DELETE, không dựa vào kết quả xem trước trên client.
    const removed = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`DELETE FROM public.course_page_versions v WHERE v.id=${id} AND NOT COALESCE(${protectedVersion},false) RETURNING v.id`)
    if (removed.length !== 1) return NextResponse.json({ error: 'Lịch sử vừa thay đổi. Hãy tải lại trước khi xóa.' }, { status: 409 })
    return NextResponse.json({ success: true, deleted: id, affects })
  } catch (error) { return failure(error) }
}
