import { NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { Role } from "@prisma/client"

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userRole = session.user.role as Role
    const userId = session.user.id

    let vouchers
    if (userRole === Role.ADMIN) {
      vouchers = await prisma.voucher.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          awardedCourses: {
            include: { course: { select: { id: true, id_khoa: true, name_lop: true, teacherId: true } } }
          },
          acceptedCourses: {
            include: { course: { select: { id: true, id_khoa: true, name_lop: true, teacherId: true } } }
          }
        }
      })
    } else if (userRole === Role.TEACHER) {
      const teacherCourses = await prisma.course.findMany({
        where: { teacherId: Number(userId) },
        select: { id: true }
      })
      const courseIds = teacherCourses.map(c => c.id)

      const voucherIds = await prisma.courseVoucherAward.findMany({
        where: { courseId: { in: courseIds } },
        select: { voucherId: true }
      })
      const acceptedVoucherIds = await prisma.courseAcceptedVoucher.findMany({
        where: { courseId: { in: courseIds } },
        select: { voucherId: true }
      })
      const allVoucherIds = [...voucherIds, ...acceptedVoucherIds].map(v => v.voucherId)
      const uniqueVoucherIds = [...new Set(allVoucherIds)]

      vouchers = await prisma.voucher.findMany({
        where: { id: { in: uniqueVoucherIds } },
        orderBy: { createdAt: 'desc' }
      })
    } else {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    return NextResponse.json({ vouchers })
  } catch (error: any) {
    console.error('GET /api/vouchers error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userRole = session.user.role as Role
    if (userRole !== Role.ADMIN) {
      return NextResponse.json({ error: "Forbidden: Admin only" }, { status: 403 })
    }

    const body = await req.json()
    const { code, name, type, value, durationDays, description } = body

    if (!code || !name || !type) {
      return NextResponse.json({ error: "Missing required fields: code, name, type" }, { status: 400 })
    }

    const existing = await prisma.voucher.findUnique({ where: { code } })
    if (existing) {
      return NextResponse.json({ error: "Voucher code already exists" }, { status: 409 })
    }

    const voucher = await prisma.voucher.create({
      data: {
        code,
        name,
        type: type as 'VIP' | 'ALL' | 'CASH',
        value: value || 0,
        durationDays: durationDays || null,
        description: description || null,
        isActive: true
      }
    })

    return NextResponse.json({ success: true, voucher })
  } catch (error: any) {
    console.error('POST /api/vouchers error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userRole = session.user.role as Role
    if (userRole !== Role.ADMIN) {
      return NextResponse.json({ error: "Forbidden: Admin only" }, { status: 403 })
    }

    const { id } = await req.json()
    if (!id) {
      return NextResponse.json({ error: "Missing voucher id" }, { status: 400 })
    }

    const voucher = await prisma.voucher.findUnique({ where: { id: Number(id) } })
    if (!voucher) {
      return NextResponse.json({ error: "Voucher not found" }, { status: 404 })
    }

    // Check: không xóa nếu đang được dùng bởi course
    const usedInCourse = await prisma.courseVoucherAward.count({
      where: { voucherId: voucher.id }
    })
    const usedInAccepted = await prisma.courseAcceptedVoucher.count({
      where: { voucherId: voucher.id }
    })
    if (usedInCourse > 0 || usedInAccepted > 0) {
      return NextResponse.json({ 
        error: "Không thể xóa: Voucher đang được sử dụng trong khóa học",
        usedInCourse,
        usedInAccepted
      }, { status: 409 })
    }

    await prisma.voucher.delete({ where: { id: voucher.id } })

    return NextResponse.json({ success: true, deletedId: voucher.id })
  } catch (error: any) {
    console.error('DELETE /api/vouchers error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
