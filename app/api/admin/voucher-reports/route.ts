import { NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { Role } from "@prisma/client"

/**
 * GET /api/admin/voucher-reports
 * Báo cáo voucher/MBV có bộ lọc tùy chọn: voucherId | courseId | userId | dateFrom | dateTo
 * - Quà tặng đã phát/dùng (UserVoucher)
 * - Thanh toán có áp voucher/MBV (Payment.voucherId, discountAmount, mbvDeducted)
 * - Luồng MBV cộng/trừ (BrkTransaction)
 * - Đối soát: giá niêm yết vs thực thu
 */
export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const role = session.user.role as Role
    if (role !== Role.ADMIN && role !== Role.TEACHER) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const voucherId = searchParams.get("voucherId")
    const courseId = searchParams.get("courseId")
    const userId = searchParams.get("userId")
    const dateFrom = searchParams.get("dateFrom")
    const dateTo = searchParams.get("dateTo")

    const dateFilter: any = {}
    if (dateFrom) dateFilter.gte = new Date(dateFrom)
    if (dateTo) {
      const end = new Date(dateTo)
      end.setHours(23, 59, 59, 999)
      dateFilter.lte = end
    }
    const hasDate = !!(dateFrom || dateTo)

    // 1. Quà tặng voucher: đã phát / đã dùng
    const uvWhere: any = {}
    if (voucherId) uvWhere.voucherId = Number(voucherId)
    if (userId) uvWhere.userId = Number(userId)
    if (hasDate) uvWhere.createdAt = dateFilter
    const userVouchers = await prisma.userVoucher.findMany({
      where: uvWhere,
      include: {
        voucher: { select: { id: true, code: true, name: true, type: true } },
        user: { select: { id: true, name: true, email: true, phone: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 500
    })

    // 2. Thanh toán có áp voucher / MBV
    const payWhere: any = {}
    if (voucherId) payWhere.voucherId = Number(voucherId)
    if (hasDate) payWhere.createdAt = dateFilter
    if (userId || courseId) {
      payWhere.enrollment = {}
      if (userId) payWhere.enrollment.userId = Number(userId)
      if (courseId) payWhere.enrollment.courseId = Number(courseId)
    }
    const payments = await prisma.payment.findMany({
      where: {
        ...payWhere,
        OR: [
          { voucherId: { not: null } },
          { discountAmount: { gt: 0 } },
          { mbvDeducted: { gt: 0 } }
        ]
      },
      include: {
        voucher: { select: { id: true, code: true, name: true } },
        enrollment: {
          select: {
            id: true,
            phi_coc: true,
            status: true,
            user: { select: { id: true, name: true, email: true, phone: true } },
            course: { select: { id: true, id_khoa: true, name_lop: true, phi_coc: true } }
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 500
    })

    // 3. Luồng MBV: cộng (MBV_CREDIT) / trừ khi mua khóa (ADJUSTMENT refId course_*)
    const wallets = userId
      ? await prisma.brkWallet.findMany({ where: { userId: Number(userId) }, select: { id: true } })
      : []
    const txWhere: any = {
      balanceType: "MBV",
      OR: [{ type: "MBV_CREDIT" }, { refId: { startsWith: "course_" } }]
    }
    if (hasDate) txWhere.createdAt = dateFilter
    if (userId) txWhere.walletId = { in: wallets.map(w => w.id) }
    const mbvTx = await prisma.brkTransaction.findMany({
      where: txWhere,
      include: { wallet: { select: { user: { select: { id: true, name: true, email: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 500
    })

    // 4. Tổng hợp đối soát
    const totalListed = payments.reduce((s, p) => s + (p.enrollment?.course?.phi_coc || 0), 0)
    const totalDiscount = payments.reduce((s, p) => s + (p.discountAmount || 0), 0)
    const totalMbvDeducted = payments.reduce((s, p) => s + (p.mbvDeducted || 0), 0)
    const totalActual = payments.reduce((s, p) => s + (p.amount || 0), 0)
    const mbvCredited = mbvTx.filter(t => Number(t.amount) > 0).reduce((s, t) => s + Number(t.amount), 0)
    const mbvSpent = mbvTx.filter(t => Number(t.amount) < 0).reduce((s, t) => s + Math.abs(Number(t.amount)), 0)

    return NextResponse.json({
      filters: { voucherId, courseId, userId, dateFrom, dateTo },
      summary: {
        vouchersGranted: userVouchers.length,
        vouchersUsed: userVouchers.filter(v => v.status === "USED").length,
        paymentsWithBenefit: payments.length,
        totalListed,
        totalDiscount,
        totalMbvDeducted,
        totalActual,
        mbvCredited,
        mbvSpent
      },
      userVouchers: userVouchers.map(uv => ({
        id: uv.id,
        status: uv.status,
        createdAt: uv.createdAt,
        usedAt: uv.usedAt,
        expiresAt: uv.expiresAt,
        usedForCourseId: uv.usedForCourseId,
        awardedFromCourseId: uv.awardedFromCourseId,
        voucher: uv.voucher,
        user: uv.user
      })),
      payments: payments.map(p => ({
        id: p.id,
        amount: p.amount,
        status: p.status,
        createdAt: p.createdAt,
        voucherId: p.voucherId,
        voucher: p.voucher,
        discountAmount: p.discountAmount,
        mbvDeducted: p.mbvDeducted,
        enrollment: p.enrollment
      })),
      mbvTransactions: mbvTx.map(t => ({
        id: t.id,
        amount: Number(t.amount),
        type: t.type,
        description: t.description,
        refId: t.refId,
        createdAt: t.createdAt,
        user: (t as any).wallet?.user
      }))
    })
  } catch (error: any) {
    console.error("GET /api/admin/voucher-reports error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
