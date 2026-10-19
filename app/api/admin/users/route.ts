import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { auth } from '@/auth'
import { requireAdmin } from '@/lib/api-auth'
import prisma from '@/lib/prisma'
import { createUserWithAvailableIdInTransaction } from '@/lib/id-helper'
import { normalizePhone, getAllPhoneVariants } from '@/lib/phone-utils'
import { validatePasswordStrength } from '@/lib/password-policy'
import { logActivity } from '@/lib/activity-logger'

const fields = z.object({
  name: z.string().trim().min(2).max(150),
  email: z.string().trim().email().max(254).transform(value => value.toLowerCase()),
  phone: z.string().trim().max(30).default(''),
  password: z.string().max(72).refine(value => !validatePasswordStrength(value), 'Mật khẩu cần ít nhất 10 ký tự'),
  role: z.enum(['STUDENT', 'TEACHER']),
}).strict()

export async function POST(request: Request) {
  const denied = await requireAdmin()
  if (denied) return denied
  const parsed = fields.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Thông tin không hợp lệ.' }, { status: 400 })
  const { name, email, password, role } = parsed.data
  const phone = normalizePhone(parsed.data.phone)
  if (parsed.data.phone && !phone) return NextResponse.json({ error: 'Số điện thoại không hợp lệ.' }, { status: 400 })
  // bcrypt chỉ xử lý 72 byte đầu tiên, kể cả với mật khẩu Unicode.
  if (Buffer.byteLength(password, 'utf8') > 72) return NextResponse.json({ error: 'Mật khẩu tối đa 72 byte.' }, { status: 400 })
  try {
    const hash = await bcrypt.hash(password, 12)
    const user = await prisma.$transaction(async tx => {
      // Đồng bộ cả kiểm tra trùng email khác kiểu chữ với các luồng tạo tài khoản.
      await tx.$executeRaw(Prisma.sql`LOCK TABLE public."User" IN SHARE ROW EXCLUSIVE MODE`)
      const existing = await tx.user.findFirst({ where: { OR: [
        { email: { equals: email, mode: 'insensitive' } },
        ...(phone ? [{ phone: { in: getAllPhoneVariants(phone) } }] : []),
      ] }, select: { id: true } })
      if (existing) throw new Error('DUPLICATE')
      // Cùng bộ cấp mã với đăng ký thường; không tiêu thụ mã giữ chỗ.
      const created = await createUserWithAvailableIdInTransaction(tx, {
        name, email, phone, password: hash, role, referrerId: null,
        passwordChanged: true,
      })
      await tx.userClosure.create({ data: { ancestorId: created.id, descendantId: created.id, depth: 0 } })
      return { id: created.id, name: created.name, email: created.email, role: created.role }
    }, { timeout: 15000 })
    const session = await auth()
    await logActivity({ userId: Number(session!.user!.id), action: 'REGISTER', detail: `Admin tạo tài khoản #${user.id}`, metadata: { createdUserId: user.id, role } })
    return NextResponse.json({ user, message: 'Đã tạo tài khoản. Người dùng có thể đăng nhập và đổi mật khẩu trong Cài đặt tài khoản. Email chưa được xác minh.' }, { status: 201 })
  } catch (error) {
    if ((error instanceof Error && error.message === 'DUPLICATE') || (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')) return NextResponse.json({ error: 'Email hoặc số điện thoại đã được sử dụng.' }, { status: 409 })
    console.error('[Admin create user]', error)
    return NextResponse.json({ error: 'Không thể tạo tài khoản. Vui lòng thử lại.' }, { status: 500 })
  }
}
