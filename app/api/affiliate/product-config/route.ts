import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { requireDomainModule } from '@/lib/website/domain-context'
import {
  MIN_DIRECT_RATE,
  parseStartDate,
  isCourseLocked,
  formatDateVN
} from "@/lib/affiliate/config-rules"

/**
 * Cấu hình hoa hồng affiliate theo từng khóa học/sản phẩm (Affiliate v2).
 * - ADMIN: xem/sửa tất cả.
 * - TEACHER: chỉ xem/sửa khóa học của mình (course.teacherId).
 *
 * Quy tắc (lib/affiliate/config-rules.ts, chốt 2026-10-22):
 * - Hoa hồng trực tiếp tối thiểu 10% (cả ADMIN và TEACHER).
 * - Hoa hồng gián tiếp (tri ân) cố định 2% ở cấp hệ thống — không theo khóa.
 * - TEACHER bị khóa chỉnh sửa khi khóa học đã khai giảng.
 */
async function checkAccess() {
  await requireDomainModule('affiliate')
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorized', status: 401 as const }
  const userId = Number(session.user.id)
  const role = session.user.role
  if (role !== 'ADMIN' && role !== 'TEACHER') {
    return { error: 'Forbidden', status: 403 as const }
  }
  return { userId, role }
}

export async function GET() {
  const access: any = await checkAccess()
  if (access.error) return NextResponse.json({ error: access.error }, { status: access.status })

  const { userId, role } = access
  const courseWhere: any = {}
  if (role === 'TEACHER') courseWhere.teacherId = userId

  const courses = await prisma.course.findMany({
    where: courseWhere,
    select: { id: true, id_khoa: true, name_lop: true, name_khoa: true, phi_coc: true, teacherId: true, date_join: true },
    orderBy: { id: 'desc' },
    take: 300
  })

  const configs = await prisma.productAffiliateConfig.findMany({
    where: { productType: 'COURSE', productId: { in: courses.map(c => c.id) } }
  })
  const configMap = new Map(configs.map(c => [c.productId, c]))

  return NextResponse.json({
    role,
    minDirectRate: MIN_DIRECT_RATE,
    courses: courses.map(c => ({
      id: c.id,
      id_khoa: c.id_khoa,
      name: c.name_khoa || c.name_lop,
      listedPrice: c.phi_coc,
      teacherId: c.teacherId,
      startDate: parseStartDate(c.date_join),
      locked: role === 'TEACHER' && isCourseLocked(c.date_join),
      config: configMap.get(c.id) || null
    }))
  })
}

export async function POST(request: NextRequest) {
  const access: any = await checkAccess()
  if (access.error) return NextResponse.json({ error: access.error }, { status: access.status })

  const { userId, role } = access
  let body: { productType?: string; productId?: number; directRate?: number; isActive?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body không hợp lệ' }, { status: 400 })
  }

  const productType = (body.productType || 'COURSE').toString()
  const productId = Number(body.productId)
  const directRate = Number(body.directRate)
  const isActive = body.isActive !== false

  if (!productId || !Number.isFinite(directRate) || directRate < MIN_DIRECT_RATE || directRate > 100) {
    return NextResponse.json(
      { error: `Dữ liệu không hợp lệ (tỷ lệ hoa hồng trực tiếp phải từ ${MIN_DIRECT_RATE}% đến 100%)` },
      { status: 400 }
    )
  }
  if (!['COURSE', 'PRODUCT', 'SERVICE'].includes(productType)) {
    return NextResponse.json({ error: 'Loại sản phẩm không hợp lệ' }, { status: 400 })
  }

  // TEACHER chỉ được sửa khóa học của mình
  if (role === 'TEACHER') {
    if (productType !== 'COURSE') {
      return NextResponse.json({ error: 'Bạn chỉ được cấu hình khóa học của mình' }, { status: 403 })
    }
    const course = await prisma.course.findUnique({
      where: { id: productId },
      select: { teacherId: true, date_join: true }
    })
    if (!course || course.teacherId !== userId) {
      return NextResponse.json({ error: 'Bạn chỉ được cấu hình khóa học của mình' }, { status: 403 })
    }
    // Khóa chỉnh sửa khi khóa học đã khai giảng
    if (isCourseLocked(course.date_join)) {
      const start = parseStartDate(course.date_join)
      return NextResponse.json(
        { error: `Khóa học đã khai giảng${start ? ` ngày ${formatDateVN(start)}` : ''} — cấu hình hoa hồng đã bị khóa, không thể điều chỉnh` },
        { status: 403 }
      )
    }
  }

  const config = await prisma.productAffiliateConfig.upsert({
    where: { productType_productId: { productType: productType as any, productId } },
    update: { directRate, isActive, createdBy: userId },
    create: { productType: productType as any, productId, directRate, isActive, createdBy: userId }
  })

  return NextResponse.json({ success: true, config })
}
