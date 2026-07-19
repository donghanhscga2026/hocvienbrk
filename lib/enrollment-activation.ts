import prisma from '@/lib/prisma'
import { isTestAccount } from '@/lib/test-account'
import { processEnrollmentCommission } from '@/lib/affiliate/commission-calculator'

export interface ActivationOptions {
  enrollmentId: number
  method: 'AUTO_EMAIL' | 'MANUAL_UPLOAD' | 'MANUAL_ADMIN'
  note?: string
  customUpdatedAt?: Date
  transferData?: {
    amount: number
    phone: string | null
    courseCode: string | null
    bankName: string | null
    accountNumber: string | null
    transferTime: Date | null
    content: string
  }
}

export interface ActivationResult {
  success: boolean
  error?: string
  enrollment?: any
  payment?: any
  brkResult?: { activated: boolean; placement?: any; error?: string }
  commissionResult?: any
  studentName?: string | null
  studentPhone?: string | null
  studentEmail?: string | null
  courseName?: string
  courseCode?: string
  referrerId?: number | null
  referrerName?: string | null
  referrerPhone?: string | null
  effectiveAmount?: number
  bankName?: string
}

export async function processEnrollmentActivation(options: ActivationOptions): Promise<ActivationResult> {
  const { enrollmentId, method, note, customUpdatedAt, transferData } = options

  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      course: {
        include: { teacherBankAccount: true }
      },
      payment: true,
      referrer: {
        select: { id: true, name: true, phone: true }
      }
    }
  })

  if (!enrollment) {
    return { success: false, error: 'Enrollment not found' }
  }

  if (isTestAccount(enrollment.userId)) {
    return { success: false, error: 'Tài khoản test này không được phép kích hoạt khóa học.' }
  }

  if (enrollment.status === 'ACTIVE') {
    return { success: false, error: 'Enrollment already active' }
  }

  // Tính finalUpdatedAt TRƯỚC — dùng chung cho BRK activation + enrollment update
  const isReactivation = enrollment.updatedAt.getTime() !== enrollment.createdAt.getTime()
  const finalUpdatedAt = customUpdatedAt
    || (isReactivation ? enrollment.updatedAt : new Date())

  // ════════════════════════════════════════════════════════════
  // STEP 1: BRK activation (BEFORE enrollment → ACTIVE)
  // If BRK fails, enrollment stays PENDING (retriable)
  // ════════════════════════════════════════════════════════════
  let brkResult: ActivationResult['brkResult'] = { activated: false }

  if (enrollment.course.type === 'SYS') {
    const brkTree = await prisma.systemTree.findFirst({
      where: { courseId: enrollment.courseId }
    })
    if (brkTree) {
      try {
        const { activateBrkMember, getBrkPlacementChain } = await import('@/lib/brk/activation-service')
        await activateBrkMember(enrollment.userId, brkTree.onSystem, enrollment.referrerId, finalUpdatedAt)
        const placement = await getBrkPlacementChain(enrollment.userId, brkTree.onSystem)
        brkResult = { activated: true, placement }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err)
        if (errMsg.includes('already active in this system')) {
          console.log(`[Activation] BRK already active for user#${enrollment.userId} on system ${brkTree.onSystem}, skipping`)
          const { getBrkPlacementChain } = await import('@/lib/brk/activation-service')
          const placement = await getBrkPlacementChain(enrollment.userId, brkTree.onSystem)
          brkResult = { activated: true, placement }
        } else {
          console.error(`[Activation] BRK failed for user#${enrollment.userId} on system ${brkTree.onSystem}:`, errMsg)
          return { success: false, error: `BRK activation failed: ${errMsg}` }
        }
      }
    }
  }

  // ════════════════════════════════════════════════════════════
  // STEP 2: Payment → VERIFIED, Enrollment → ACTIVE (together)
  // ════════════════════════════════════════════════════════════
  const effectiveAmount = transferData?.amount || enrollment.payment?.amount || 0
  const paymentData: any = {
    status: 'VERIFIED',
    verifiedAt: finalUpdatedAt,
    verifyMethod: method,
    note: note || null,
    amount: effectiveAmount
  }

  if (method === 'AUTO_EMAIL' && transferData) {
    Object.assign(paymentData, {
      phone: transferData.phone,
      courseCode: transferData.courseCode,
      bankName: transferData.bankName,
      accountNumber: transferData.accountNumber,
      transferTime: transferData.transferTime,
      content: transferData.content
    })
  }

  const [payment, updatedEnrollment] = await prisma.$transaction([
    prisma.payment.upsert({
      where: { enrollmentId },
      create: { enrollmentId, ...paymentData },
      update: paymentData
    }),
    prisma.enrollment.update({
      where: { id: enrollmentId },
      data: {
        status: 'ACTIVE',
        updatedAt: finalUpdatedAt
      }
    })
  ])

  // ════════════════════════════════════════════════════════════
  // STEP 3: YTB sync (teacher 327)
  // ════════════════════════════════════════════════════════════
  if (enrollment.course.teacherId === 327) {
    try {
      const { syncUserToYtbSystem } = await import('@/lib/system-closure-helpers')
      await syncUserToYtbSystem(enrollment.userId, enrollment.course.teacherId)
    } catch (err) {
      console.error(`[Activation] YTB sync failed for user#${enrollment.userId}:`, err)
    }
  }

  // ════════════════════════════════════════════════════════════
  // STEP 4: Affiliate commission (non-SYS courses)
  // ════════════════════════════════════════════════════════════
  let commissionResult: any = null
  if (enrollment.course.type !== 'SYS') {
    try {
      const amount = transferData?.amount || enrollment.payment?.amount || 0
      commissionResult = await processEnrollmentCommission(
        enrollment.userId,
        enrollmentId,
        amount
      )
    } catch (err) {
      console.error(`[Activation] Commission processing failed for enrollment#${enrollmentId}:`, err)
    }
  }

  // ════════════════════════════════════════════════════════════
  // Return data for caller (Telegram, email, activity log)
  // ════════════════════════════════════════════════════════════
  const user = await prisma.user.findUnique({
    where: { id: enrollment.userId },
    select: { name: true, phone: true, email: true }
  })

  const bankNameUsed = method === 'AUTO_EMAIL'
    ? (transferData?.bankName || 'Sacombank')
    : (enrollment.course.teacherBankAccount?.bankName || enrollment.payment?.bankName || 'N/A')

  return {
    success: true,
    enrollment: updatedEnrollment,
    payment,
    brkResult,
    commissionResult,
    studentName: user?.name,
    studentPhone: user?.phone,
    studentEmail: user?.email,
    courseName: enrollment.course.name_lop,
    courseCode: enrollment.course.id_khoa,
    referrerId: enrollment.referrerId,
    referrerName: enrollment.referrer?.name || null,
    referrerPhone: enrollment.referrer?.phone || null,
    effectiveAmount,
    bankName: bankNameUsed
  }
}
