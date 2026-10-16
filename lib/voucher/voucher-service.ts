'use server'

import prisma from '@/lib/prisma'
import type { VoucherType, UserVoucherStatus, VoucherBenefitType } from '@prisma/client'

export interface VoucherBenefit {
  userVoucherId: number
  voucherId: number
  voucherCode: string
  voucherName: string
  courseId: number
  benefitType: VoucherBenefitType
  extraAmount: number
  expiresAt: Date | null
}

export interface GrantedBenefit {
  userVoucherId: number
  courseId: number
  courseName: string
  enrollmentId: number
  status: 'ACTIVE' | 'PENDING'
  amountDue: number
}

/**
 * Lấy các quyền lợi voucher mà user có thể dùng cho khóa học (voucher đã gán sẵn).
 * Không có ô nhập mã — chỉ voucher đã được gán cho tài khoản.
 */
export async function getApplicableVoucherBenefits(
  userId: number,
  courseId: number
): Promise<VoucherBenefit[]> {
  const now = new Date()
  const userVouchers = await prisma.userVoucher.findMany({
    where: {
      userId,
      status: 'ACTIVE',
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      voucher: {
        isActive: true,
        courseBenefits: { some: { courseId } }
      }
    },
    include: {
      voucher: {
        include: {
          courseBenefits: { where: { courseId } }
        }
      }
    }
  })

  const out: VoucherBenefit[] = []
  for (const uv of userVouchers) {
    for (const b of uv.voucher.courseBenefits) {
      out.push({
        userVoucherId: uv.id,
        voucherId: uv.voucherId,
        voucherCode: uv.voucher.code,
        voucherName: uv.voucher.name,
        courseId: b.courseId,
        benefitType: b.benefitType,
        extraAmount: b.extraAmount,
        expiresAt: uv.expiresAt
      })
    }
  }
  return out
}

/**
 * Engine tự động kích hoạt quyền lợi voucher:
 * với mỗi UserVoucher ACTIVE (còn hạn) của user mà khóa nguồn đã ACTIVE
 * (hoặc voucher do admin gán trực tiếp), tự động ghi danh các khóa được hưởng:
 *  - FREE_100 → enrollment ACTIVE, phi_coc = 0
 *  - PARTIAL  → enrollment PENDING (hoặc ACTIVE nếu extraAmount = 0), phi_coc = extraAmount
 * Idempotent: bỏ qua khóa đã có enrollment; chỉ mark USED khi tất cả benefit xử lý ok.
 */
export async function grantVoucherBenefits(userId: number): Promise<GrantedBenefit[]> {
  const now = new Date()
  const userVouchers = await prisma.userVoucher.findMany({
    where: {
      userId,
      status: 'ACTIVE',
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      voucher: {
        isActive: true,
        courseBenefits: { some: {} }
      }
    },
    include: {
      voucher: {
        include: {
          courseBenefits: {
            include: {
              course: {
                select: {
                  id: true,
                  id_khoa: true,
                  name_lop: true,
                  phi_coc: true,
                  feeType: true
                }
              }
            }
          }
        }
      }
    }
  })

  const granted: GrantedBenefit[] = []

  for (const uv of userVouchers) {
    // Chỉ kích hoạt quyền lợi khi khóa nguồn đã ACTIVE (tránh tặng trước khi thanh toán).
    // Voucher do admin gán trực tiếp (awardedFromCourseId = null) → kích hoạt ngay.
    if (uv.awardedFromCourseId) {
      const src = await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId, courseId: uv.awardedFromCourseId } },
        select: { status: true }
      })
      if (!src || src.status !== 'ACTIVE') continue
    }

    let allOk = true
    for (const b of uv.voucher.courseBenefits) {
      const target = b.course
      if (!target) { allOk = false; continue }

      const existing = await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId, courseId: target.id } },
        select: { id: true }
      })
      if (existing) continue

      try {
        const amountDue = b.benefitType === 'FREE_100' ? 0 : Math.max(0, b.extraAmount)
        const status = amountDue === 0 ? 'ACTIVE' : 'PENDING'
        const enrollment = await prisma.enrollment.create({
          data: {
            userId,
            courseId: target.id,
            status,
            studyMode: target.feeType === 'MIEN_PHI' ? 'FREE' : 'COMPANION',
            phi_coc: amountDue,
            activatedAt: status === 'ACTIVE' ? now : null
          }
        })

        if (amountDue > 0) {
          await prisma.payment.create({
            data: {
              enrollmentId: enrollment.id,
              amount: amountDue,
              status: 'PENDING',
              voucherId: uv.voucherId,
              discountAmount: Math.max(0, target.phi_coc - amountDue)
            }
          })
        }

        // Tặng tiếp voucher của khóa được hưởng (1 tầng, không đệ quy grant)
        const nextAwards = await prisma.courseVoucherAward.findMany({
          where: { courseId: target.id },
          select: { voucherId: true }
        })
        for (const na of nextAwards) {
          await awardVoucher(userId, na.voucherId, target.id)
        }

        granted.push({
          userVoucherId: uv.id,
          courseId: target.id,
          courseName: target.name_lop,
          enrollmentId: enrollment.id,
          status,
          amountDue
        })
      } catch (e) {
        console.error(`[VoucherBenefit] grant failed user#${userId} course#${target.id}:`, e)
        allOk = false
      }
    }

    if (allOk) {
      await markVoucherUsed(uv.id, uv.awardedFromCourseId ?? uv.voucher.courseBenefits[0]?.courseId ?? 0)
    }
  }

  return granted
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
