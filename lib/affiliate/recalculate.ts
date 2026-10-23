import prisma from "@/lib/prisma"
import { logActivity } from "@/lib/activity-logger"

/**
 * CHẠY LẠI hoa hồng cho một khóa học (recalculate) — theo yêu cầu vận hành
 * giai đoạn test (2026-10-23): khi giảng viên/admin đổi cấu hình hoa hồng,
 * bấm nút này để tính lại toàn bộ giao dịch cũ của khóa theo cấu hình
 * HIỆN TẠI thay vì phải chạy script tay vào DB.
 *
 * Nguyên tắc an toàn:
 * - Luôn có bước XEM TRƯỚC (dryRun): chỉ tính chênh lệch, không ghi.
 * - Chỉ đụng vào dòng hoa hồng đang PENDING. Dòng đã chốt đối soát
 *   (AVAILABLE...) bỏ qua và báo cáo riêng; dòng đã thu hồi (CANCELLED)
 *   không bao giờ được hồi sinh.
 * - Mọi thay đổi đều cộng/trừ vào ví ghi nhận kèm log AffiliateTransaction
 *   và 1 dòng ActivityLog AFFILIATE_RERUN cho người bấm nút.
 * - Chạy lại lần 2 với cùng cấu hình cho chênh lệch 0 (idempotent).
 * - Đơn chứa nhiều khóa học khác nhau bị bỏ qua (ngoài phạm vi khóa này);
 *   thực tế hiện tại mọi đơn đều chỉ có 1 khóa học.
 *
 * Luật tính khớp lib/affiliate/unified-commission.ts: trực tiếp theo
 * ProductAffiliateConfig của khóa (giảm 50% nếu CTV chưa mua khóa),
 * tri ân = SystemAffiliateConfig.gratitudeRate cho user.referrerId của
 * người mua, loại trừ giảng viên tự quảng bá khóa của mình ở cả 2 loại,
 * hoa hồng tính trên giá niêm yết (unitPrice x quantity của OrderItem).
 */

export interface RerunChange {
  orderId: number
  kind: string
  affiliateId: number
  action: 'CREATE' | 'ADJUST' | 'REMOVE' | 'SKIP_SETTLED' | 'SKIP_CANCELLED'
  oldAmount?: number
  newAmount?: number
  percentage?: number
}

export interface RerunReport {
  courseId: number
  dryRun: boolean
  ordersScanned: number
  ordersSkippedMultiCourse: number
  created: number
  createdAmount: number
  adjusted: number
  adjustedDelta: number
  removed: number
  removedAmount: number
  skippedSettled: number
  skippedCancelled: number
  netDelta: number
  changes: RerunChange[]
}

interface ExpectedLine {
  kind: 'DIRECT' | 'GRATITUDE'
  affiliateId: number
  percentage: number
  gross: number
  tax: number
  net: number
}

const CHANGE_CAP = 200

export async function recalculateCourseCommissions(opts: {
  courseId: number
  dryRun: boolean
  actorId: number
}): Promise<RerunReport> {
  const { courseId, dryRun, actorId } = opts

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, teacherId: true }
  })
  if (!course) throw new Error(`Không tìm thấy khóa học #${courseId}`)

  const config = await prisma.productAffiliateConfig.findUnique({
    where: { productType_productId: { productType: 'COURSE', productId: courseId } }
  })
  const sysCfg = await prisma.systemAffiliateConfig.findUnique({ where: { id: 1 } })
  const gratitudeRate = sysCfg?.gratitudeRate ?? 2
  const taxRate = sysCfg?.taxRate ?? 0
  const pendingDays = sysCfg?.pendingDays ?? 30

  const orders = await prisma.order.findMany({
    where: {
      status: 'PAID',
      items: { some: { productType: 'COURSE', productId: courseId } }
    },
    include: {
      items: true,
      buyer: { select: { id: true, referrerId: true } }
    },
    orderBy: { id: 'asc' }
  })

  // Giảng viên của mọi khóa xuất hiện trong các đơn (cho luật loại trừ tri ân)
  const allCourseIds = new Set<number>()
  for (const o of orders) for (const it of o.items) if (it.productType === 'COURSE') allCourseIds.add(it.productId)
  const courses = allCourseIds.size
    ? await prisma.course.findMany({ where: { id: { in: [...allCourseIds] } }, select: { id: true, teacherId: true } })
    : []
  const teacherOf = new Map(courses.map(cs => [cs.id, cs.teacherId]))
  const isTeacher = (uid: number | null | undefined, type: string, pid: number) =>
    type === 'COURSE' && uid != null && teacherOf.get(pid) === uid

  // CTV đã mua khóa này (ACTIVE enrollment) — quyết định luật giảm 50%
  const affiliateIds = [...new Set(orders.map(o => o.affiliateId).filter((x): x is number => !!x))]
  const purchased = affiliateIds.length
    ? await prisma.enrollment.findMany({
        where: { userId: { in: affiliateIds }, courseId, status: 'ACTIVE' },
        select: { userId: true }
      })
    : []
  const purchasedSet = new Set(purchased.map(e => e.userId))

  const campaign = await prisma.affiliateCampaign.findFirst({
    where: { slug: 'default', isActive: true },
    select: { id: true }
  })

  const report: RerunReport = {
    courseId,
    dryRun,
    ordersScanned: 0,
    ordersSkippedMultiCourse: 0,
    created: 0,
    createdAmount: 0,
    adjusted: 0,
    adjustedDelta: 0,
    removed: 0,
    removedAmount: 0,
    skippedSettled: 0,
    skippedCancelled: 0,
    netDelta: 0,
    changes: []
  }
  const pushChange = (ch: RerunChange) => {
    if (report.changes.length < CHANGE_CAP) report.changes.push(ch)
  }

  function expectedLines(o: (typeof orders)[number]): ExpectedLine[] {
    const lines: ExpectedLine[] = []
    // TRỰC TIẾP — chỉ các item thuộc khóa đang chạy lại
    if (o.affiliateId) {
      for (const it of o.items) {
        if (it.productType !== 'COURSE' || it.productId !== courseId) continue
        if (!config || !config.isActive) continue
        if (isTeacher(o.affiliateId, it.productType, it.productId)) continue
        let rate = config.directRate
        if (!purchasedSet.has(o.affiliateId)) rate = rate * 0.5
        const gross = Math.floor(it.unitPrice * it.quantity * (rate / 100))
        const tax = Math.floor(gross * (taxRate / 100))
        const net = gross - tax
        if (net > 0) lines.push({ kind: 'DIRECT', affiliateId: o.affiliateId, percentage: rate, gross, tax, net })
      }
    }
    // TRI ÂN — trên toàn bộ đơn (khớp engine), loại trừ item mà người được
    // tri ân là giảng viên
    const ref = o.buyer?.referrerId
    if (ref) {
      let base = 0
      for (const it of o.items) {
        if (isTeacher(ref, it.productType, it.productId)) continue
        base += it.unitPrice * it.quantity
      }
      if (base > 0) {
        const gross = Math.floor(base * (gratitudeRate / 100))
        const tax = Math.floor(gross * (taxRate / 100))
        const net = gross - tax
        if (net > 0) lines.push({ kind: 'GRATITUDE', affiliateId: ref, percentage: gratitudeRate, gross, tax, net })
      }
    }
    return lines
  }

  async function creditWallet(
    tx: any,
    userId: number,
    delta: number,
    type: 'COMMISSION' | 'ADJUSTMENT',
    description: string,
    refId: number | null
  ) {
    let wallet = await tx.affiliateWallet.findUnique({ where: { userId } })
    if (!wallet) {
      wallet = await tx.affiliateWallet.create({
        data: { userId, points: 0, balance: 0, pendingBalance: 0, totalEarned: 0, totalPaid: 0 }
      })
    }
    const before = wallet.pendingBalance
    const after = before + delta
    await tx.affiliateWallet.update({ where: { id: wallet.id }, data: { pendingBalance: after } })
    await tx.affiliateTransaction.create({
      data: {
        walletId: wallet.id,
        amount: delta,
        type,
        description,
        refId,
        balanceBefore: before,
        balanceAfter: after,
        status: 'COMPLETED'
      }
    })
  }

  for (const o of orders) {
    // Ngoài phạm vi: đơn chứa sản phẩm/khóa khác ngoài khóa này
    const outOfScope = o.items.some(it => it.productType !== 'COURSE' || it.productId !== courseId)
    if (outOfScope) {
      report.ordersSkippedMultiCourse += 1
      continue
    }
    report.ordersScanned += 1

    const expected = expectedLines(o)

    // Các dòng hoa hồng hiện có của đơn (mọi đường liên kết)
    const enrollmentIds = o.items.map(i => i.enrollmentId).filter((x): x is number => x != null)
    const conversions = await prisma.affiliateConversion.findMany({
      where: {
        OR: [
          { orderRecordId: o.id },
          ...(enrollmentIds.length
            ? [{ enrollmentId: { in: enrollmentIds }, customerId: o.buyerId, orderRecordId: null }]
            : [])
        ]
      },
      orderBy: { id: 'asc' }
    })
    const existing = conversions.length
      ? await prisma.affiliateCommission.findMany({
          where: { conversionId: { in: conversions.map(cv => cv.id) } }
        })
      : []
    const keyOf = (kind: string, affiliateId: number) => `${kind}|${affiliateId}`
    const existingByKey = new Map<string, (typeof existing)[number]>()
    for (const cm of existing) {
      const k = keyOf(String(cm.kind), cm.affiliateId)
      if (!existingByKey.has(k)) existingByKey.set(k, cm)
    }
    const expectedKeys = new Set(expected.map(e => keyOf(e.kind, e.affiliateId)))

    // Tính chênh lệch của đơn này
    type PlanItem =
      | { type: 'CREATE'; exp: ExpectedLine }
      | { type: 'ADJUST'; exp: ExpectedLine; cm: (typeof existing)[number] }
      | { type: 'REMOVE'; cm: (typeof existing)[number] }
    const plan: PlanItem[] = []

    for (const exp of expected) {
      const cur = existingByKey.get(keyOf(exp.kind, exp.affiliateId))
      if (!cur) {
        plan.push({ type: 'CREATE', exp })
        report.created += 1
        report.createdAmount += exp.net
        pushChange({ orderId: o.id, kind: exp.kind, affiliateId: exp.affiliateId, action: 'CREATE', newAmount: exp.net, percentage: exp.percentage })
      } else if (cur.status === 'CANCELLED') {
        report.skippedCancelled += 1
        pushChange({ orderId: o.id, kind: exp.kind, affiliateId: exp.affiliateId, action: 'SKIP_CANCELLED', oldAmount: cur.netAmount })
      } else if (cur.status !== 'PENDING') {
        if (cur.netAmount !== exp.net || cur.percentage !== exp.percentage) {
          report.skippedSettled += 1
          pushChange({ orderId: o.id, kind: exp.kind, affiliateId: exp.affiliateId, action: 'SKIP_SETTLED', oldAmount: cur.netAmount, newAmount: exp.net })
        }
      } else if (cur.netAmount !== exp.net || cur.grossAmount !== exp.gross || cur.percentage !== exp.percentage) {
        plan.push({ type: 'ADJUST', exp, cm: cur })
        report.adjusted += 1
        report.adjustedDelta += exp.net - cur.netAmount
        pushChange({ orderId: o.id, kind: exp.kind, affiliateId: exp.affiliateId, action: 'ADJUST', oldAmount: cur.netAmount, newAmount: exp.net, percentage: exp.percentage })
      }
    }
    for (const cm of existing) {
      const k = keyOf(String(cm.kind), cm.affiliateId)
      if (expectedKeys.has(k)) continue
      if (cm.status === 'PENDING') {
        plan.push({ type: 'REMOVE', cm })
        report.removed += 1
        report.removedAmount += cm.netAmount
        pushChange({ orderId: o.id, kind: String(cm.kind), affiliateId: cm.affiliateId, action: 'REMOVE', oldAmount: cm.netAmount })
      } else if (cm.status !== 'CANCELLED') {
        report.skippedSettled += 1
        pushChange({ orderId: o.id, kind: String(cm.kind), affiliateId: cm.affiliateId, action: 'SKIP_SETTLED', oldAmount: cm.netAmount })
      }
    }

    if (dryRun || plan.length === 0) continue

    // ÁP DỤNG cho đơn này (1 transaction)
    await prisma.$transaction(async (tx) => {
      let targetConversion = conversions.find(cv => cv.orderRecordId === o.id) || null
      if (!targetConversion) {
        const tracking = conversions.find(cv => cv.orderRecordId == null)
        if (tracking) {
          await tx.affiliateConversion.update({
            where: { id: tracking.id },
            data: { orderRecordId: o.id }
          })
          targetConversion = tracking
        }
      }
      const paidAt = o.paidAt || o.createdAt
      const availableAt = new Date(new Date(paidAt).getTime() + pendingDays * 86400000)

      for (const item of plan) {
        if (item.type === 'CREATE') {
          if (!targetConversion) {
            if (!campaign) throw new Error('Không có campaign mặc định để tạo conversion')
            const primaryAffiliateId = o.affiliateId || item.exp.affiliateId
            let link = await tx.affiliateLink.findFirst({
              where: { userId: primaryAffiliateId, campaignId: campaign.id }
            })
            if (!link) {
              link = await tx.affiliateLink.create({
                data: {
                  userId: primaryAffiliateId,
                  campaignId: campaign.id,
                  code: `REF${primaryAffiliateId}`,
                  name: 'Auto-generated',
                  source: 'system',
                  isActive: true
                }
              })
            }
            targetConversion = await tx.affiliateConversion.create({
              data: {
                linkId: link.id,
                campaignId: campaign.id,
                customerId: o.buyerId,
                orderRecordId: o.id,
                orderId: `ORD-${o.id}-${Date.now()}`,
                orderAmount: o.totalAmount,
                productType: 'COURSE',
                status: 'PENDING',
                pendingUntil: availableAt
              }
            })
          }
          const created = await tx.affiliateCommission.create({
            data: {
              conversionId: targetConversion.id,
              affiliateId: item.exp.affiliateId,
              kind: item.exp.kind,
              level: item.exp.kind === 'DIRECT' ? 1 : 0,
              percentage: item.exp.percentage,
              grossAmount: item.exp.gross,
              taxAmount: item.exp.tax,
              feeAmount: 0,
              netAmount: item.exp.net,
              status: 'PENDING',
              availableAt
            }
          })
          await creditWallet(
            tx,
            item.exp.affiliateId,
            item.exp.net,
            'COMMISSION',
            `Hoa hồng ${item.exp.kind === 'DIRECT' ? 'trực tiếp' : 'tri ân'} đơn #${o.id} (chạy lại hoa hồng khóa #${courseId})`,
            created.id
          )
        } else if (item.type === 'ADJUST') {
          const delta = item.exp.net - item.cm.netAmount
          await tx.affiliateCommission.update({
            where: { id: item.cm.id },
            data: {
              percentage: item.exp.percentage,
              grossAmount: item.exp.gross,
              taxAmount: item.exp.tax,
              feeAmount: 0,
              netAmount: item.exp.net
            }
          })
          if (delta !== 0) {
            await creditWallet(
              tx,
              item.cm.affiliateId,
              delta,
              'ADJUSTMENT',
              `Điều chỉnh hoa hồng #${item.cm.id} đơn #${o.id} (chạy lại hoa hồng khóa #${courseId})`,
              item.cm.id
            )
          }
        } else if (item.type === 'REMOVE') {
          await tx.affiliateCommission.update({
            where: { id: item.cm.id },
            data: { status: 'CANCELLED' }
          })
          await creditWallet(
            tx,
            item.cm.affiliateId,
            -item.cm.netAmount,
            'ADJUSTMENT',
            `Hủy hoa hồng #${item.cm.id} đơn #${o.id} — không còn đúng theo cấu hình hiện tại (chạy lại hoa hồng khóa #${courseId})`,
            item.cm.id
          )
        }
      }
    })
  }

  report.netDelta = report.createdAmount + report.adjustedDelta - report.removedAmount

  if (!dryRun) {
    await logActivity({
      userId: actorId,
      action: 'AFFILIATE_RERUN',
      detail:
        `Chạy lại hoa hồng khóa #${courseId}: quét ${report.ordersScanned} đơn, ` +
        `tạo ${report.created} dòng (+${report.createdAmount.toLocaleString('vi-VN')}đ), ` +
        `điều chỉnh ${report.adjusted} dòng (${report.adjustedDelta >= 0 ? '+' : ''}${report.adjustedDelta.toLocaleString('vi-VN')}đ), ` +
        `hủy ${report.removed} dòng (-${report.removedAmount.toLocaleString('vi-VN')}đ)`,
      metadata: {
        courseId,
        ordersScanned: report.ordersScanned,
        created: report.created,
        createdAmount: report.createdAmount,
        adjusted: report.adjusted,
        adjustedDelta: report.adjustedDelta,
        removed: report.removed,
        removedAmount: report.removedAmount,
        skippedSettled: report.skippedSettled,
        skippedCancelled: report.skippedCancelled,
        netDelta: report.netDelta
      }
    })
  }

  return report
}
