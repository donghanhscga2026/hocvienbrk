import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import prisma from '@/lib/prisma'
import { courseEditorActor } from '@/lib/course-page/permissions'
import { teacherProfileKey, teacherProfileSchema } from '@/lib/wi300/teacher-profile'

async function target(request: Request) {
  const actor = await courseEditorActor()
  const raw = new URL(request.url).searchParams.get('teacher')
  const id = raw == null ? actor.id : Number(raw)
  if (!Number.isSafeInteger(id) || id < 0 || (id !== actor.id && actor.role !== 'ADMIN')) throw new Error('Không có quyền sửa hồ sơ này.')
  return id
}
export async function GET(request: Request) {
  try {
    const id = await target(request)
    const [user, row] = await Promise.all([prisma.user.findUnique({ where: { id }, select: { name: true, image: true } }), prisma.systemConfig.findUnique({ where: { key: teacherProfileKey(id) } })])
    if (!user) return NextResponse.json({ error: 'Không tìm thấy giảng viên.' }, { status: 404 })
    const parsed = teacherProfileSchema.safeParse(row?.value || {})
    return NextResponse.json({ id, user, profile: parsed.success ? parsed.data : teacherProfileSchema.parse({}) }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch { return NextResponse.json({ error: 'Không có quyền xem hồ sơ.' }, { status: 403 }) }
}
export async function PUT(request: Request) {
  try {
    if (request.headers.get('origin') !== new URL(request.url).origin) return NextResponse.json({ error: 'Nguồn yêu cầu không hợp lệ.' }, { status: 403 })
    const id = await target(request)
    const text = await request.text()
    if (text.length > 12000) return NextResponse.json({ error: 'Hồ sơ quá dài.' }, { status: 413 })
    const profile = teacherProfileSchema.parse(JSON.parse(text))
    if (!await prisma.user.findUnique({ where: { id }, select: { id: true } })) return NextResponse.json({ error: 'Không tìm thấy giảng viên.' }, { status: 404 })
    const key = teacherProfileKey(id)
    await prisma.systemConfig.upsert({ where: { key }, create: { key, value: profile }, update: { value: profile } })
    revalidatePath(`/giang-vien/${id}`)
    return NextResponse.json({ success: true })
  } catch { return NextResponse.json({ error: 'Không lưu được hồ sơ. Kiểm tra quyền và nội dung.' }, { status: 400 }) }
}
