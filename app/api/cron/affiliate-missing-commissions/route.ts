import { NextResponse } from "next/server"
import { withCronLogging } from "@/lib/cron-logger"
import prisma from "@/lib/prisma"
import { sendTelegram } from "@/lib/notifications"

/**
 * Quét tuần affiliate (Gói 2, 25/10/2026): tìm đơn PAID trong 7 ngày qua
 * KHÔNG sinh hoa hồng mà không thuộc lý do hợp lệ, báo admin qua Telegram.
 *
 * Lý do hợp lệ (không báo):
 * - Đơn không có người giới thiệu nào (khách tự mua, không qua link).
 * - Đơn không có khóa tính phí nào (không có item khóa, hoặc mọi khóa
 *   trong đơn đều miễn phí — giá niêm yết phi_coc = 0 thì hoa hồng = 0).
 * - Người hưởng tiềm năng chính là giảng viên của khóa — luật loại trừ
 *   giảng viên tự quảng bá khóa mình (chốt 20/10/2026).
 *
 * Bất thường (có báo):
 * - Khóa chưa có cấu hình affiliate đang bật → CTV mất hoa hồng trực tiếp.
 * - Có conversion nhưng 0 dòng hoa hồng dù có người hưởng hợp lệ.
 * - Không thuộc các trường hợp trên mà vẫn không có hoa hồng.
 *
 * Chạy bằng cron GitHub Actions mỗi sáng thứ Hai (cron-jobs.yml).
 */
async function handler(request: Request) {
  try {
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET?.trim()}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const since = new Date(Date.now() - 7 * 24 * 3600 * 1000)
    const orders = await prisma.order.findMany({
      where: { status: "PAID", paidAt: { gte: since } },
      include: {
        buyer: { select: { referrerId: true } },
        items: { select: { productType: true, productId: true } },
        conversions: {
          select: { id: true, _count: { select: { commissions: true } } },
        },
      },
    })

    // Tra cứu giảng viên + cấu hình cho mọi khóa xuất hiện trong đơn
    const courseIds = new Set<number>()
    for (const o of orders) {
      for (const it of o.items) {
        if (it.productType === "COURSE") courseIds.add(it.productId)
      }
    }
    const courses = courseIds.size
      ? await prisma.course.findMany({
          where: { id: { in: [...courseIds] } },
          select: { id: true, teacherId: true, phi_coc: true },
        })
      : []
    const teacherOf = new Map(courses.map((c) => [c.id, c.teacherId]))
    const priceOf = new Map(courses.map((c) => [c.id, c.phi_coc ?? 0]))
    const configs = courseIds.size
      ? await prisma.productAffiliateConfig.findMany({
          where: { productType: "COURSE", productId: { in: [...courseIds] }, isActive: true },
          select: { productId: true },
        })
      : []
    const configured = new Set(configs.map((c) => c.productId))

    let ok = 0
    let teacherSelf = 0
    const missingConfig: number[] = []
    const conversionNoLines: number[] = []
    const unexplained: number[] = []

    for (const o of orders) {
      const earners = [o.affiliateId, o.buyer?.referrerId].filter(
        (v): v is number => typeof v === "number"
      )
      const courseItems = o.items.filter((i) => i.productType === "COURSE")
      // Chỉ khóa có giá niêm yết > 0 mới phát sinh hoa hồng
      const payableItems = courseItems.filter((ci) => (priceOf.get(ci.productId) ?? 0) > 0)
      if (payableItems.length === 0) {
        ok++
        continue
      }

      if (o.conversions.length > 0) {
        const hasLines = o.conversions.some((cv) => cv._count.commissions > 0)
        if (hasLines || earners.length === 0) {
          ok++
          continue
        }
        // Có conversion mà 0 dòng: hợp lệ chỉ khi mọi người hưởng đều là
        // giảng viên của khóa trong đơn.
        const allSelf = payableItems.every((ci) =>
          earners.every((e) => e === teacherOf.get(ci.productId))
        )
        if (allSelf) teacherSelf++
        else conversionNoLines.push(o.id)
        continue
      }

      // Không có conversion nào
      if (earners.length === 0) {
        ok++
        continue
      }
      let isSelf = true
      let lacksConfig = false
      for (const ci of payableItems) {
        const teacherId = teacherOf.get(ci.productId)
        for (const e of earners) {
          if (e !== teacherId) {
            isSelf = false
            if (!configured.has(ci.productId)) lacksConfig = true
          }
        }
      }
      if (isSelf) teacherSelf++
      else if (lacksConfig) missingConfig.push(o.id)
      else unexplained.push(o.id)
    }

    const flagged = missingConfig.length + conversionNoLines.length + unexplained.length
    if (flagged > 0) {
      const lines = [
        "⚠️ Quét tuần affiliate: phát hiện đơn không sinh hoa hồng bất thường",
        `• Tổng đơn PAID 7 ngày: ${orders.length} (bình thường ${ok}, giảng viên tự bán ${teacherSelf})`,
      ]
      if (missingConfig.length)
        lines.push(`• Khóa chưa có cấu hình HH: đơn ${missingConfig.slice(0, 15).map((i) => `#${i}`).join(", ")}`)
      if (conversionNoLines.length)
        lines.push(`• Có conversion nhưng 0 dòng hoa hồng: đơn ${conversionNoLines.slice(0, 15).map((i) => `#${i}`).join(", ")}`)
      if (unexplained.length)
        lines.push(`• Chưa rõ nguyên nhân: đơn ${unexplained.slice(0, 15).map((i) => `#${i}`).join(", ")}`)
      try {
        await sendTelegram(lines.join("\n"), "CRON_LOG")
      } catch (tgErr) {
        console.error("[AffiliateWeeklyCheck] Telegram failed:", tgErr)
      }
    }

    return NextResponse.json({
      success: true,
      scanned: orders.length,
      ok,
      teacherSelf,
      missingConfig,
      conversionNoLines,
      unexplained,
    })
  } catch (error) {
    console.error("[AffiliateWeeklyCheck] error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

export const POST = withCronLogging("affiliate-missing-commissions", handler)
