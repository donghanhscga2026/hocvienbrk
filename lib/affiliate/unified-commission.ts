'use server'

/**
 * Affiliate v2 — Engine hoa hồng thống nhất (2 thành phần).
 *
 * Quyết định nghiệp vụ (chốt 2026-10-15/16):
 * - Mọi lượt mua (khóa học qua enrollment + đơn sàn) đều đi qua một `Order`.
 * - Mỗi đơn PAID sinh tối đa 2 khoản hoa hồng:
 *   1. TRỰC TIẾP (kind=DIRECT): trả cho CTV có link dẫn tới đơn mua
 *      (`order.affiliateId` snapshot lúc mua), tỷ lệ = ProductAffiliateConfig.directRate
 *      của sản phẩm, tính trên GIÁ NIÊM YẾT. Giảm 50% nếu CTV chưa từng mua sản phẩm đó.
 *   2. GIÁN TIẾP / tri ân (kind=GRATITUDE): luôn trả cho người đầu tiên đưa khách
 *      vào hệ thống (`buyer.referrerId`), tỷ lệ = SystemAffiliateConfig.gratitudeRate
 *      (mặc định 2%), BẤT KỂ đơn mua có qua link ai hay khách tự mua.
 * - Nếu affiliateId trùng referrerId → nhận cả 2 khoản.
 * - LOẠI TRỪ (quyết định 2026-10-20): giảng viên KHÔNG nhận hoa hồng (cả trực tiếp
 *   lẫn tri ân) cho chính khóa học của mình — tiền khóa học vốn đã là của họ.
 *   Quảng bá khóa của người khác thì vẫn nhận bình thường.
 * - Idempotent theo orderId (cờ commissionProcessed + kiểm tra conversion).
 */

import prisma from "@/lib/prisma"
import { CommissionStatus, ConversionStatus, CommissionKind } from "@prisma/client"
import { ensureWalletAndUpdate, createTransactionLog } from "./wallet-service"
import { resolveRefToUserId } from "./resolve-ref-helper"

const FEE_AMOUNT_DEFAULT = 3300

export interface UnifiedCommissionResult {
  success: boolean
  message?: string
  error?: string
  orderId?: number
  conversionId?: number
  commissions?: Array<{
    kind: CommissionKind
    affiliateId: number
    percentage: number
    grossAmount: number
    netAmount: number
  }>
}

/**
 * Tạo Order cho một enrollment vừa kích hoạt thành công.
 * Idempotent theo enrollmentId (mỗi enrollment chỉ có 1 Order).
 * totalAmount = GIÁ NIÊM YẾT của khóa học (course.phi_coc).
 */
export async function createOrderForEnrollment(
  enrollmentId: number,
  opts?: { affiliateId?: number | null; refCode?: string | null }
) {
  // Idempotency: đã có Order cho enrollment này chưa?
  const existing = await prisma.orderItem.findFirst({
    where: { enrollmentId },
    select: { orderId: true }
  })
  if (existing) {
    return { success: true, orderId: existing.orderId, message: 'Order already exists' }
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    include: { course: { select: { id: true, phi_coc: true, name_lop: true, name_khoa: true } } }
  })
  if (!enrollment) {
    return { success: false, error: 'Enrollment not found' }
  }

  const listedPrice = enrollment.course.phi_coc || 0
  const productName = enrollment.course.name_khoa || enrollment.course.name_lop || `Khóa học #${enrollment.course.id}`

  // Snapshot CTV trực tiếp: ưu tiên giá trị truyền vào (cookie lúc mua);
  // fallback: conversion PURCHASE đã track lúc đăng ký (link.userId).
  let affiliateId = opts?.affiliateId ?? null
  let refCode = opts?.refCode ?? null
  if (!affiliateId) {
    const conv = await prisma.affiliateConversion.findFirst({
      where: { enrollmentId },
      orderBy: { createdAt: 'desc' },
      include: { link: { select: { userId: true, code: true } } }
    })
    if (conv?.link) {
      affiliateId = conv.link.userId
      refCode = refCode || conv.link.code
    }
  }

  const order = await prisma.order.create({
    data: {
      buyerId: enrollment.userId,
      affiliateId,
      refCode,
      totalAmount: listedPrice,
      status: 'PAID',
      paidAt: new Date(),
      items: {
        create: {
          productType: 'COURSE',
          productId: enrollment.course.id,
          productName,
          unitPrice: listedPrice,
          quantity: 1,
          enrollmentId
        }
      }
    }
  })

  console.log(`[AffiliateV2] Created order #${order.id} for enrollment #${enrollmentId} (amount: ${listedPrice})`)
  return { success: true, orderId: order.id }
}

/**
 * Đọc affiliateId (CTV trực tiếp) từ cookie aff_ref.
 * Dùng trong server action / route handler tại thời điểm mua/kích hoạt.
 */
export async function resolveAffiliateIdFromCookie(): Promise<{ affiliateId: number | null; refCode: string | null }> {
  try {
    const { cookies } = await import("next/headers")
    const cookieStore = await cookies()
    const refCookie = cookieStore.get('aff_ref')
    if (!refCookie?.value) return { affiliateId: null, refCode: null }
    let refCode: string | null = null
    try {
      const affData = JSON.parse(decodeURIComponent(refCookie.value))
      if (affData?.r) refCode = String(affData.r)
    } catch {
      refCode = refCookie.value
    }
    if (!refCode) return { affiliateId: null, refCode: null }
    const affiliateId = await resolveRefToUserId(refCode)
    return { affiliateId: affiliateId || null, refCode }
  } catch {
    return { affiliateId: null, refCode: null }
  }
}

/**
 * Kiểm tra một user đã từng mua sản phẩm chưa.
 * - Khóa học (COURSE): có enrollment ACTIVE.
 * - Sản phẩm/dịch vụ: có Order PAID chứa sản phẩm đó.
 */
export async function hasPurchasedProduct(userId: number, productType: string, productId: number): Promise<boolean> {
  if (productType === 'COURSE') {
    const e = await prisma.enrollment.findFirst({
      where: { userId, courseId: productId, status: 'ACTIVE' },
      select: { id: true }
    })
    return !!e
  }
  const o = await prisma.orderItem.findFirst({
    where: {
      productType: productType as any,
      productId,
      order: { buyerId: userId, status: 'PAID' }
    },
    select: { id: true }
  })
  return !!o
}

/**
 * Kiểm tra một user có phải giảng viên của khóa học không.
 * (Quyết định 2026-10-20: giảng viên không nhận hoa hồng cho chính khóa của mình.)
 */
export async function isTeacherOfCourse(userId: number, productType: string, productId: number): Promise<boolean> {
  if (productType !== 'COURSE') return false
  const course = await prisma.course.findUnique({
    where: { id: productId },
    select: { teacherId: true }
  })
  return !!course?.teacherId && course.teacherId === userId
}

interface CommissionLine {
  kind: CommissionKind
  affiliateId: number
  percentage: number
  grossAmount: number
  taxAmount: number
  feeAmount: number
  netAmount: number
}

/**
 * Engine duy nhất tính hoa hồng cho một Order đã PAID.
 */
export async function processOrderCommission(orderId: number): Promise<UnifiedCommissionResult> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        buyer: { select: { id: true, referrerId: true } },
        items: true
      }
    })

    if (!order) {
      return { success: false, error: 'Order not found' }
    }
    if (order.commissionProcessed) {
      return { success: true, message: 'Already processed', orderId }
    }
    if (order.status !== 'PAID') {
      return { success: false, error: `Order status is ${order.status}, expected PAID` }
    }

    // Idempotency lớp 2: đã có conversion cho order này chưa?
    const existingConversion = await prisma.affiliateConversion.findFirst({
      where: { orderRecordId: orderId }
    })
    if (existingConversion) {
      await prisma.order.update({ where: { id: orderId }, data: { commissionProcessed: true } })
      return { success: true, message: 'Already processed', orderId }
    }

    // Cấu hình hệ thống
    const sysCfg = await prisma.systemAffiliateConfig.findUnique({ where: { id: 1 } })
    const gratitudeRate = sysCfg?.gratitudeRate ?? 2
    const pendingDays = sysCfg?.pendingDays ?? 30
    const taxRate = sysCfg?.taxRate ?? 0

    // Campaign mặc định (cần cho bản ghi conversion)
    const campaign = await prisma.affiliateCampaign.findFirst({
      where: { slug: 'default', isActive: true }
    })
    if (!campaign) {
      console.log('[AffiliateV2] No active default campaign — commission skipped')
      return { success: true, message: 'No campaign', orderId }
    }

    const pendingUntil = new Date()
    pendingUntil.setDate(pendingUntil.getDate() + pendingDays)

    const lines: CommissionLine[] = []

    // ── 1. HOA HỒNG TRỰC TIẾP ──────────────────────────────────
    if (order.affiliateId && order.affiliateId !== 0) {
      for (const item of order.items) {
        const config = await prisma.productAffiliateConfig.findUnique({
          where: { productType_productId: { productType: item.productType, productId: item.productId } }
        })
        if (!config || !config.isActive) {
          console.log(`[AffiliateV2] No active config for ${item.productType}#${item.productId} — direct commission skipped`)
          continue
        }

        // LOẠI TRỪ (2026-10-20): CTV là giảng viên của chính khóa này → không nhận hoa hồng trực tiếp
        if (await isTeacherOfCourse(order.affiliateId, item.productType, item.productId)) {
          console.log(`[AffiliateV2] Skip direct: affiliate ${order.affiliateId} is teacher of course ${item.productId}`)
          continue
        }

        let rate = config.directRate
        // Quy tắc giảm 50%: CTV chưa từng mua sản phẩm này
        const purchased = await hasPurchasedProduct(order.affiliateId, item.productType, item.productId)
        if (!purchased) {
          rate = rate * 0.5
        }

        const itemTotal = item.unitPrice * item.quantity // GIÁ NIÊM YẾT
        const grossAmount = Math.floor(itemTotal * (rate / 100))
        const taxAmount = grossAmount * (taxRate / 100)
        const feeAmount = FEE_AMOUNT_DEFAULT
        const netAmount = grossAmount - taxAmount - feeAmount
        if (netAmount <= 0) continue

        lines.push({
          kind: CommissionKind.DIRECT,
          affiliateId: order.affiliateId,
          percentage: rate,
          grossAmount,
          taxAmount,
          feeAmount,
          netAmount
        })
      }
    }

    // ── 2. HOA HỒNG GIÁN TIẾP (tri ân) ──────────────────────────
    // Luôn trả cho người đầu tiên đưa khách vào hệ thống, bất kể đơn mua qua link ai.
    // LOẠI TRỪ (2026-10-20): không tính tri ân trên các khóa mà chính người được tri ân là giảng viên.
    const referrerId = order.buyer?.referrerId
    if (referrerId && referrerId !== 0) {
      let gratitudeBase = 0 // GIÁ NIÊM YẾT của các item đủ điều kiện
      for (const item of order.items) {
        if (await isTeacherOfCourse(referrerId, item.productType, item.productId)) {
          console.log(`[AffiliateV2] Skip gratitude base: referrer ${referrerId} is teacher of course ${item.productId}`)
          continue
        }
        gratitudeBase += item.unitPrice * item.quantity
      }
      if (gratitudeBase <= 0) {
        console.log(`[AffiliateV2] No gratitude base for order #${orderId} — gratitude skipped`)
      } else {
        const grossAmount = Math.floor(gratitudeBase * (gratitudeRate / 100)) // GIÁ NIÊM YẾT
        const taxAmount = grossAmount * (taxRate / 100)
        const feeAmount = FEE_AMOUNT_DEFAULT
        const netAmount = grossAmount - taxAmount - feeAmount
        if (netAmount > 0) {
          lines.push({
            kind: CommissionKind.GRATITUDE,
            affiliateId: referrerId,
            percentage: gratitudeRate,
            grossAmount,
            taxAmount,
            feeAmount,
            netAmount
          })
        }
      }
    }

    if (lines.length === 0) {
      await prisma.order.update({ where: { id: orderId }, data: { commissionProcessed: true } })
      return { success: true, message: 'No commission lines', orderId }
    }

    // Link cho bản ghi conversion: ưu tiên link của CTV trực tiếp, fallback link của người tri ân
    const primaryAffiliateId = order.affiliateId || referrerId!
    let link = await prisma.affiliateLink.findFirst({
      where: { userId: primaryAffiliateId, campaignId: campaign.id }
    })
    if (!link) {
      link = await prisma.affiliateLink.create({
        data: {
          userId: primaryAffiliateId,
          campaignId: campaign.id,
          code: `REF${primaryAffiliateId}`,
          name: 'Auto-generated',
          source: 'system'
        }
      })
    }

    const conversion = await prisma.affiliateConversion.create({
      data: {
        linkId: link.id,
        campaignId: campaign.id,
        customerId: order.buyerId,
        orderRecordId: orderId,
        orderId: `ORD-${orderId}-${Date.now()}`,
        orderAmount: order.totalAmount,
        productType: order.items[0]?.productType || 'COURSE',
        status: ConversionStatus.PENDING,
        pendingUntil
      }
    })

    const results: UnifiedCommissionResult['commissions'] = []
    for (const line of lines) {
      await prisma.affiliateCommission.create({
        data: {
          conversionId: conversion.id,
          affiliateId: line.affiliateId,
          kind: line.kind,
          level: line.kind === CommissionKind.DIRECT ? 1 : 0,
          percentage: line.percentage,
          grossAmount: line.grossAmount,
          taxAmount: line.taxAmount,
          feeAmount: line.feeAmount,
          netAmount: line.netAmount,
          status: CommissionStatus.PENDING,
          availableAt: pendingUntil
        }
      })

      const walletBefore = await prisma.affiliateWallet.findUnique({
        where: { userId: line.affiliateId },
        select: { pendingBalance: true }
      })
      const updated = await ensureWalletAndUpdate(line.affiliateId, { pendingBalance: line.netAmount })
      await createTransactionLog({
        userId: line.affiliateId,
        amount: line.netAmount,
        type: 'COMMISSION',
        description: line.kind === CommissionKind.DIRECT
          ? `Hoa hồng trực tiếp đơn #${orderId}`
          : `Hoa hồng tri ân đơn #${orderId}`,
        balanceBefore: walletBefore?.pendingBalance ?? 0,
        balanceAfter: updated.pendingBalance
      })

      results.push({
        kind: line.kind,
        affiliateId: line.affiliateId,
        percentage: line.percentage,
        grossAmount: line.grossAmount,
        netAmount: line.netAmount
      })
    }

    await prisma.order.update({ where: { id: orderId }, data: { commissionProcessed: true } })

    console.log(`[AffiliateV2] Order #${orderId}: created ${results.length} commission lines`)
    return { success: true, orderId, conversionId: conversion.id, commissions: results }
  } catch (error) {
    console.error('[AffiliateV2] processOrderCommission error:', error)
    return { success: false, error: String(error) }
  }
}

/**
 * Thu hồi hoa hồng của một Order (hoàn/hủy đơn).
 * - Commission PENDING → CANCELLED, trừ pendingBalance.
 * - Commission AVAILABLE/WITHDRAWN → CANCELLED, trừ balance + log ADJUSTMENT.
 */
export async function reverseOrderCommission(orderId: number, reason: string) {
  try {
    const commissions = await prisma.affiliateCommission.findMany({
      where: {
        conversion: { orderRecordId: orderId },
        status: { in: [CommissionStatus.PENDING, CommissionStatus.AVAILABLE, CommissionStatus.WITHDRAWN] }
      }
    })

    let reversed = 0
    for (const c of commissions) {
      await prisma.$transaction(async (tx) => {
        await tx.affiliateCommission.update({
          where: { id: c.id },
          data: { status: CommissionStatus.CANCELLED }
        })

        const wallet = await tx.affiliateWallet.findUnique({ where: { userId: c.affiliateId } })
        if (!wallet) return

        if (c.status === CommissionStatus.PENDING) {
          const dec = Math.min(c.netAmount, wallet.pendingBalance)
          await tx.affiliateWallet.update({
            where: { userId: c.affiliateId },
            data: { pendingBalance: { decrement: dec } }
          })
          await tx.affiliateTransaction.create({
            data: {
              walletId: wallet.id,
              amount: -dec,
              type: 'ADJUSTMENT',
              description: `Thu hồi hoa hồng chờ duyệt (đơn #${orderId}): ${reason}`,
              refId: String(c.id),
              balanceBefore: wallet.pendingBalance,
              balanceAfter: wallet.pendingBalance - dec
            }
          })
        } else {
          // AVAILABLE hoặc WITHDRAWN: trừ vào số dư ví (có thể âm nếu đã rút)
          await tx.affiliateWallet.update({
            where: { userId: c.affiliateId },
            data: { balance: { decrement: c.netAmount } }
          })
          await tx.affiliateTransaction.create({
            data: {
              walletId: wallet.id,
              amount: -c.netAmount,
              type: 'ADJUSTMENT',
              description: `Thu hồi hoa hồng đã duyệt (đơn #${orderId}): ${reason}`,
              refId: String(c.id),
              balanceBefore: wallet.balance,
              balanceAfter: wallet.balance - c.netAmount
            }
          })
        }
      })
      reversed++
    }

    console.log(`[AffiliateV2] Reversed ${reversed} commissions for order #${orderId}: ${reason}`)
    return { success: true, reversed }
  } catch (error) {
    console.error('[AffiliateV2] reverseOrderCommission error:', error)
    return { success: false, error: String(error) }
  }
}

/**
 * Thu hồi hoa hồng theo enrollment (dùng khi admin hủy đăng ký khóa học).
 */
export async function reverseCommissionForEnrollment(enrollmentId: number, reason: string) {
  const items = await prisma.orderItem.findMany({
    where: { enrollmentId },
    select: { orderId: true },
    distinct: ['orderId']
  })
  let total = 0
  for (const item of items) {
    const r = await reverseOrderCommission(item.orderId, reason)
    if (r.success) total += r.reversed || 0
  }
  return { success: true, reversed: total }
}
