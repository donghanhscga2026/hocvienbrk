'use server'

import prisma from '@/lib/prisma'
import type { VoucherType, UserVoucherStatus } from '@prisma/client'

export interface VoucherCheckResult {
  applicable: boolean
  voucherType?: 'VIP' | 'ALL' | 'CASH'
  discount?: number
  userVoucherId?: number
}

/**
 * Kiểm tra user có voucher nào apply được cho khóa học không
 * Priority: ALL > VIP > CASH
 */
export async function checkVoucherForCourse(
  userId: number,
  courseId: number
): Promise<VoucherCheckResult> {
  const accepted = await prisma.courseAcceptedVoucher.findMany({
    where: { courseId },
    select: { voucherId: true }
  })
  if (accepted.length === 0) return { applicable: false }

  const acceptedIds = accepted.map(a => a.voucherId)

  const userVouchers = await prisma.userVoucher.findMany({
    where: {
      userId,
      status: 'ACTIVE',
      voucherId: { in: acceptedIds },
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } }
      ]
    },
    include: { voucher: true }
  })

  if (userVouchers.length === 0) return { applicable: false }

  // Priority 1: ALL
  const allV = userVouchers.find(uv => uv.voucher.type === 'ALL')
  if (allV) return { applicable: true, voucherType: 'ALL', userVoucherId: allV.id }

  // Priority 2: VIP
  const vipV = userVouchers.find(uv => uv.voucher.type === 'VIP')
  if (vipV) return { applicable: true, voucherType: 'VIP', userVoucherId: vipV.id }

  // Priority 3: CASH
  const cashV = userVouchers.find(uv => uv.voucher.type === 'CASH')
  if (cashV) return {
    applicable: true,
    voucherType: 'CASH',
    discount: cashV.voucher.value,
    userVoucherId: cashV.id
  }

  return { applicable: false }
}

/**
 * Award voucher cho user (skip nếu đã có từ khóa này)
 */
export async function awardVoucher(
  userId: number,
  voucherId: number,
  fromCourseId?: number
) {
  const existing = await prisma.userVoucher.findFirst({
    where: {
      userId,
      voucherId,
      awardedFromCourseId: fromCourseId ?? null
    }
  })
  if (existing) return existing

  const voucher = await prisma.voucher.findUnique({ where: { id: voucherId } })
  if (!voucher || !voucher.isActive) return null

  let expiresAt: Date | null = null
  if (voucher.durationDays) {
    expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + voucher.durationDays)
  }

  return prisma.userVoucher.create({
    data: {
      userId,
      voucherId,
      status: 'ACTIVE',
      awardedFromCourseId: fromCourseId ?? null,
      expiresAt
    }
  })
}

/**
 * Đánh dấu voucher đã dùng
 */
export async function markVoucherUsed(
  userVoucherId: number,
  usedForCourseId: number
) {
  return prisma.userVoucher.update({
    where: { id: userVoucherId },
    data: {
      status: 'USED',
      usedAt: new Date(),
      usedForCourseId
    }
  })
}

/**
 * Lấy danh sách voucher của user
 */
export async function getUserVouchers(
  userId: number,
  status?: UserVoucherStatus
) {
  return prisma.userVoucher.findMany({
    where: {
      userId,
      ...(status ? { status } : {}),
    },
    include: { voucher: true },
    orderBy: { createdAt: 'desc' }
  })
}

/**
 * Hết hạn voucher (cron job)
 */
export async function expireOldVouchers(): Promise<number> {
  const result = await prisma.userVoucher.updateMany({
    where: {
      status: 'ACTIVE',
      expiresAt: { not: null, lt: new Date() }
    },
    data: { status: 'EXPIRED' }
  })
  return result.count
}

/**
 * Tạo voucher mới (admin)
 */
export async function createVoucher(data: {
  code: string
  name: string
  type: VoucherType
  value?: number
  durationDays?: number
  description?: string
}) {
  return prisma.voucher.create({ data })
}

/**
 * Assign voucher cho user (admin)
 */
export async function assignVoucherToUser(
  userId: number,
  voucherId: number
) {
  const existing = await prisma.userVoucher.findFirst({
    where: { userId, voucherId, status: 'ACTIVE' }
  })
  if (existing) return existing

  const voucher = await prisma.voucher.findUnique({ where: { id: voucherId } })
  if (!voucher) throw new Error('Voucher not found')

  let expiresAt: Date | null = null
  if (voucher.durationDays) {
    expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + voucher.durationDays)
  }

  return prisma.userVoucher.create({
    data: {
      userId,
      voucherId,
      status: 'ACTIVE',
      expiresAt
    }
  })
}

/**
 * Lấy tất cả vouchers (admin UI)
 */
export async function getAllVouchers() {
  return prisma.voucher.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' }
  })
}
