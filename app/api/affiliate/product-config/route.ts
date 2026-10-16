import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { requireDomainModule } from '@/lib/website/domain-context'

/**
 * Cấu hình hoa hồng affiliate theo từng khóa học/sản phẩm (Affiliate v2).
 * - ADMIN: xem/sửa tất cả.
 * - TEACHER: chỉ xem/sửa khóa học của mình (course.teacherId).
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
    select: { id: true, id_khoa: true, name_lop: true, name_khoa: true, phi_coc: true, teacherId: true },
    orderBy: { id: 'desc' },
    take: 300
  })

  const configs = await prisma.productAffiliateConfig.findMany({
    where: { productType: 'COURSE', productId: { in: courses.map(c => c.id) } }
  })
  const configMap = new Map(configs.map(c => [c.productId, c]))

  return NextResponse.json({
    role,
    courses: courses.map(c => ({
      id: c.id,
      id_khoa: c.id_khoa,
      name: c.name_khoa || c.name_lop,
      listedPrice: c.phi_coc,
      teacherId: c.teacherId,
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

  if (!productId || !Number.isFinite(directRate) || directRate < 0 || directRate > 100) {
    return NextResponse.json({ error: 'Dữ liệu không hợp lệ (tỷ lệ 0–100%)' }, { status: 400 })
  }
  if (!['COURSE', 'PRODUCT', 'SERVICE'].includes(productType)) {
    return NextResponse.json({ error: 'Loại sản phẩm không hợp lệ' }, { status: 400 })
  }

  // TEACHER chỉ được sửa khóa học của mình
  if (role === 'TEACHER') {
    if (productType !== 'COURSE') {
      return NextResponse.json({ error: 'Bạn chỉ được cấu hình khóa học của mình' }, { status: 403 })
    }
    const course = await prisma.course.findUnique({ where: { id: productId }, select: { teacherId: true } })
    if (!course || course.teacherId !== userId) {
      return NextResponse.json({ error: 'Bạn chỉ được cấu hình khóa học của mình' }, { status: 403 })
    }
  }

  const config = await prisma.productAffiliateConfig.upsert({
    where: { productType_productId: { productType: productType as any, productId } },
    update: { directRate, isActive, createdBy: userId },
    create: { productType: productType as any, productId, directRate, isActive, createdBy: userId }
  })

  return NextResponse.json({ success: true, config })
}
