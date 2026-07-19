'use server'

import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { Prisma, Role } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { revertMemberActivation } from "@/lib/brk/activation-service"

export async function getPaymentByEnrollmentId(enrollmentId: number) {
  try {
    const payment = await prisma.payment.findUnique({
      where: { enrollmentId }
    })
    return { success: true, payment }
  } catch (error: any) {
    console.error("Get Payment Error:", error)
    return { success: false, error: error.message }
  }
}

export async function createPaymentForEnrollment(enrollmentId: number, courseFee: number) {
  try {
    const existingPayment = await prisma.payment.findUnique({
      where: { enrollmentId }
    })

    if (existingPayment) {
      return { success: true, payment: existingPayment }
    }

    const payment = await prisma.payment.create({
      data: {
        enrollmentId,
        amount: courseFee,
        status: 'PENDING'
      }
    })

    return { success: true, payment }
  } catch (error: any) {
    console.error("Create Payment Error:", error)
    return { success: false, error: error.message }
  }
}

export async function updatePaymentProof(enrollmentId: number, proofImageUrl: string) {
  try {
    const { saveBase64Image } = await import("@/lib/image-utils")
    let finalImageUrl = proofImageUrl
    if (finalImageUrl && finalImageUrl.startsWith('data:image')) {
      finalImageUrl = await saveBase64Image(finalImageUrl, 'payments')
    }

    const payment = await prisma.payment.update({
      where: { enrollmentId },
      data: {
        proofImage: finalImageUrl,
        verifyMethod: 'MANUAL_UPLOAD'
      }
    })

    revalidatePath('/')
    revalidatePath('/courses')
    
    return { success: true, payment }
  } catch (error: any) {
    console.error("Update Payment Proof Error:", error)
    return { success: false, error: error.message }
  }
}

export async function verifyPaymentAction(
  enrollmentId: number,
  method: 'AUTO_EMAIL' | 'MANUAL_UPLOAD' | 'MANUAL_ADMIN',
  note?: string,
  customUpdatedAt?: Date
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" }
    }

    const userId = parseInt(session.user.id)
    const isAdmin = session.user.role === Role.ADMIN
    const isTeacher = session.user.role === Role.TEACHER
    if (!isAdmin && !isTeacher) {
      return { success: false, error: "Unauthorized" }
    }

    const preCheck = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: { course: { select: { teacherId: true } } }
    })
    if (!preCheck) {
      return { success: false, error: "Enrollment not found" }
    }
    if (isTeacher && preCheck.course.teacherId !== userId) {
      return { success: false, error: "Forbidden" }
    }

    const { processEnrollmentActivation } = await import('@/lib/enrollment-activation')
    const result = await processEnrollmentActivation({
      enrollmentId,
      method,
      note,
      customUpdatedAt
    })

    if (!result.success) {
      return { success: false, error: result.error }
    }

    // Telegram admin notification
    const { sendTelegramAdmin } = await import('@/lib/notifications')
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://giautoandien.io.vn'
    let refLink = ''
    if (result.referrerId) {
      const affRef = await prisma.affiliateRef.findFirst({ where: { userId: result.referrerId, isActive: true } })
      const refCode = affRef?.refKey || String(result.referrerId)
      refLink = `🔗 Link ref: ${appUrl}/khoa-hoc/${result.courseCode}?ref=${refCode}\n`
    }

    if (result.brkResult?.activated && result.brkResult.placement) {
      const p = result.brkResult.placement
      let teleMsg = `✅ <b>KÍCH HOẠT THỦ CÔNG THÀNH CÔNG</b>\n\n` +
        `👤 Học viên: <b>${result.studentName || 'N/A'}</b>\n` +
        `📞 SĐT: ${result.studentPhone || 'N/A'}\n` +
        `🎓 Khóa học: <b>${result.courseName} (${result.courseCode})</b>\n` +
        `${refLink}💰 Số tiền: ${(result.effectiveAmount || 0).toLocaleString()}đ\n` +
        `🏦 Ngân hàng: ${result.bankName}\n` +
        `📅 Thời gian: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}\n`
      if (p.parentId) {
        teleMsg += `📍 Vị trí: Dưới <b>#${p.parentId} ${p.parentName}</b>\n`
        if (p.chain.length > 1) {
          const upline = p.chain.slice(1).map((a: any) => `#${a.userId} ${a.name}`).join(' → ')
          teleMsg += `🔗 Tuyến trên: ${upline}\n`
        }
      }
      await sendTelegramAdmin(teleMsg)
    } else if (result.brkResult && !result.brkResult.activated) {
      // Non-BRK course or no BRK config — simple notification
      const teleMsg = `✅ <b>KÍCH HOẠT THỦ CÔNG THÀNH CÔNG</b>\n\n` +
        `👤 Học viên: <b>${result.studentName || 'N/A'}</b>\n` +
        `🎓 Khóa học: <b>${result.courseName} (${result.courseCode})</b>\n` +
        `${refLink}💰 Số tiền: ${(result.effectiveAmount || 0).toLocaleString()}đ\n` +
        `📅 Thời gian: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}\n`
      await sendTelegramAdmin(teleMsg)
    }

    // Activity log — chỉ ghi lần đầu, skip nếu đã có (tránh trùng khi re-verify sau revert)
    const existingVerifiedLogs = await prisma.$queryRaw`SELECT id FROM "activity_log" WHERE action = 'PAYMENT_VERIFIED' AND metadata->>'enrollmentId' = ${String(enrollmentId)} LIMIT 1` as any[]
    if (existingVerifiedLogs.length === 0) {
      const { logActivity } = await import('@/lib/activity-logger')
      await logActivity({
        userId: preCheck.userId,
        action: 'PAYMENT_VERIFIED',
        detail: `Xác minh thanh toán: ${result.courseName} - ${(result.effectiveAmount || 0).toLocaleString()}đ`,
        metadata: {
          courseId: preCheck.courseId,
          enrollmentId,
          amount: Number(result.effectiveAmount || 0),
          bankName: result.bankName,
          studentName: result.studentName || null,
          parentId: result.brkResult?.placement?.parentId || null,
          uplineChain: result.brkResult?.placement?.chain?.map((a: any) => a.userId) || []
        }
      })
    }

    revalidatePath('/')
    revalidatePath('/courses')
    revalidatePath(`/courses/${result.courseCode}/learn`)
    revalidatePath('/tools/genealogy')
    revalidatePath('/tools/brk')

    return {
      success: true,
      payment: result.payment,
      enrollment: result.enrollment,
      message: `Đã kích hoạt khóa học "${result.courseName}" thành công!`
    }
  } catch (error: any) {
    console.error("Verify Payment Error:", error)
    return { success: false, error: error.message }
  }
}

export async function rejectPaymentAction(enrollmentId: number, reason: string) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" }
    }

    const userId = parseInt(session.user.id)
    const isAdmin = session.user.role === Role.ADMIN
    const isTeacher = session.user.role === Role.TEACHER
    if (!isAdmin && !isTeacher) {
      return { success: false, error: "Unauthorized" }
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: { course: true }
    })

    if (!enrollment) {
      return { success: false, error: "Enrollment not found" }
    }

    if (isTeacher && enrollment.course.teacherId !== userId) {
      return { success: false, error: "Forbidden" }
    }

    // Đánh dấu REJECTED (giữ enrollment + lessonProgress, chỉ xóa payment)
    const { logActivity } = await import('@/lib/activity-logger')
    await logActivity({
      userId: enrollment.userId,
      action: 'PAYMENT_REJECTED',
      detail: `Từ chối thanh toán: ${enrollment.course.name_lop}`,
      metadata: { courseId: enrollment.courseId, enrollmentId: enrollment.id, reason, adminId: userId }
    })

    await prisma.$transaction([
      prisma.enrollment.update({
        where: { id: enrollmentId },
        data: { status: 'REJECTED' }
      }),
      prisma.payment.delete({
        where: { enrollmentId }
      })
    ])

    revalidatePath('/')
    revalidatePath('/courses')
    revalidatePath('/tools/payments')

    return { success: true }
  } catch (error: any) {
    console.error("Reject Payment Error:", error)
    return { success: false, error: error.message }
  }
}

export async function getPendingPayments() {
  try {
    const session = await auth()
    if (!session?.user?.id) return { success: false, error: "Unauthorized" }

    const userId = parseInt(session.user.id)
    const isAdmin = session.user.role === Role.ADMIN
    const isTeacher = session.user.role === Role.TEACHER
    if (!isAdmin && !isTeacher) return { success: false, error: "Unauthorized" }

    const where: any = { status: 'PENDING' }
    if (isTeacher) {
      where.enrollment = { course: { teacherId: userId } }
    }

    const payments = await prisma.payment.findMany({
      where,
      include: {
        enrollment: {
          select: {
            id: true,
            status: true,
            referrerId: true,
            updatedAt: true,
            user: {
              select: { 
                id: true, 
                name: true, 
                email: true, 
                phone: true,
                referrerId: true,
                referrer: {
                  select: { id: true, name: true, phone: true }
                }
              }
            },
            course: {
              select: { 
                id: true, 
                id_khoa: true, 
                name_lop: true, 
                phi_coc: true,
                type: true,
                teacherBankAccount: true
              }
            },
            referrer: {
              select: { id: true, name: true, phone: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return { success: true, payments }
  } catch (error: any) {
    console.error("Get Pending Payments Error:", error)
    return { success: false, error: error.message }
  }
}

export async function getAllPayments() {
  try {
    const session = await auth()
    if (!session?.user?.id) return { success: false, error: "Unauthorized" }

    const userId = parseInt(session.user.id)
    const isAdmin = session.user.role === Role.ADMIN
    const isTeacher = session.user.role === Role.TEACHER
    if (!isAdmin && !isTeacher) return { success: false, error: "Unauthorized" }

    const where: any = {}
    if (isTeacher) {
      where.enrollment = { course: { teacherId: userId } }
    }

    const payments = await prisma.payment.findMany({
      where,
      include: {
        enrollment: {
          select: {
            id: true,
            status: true,
            referrerId: true,
            updatedAt: true,
            user: {
              select: { 
                id: true, 
                name: true, 
                email: true, 
                phone: true,
                referrerId: true,
                referrer: {
                  select: { id: true, name: true, phone: true }
                }
              }
            },
            course: {
              select: { 
                id: true, 
                id_khoa: true, 
                name_lop: true, 
                phi_coc: true,
                type: true,
                teacherBankAccount: true
              }
            },
            referrer: {
              select: { id: true, name: true, phone: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return { success: true, payments }
  } catch (error: any) {
    console.error("Get All Payments Error:", error)
    return { success: false, error: error.message }
  }
}

export async function triggerAutoVerifyManual() {
  try {
    const session = await auth()
    if (!session?.user?.id || session.user.role !== Role.ADMIN) {
      return { success: false, error: "Quyền truy cập bị từ chối. Chỉ Admin mới được phép kích hoạt tính năng này." }
    }
    
    const { processPaymentEmails } = await import("@/lib/auto-verify")
    const result = await processPaymentEmails()
    
    revalidatePath('/tools/payments')
    return { success: true, ...result }
  } catch (error: any) {
    console.error("Manual auto-verify trigger error:", error)
    return { success: false, error: error.message }
  }
}

export async function getGmailStatus() {
  try {
    const penaltyKey = 'gmail_rate_limit_until';
    const existingPenalty = await prisma.systemConfig.findUnique({
      where: { key: penaltyKey }
    });
    
    if (existingPenalty && existingPenalty.value) {
      const penaltyTime = new Date(String(existingPenalty.value)).getTime();
      if (Date.now() < penaltyTime) {
        return { success: true, penalized: true, retryAfter: String(existingPenalty.value) };
      }
    }
    return { success: true, penalized: false };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ============================================================
// ADMIN-ONLY: Đổi trạng thái ACTIVE/VERIFIED → PENDING
// ============================================================
export async function revertToPendingAction(enrollmentIds: number[]) {
  try {
    const session = await auth()
    if (!session?.user?.id || session.user.role !== Role.ADMIN) {
      return { success: false, error: 'Chỉ Admin mới có quyền thực hiện thao tác này.' }
    }

    let count = 0
    const errors: { enrollmentId: number; reason: string }[] = []
    const brkReverted: { enrollmentId: number; systemId: number; userId: number }[] = []

    for (const enrollmentId of enrollmentIds) {
      const enrollment = await prisma.enrollment.findUnique({
        where: { id: enrollmentId },
        include: { course: { select: { name_lop: true, type: true, id_khoa: true } } }
      })
      if (!enrollment) continue

      // Guard: Nếu khóa SYS, kiểm tra BRK đã active chưa
      if (enrollment.course.type === 'SYS') {
        const brkTree = await prisma.systemTree.findFirst({
          where: { courseId: enrollment.courseId }
        })
        if (brkTree) {
          const brkMember = await prisma.system.findUnique({
            where: { userId_onSystem: { userId: enrollment.userId, onSystem: brkTree.onSystem } }
          })
          if (brkMember) {
            // Luôn revert BRK member nếu tồn tại, bất kể trạng thái
            try {
              await revertMemberActivation(enrollment.userId, brkTree.onSystem)
              brkReverted.push({
                enrollmentId,
                systemId: brkTree.onSystem,
                userId: enrollment.userId
              })
            } catch (err: any) {
              errors.push({
                enrollmentId,
                reason: `Lỗi revert BRK member #${enrollment.userId}: ${err.message}`
              })
              continue
            }
          }
        }
      }

      // Giữ nguyên updatedAt cũ (Prisma @updatedAt sẽ ghi đè bằng now nếu không truyền)
      await prisma.$transaction([
        prisma.enrollment.update({
          where: { id: enrollmentId },
          data: { status: 'PENDING', updatedAt: enrollment.updatedAt }
        }),
        prisma.payment.updateMany({
          where: { enrollmentId, status: 'VERIFIED' },
          data: { status: 'PENDING', verifiedAt: null, verifyMethod: null }
        })
      ])

      count++
    }

    revalidatePath('/tools/payments')
    revalidatePath('/tools/brk')
    revalidatePath('/tools/genealogy')

    const messages: string[] = []
    if (brkReverted.length > 0) {
      messages.push(`Đã phẫu thuật revert ${brkReverted.length} BRK member: ${brkReverted.map(r => `#${r.userId} (sys #${r.systemId})`).join(', ')}`)
    }
    if (errors.length > 0) {
      messages.push(`Lỗi (${errors.length}): ${errors.map(e => `#${e.enrollmentId}: ${e.reason}`).join('; ')}`)
    }
    if (messages.length === 0) {
      messages.push(`Đã revert ${count}/${enrollmentIds.length} enrollment.`)
    }

    return { success: true, count, brkReverted, errors, message: messages.join('\n') }
  } catch (error: any) {
    console.error('Revert To Pending Error:', error)
    return { success: false, error: error.message }
  }
}

// ============================================================
// ADMIN-ONLY: Hủy đăng ký (Cancel enrollment)
// ============================================================
export async function cancelEnrollmentAction(enrollmentIds: number[]) {
  try {
    const session = await auth()
    if (!session?.user?.id || session.user.role !== Role.ADMIN) {
      return { success: false, error: 'Chỉ Admin mới có quyền thực hiện thao tác này.' }
    }

    let count = 0
    for (const enrollmentId of enrollmentIds) {
      const enrollment = await prisma.enrollment.findUnique({
        where: { id: enrollmentId },
        include: { course: { select: { name_lop: true } } }
      })
      if (!enrollment) continue

      await prisma.$transaction([
        prisma.enrollment.update({
          where: { id: enrollmentId },
          data: { status: 'CANCELLED' }
        }),
        prisma.payment.updateMany({
          where: { enrollmentId },
          data: { status: 'CANCELLED' }
        })
      ])

      const { logActivity } = await import('@/lib/activity-logger')
      await logActivity({
        userId: enrollment.userId,
        action: 'ENROLLMENT_CANCELLED',
        detail: `Admin hủy đăng ký: ${enrollment.course.name_lop}`,
        metadata: { enrollmentId, adminId: parseInt(session.user.id) }
      })

      count++
    }

    revalidatePath('/tools/payments')
    return { success: true, count }
  } catch (error: any) {
    console.error('Cancel Enrollment Error:', error)
    return { success: false, error: error.message }
  }
}

// ============================================================
// ADMIN-ONLY: Reset toàn bộ BRK data của 1 system để rebuild
// ============================================================
export async function resetSystemForRebuildAction(systemId?: number, courseId?: number) {
  try {
    // Resolve systemId from courseId if not provided
    if (!systemId && courseId) {
      const tree = await prisma.systemTree.findFirst({ where: { courseId } })
      if (!tree) return { success: false, error: `Không tìm thấy SystemTree cho courseId ${courseId}` }
      systemId = tree.onSystem
    }
    if (!systemId) {
      return { success: false, error: 'Cần cung cấp systemId hoặc courseId' }
    }

    const session = await auth()
    if (!session?.user?.id || session.user.role !== Role.ADMIN) {
      return { success: false, error: 'Chỉ Admin mới có quyền thực hiện thao tác này.' }
    }

    // 1. Lấy tất cả members trong system
    const systems = await prisma.system.findMany({
      where: { onSystem: systemId },
      select: { autoId: true, userId: true }
    })
    const userIds = systems.map(r => r.userId)
    const autoIds = systems.map(r => r.autoId)

    if (userIds.length === 0) {
      return { success: true, message: `System #${systemId} không có thành viên.`, deletedRecords: {} }
    }

    const deletedRecords: Record<string, number> = {}

    // 2. Xóa BrkRevenueAward (qua BrkRevenuePool)
    const revenueAwardCount = await prisma.brkRevenueAward.deleteMany({
      where: { pool: { systemId } }
    })
    deletedRecords['BrkRevenueAward'] = revenueAwardCount.count

    // 3. Xóa BrkRevenuePool
    const revenuePoolCount = await prisma.brkRevenuePool.deleteMany({
      where: { systemId }
    })
    deletedRecords['BrkRevenuePool'] = revenuePoolCount.count

    // 4. Xóa SystemClosure
    if (autoIds.length > 0) {
      const closureCount = await prisma.systemClosure.deleteMany({
        where: {
          OR: [
            { ancestorId: { in: autoIds } },
            { descendantId: { in: autoIds } }
          ]
        }
      })
      deletedRecords['SystemClosure'] = closureCount.count
    }

    // 5. Xóa BrkTimelineRecord
    const timelineCount = await prisma.brkTimelineRecord.deleteMany({
      where: { onSystem: systemId }
    })
    deletedRecords['BrkTimelineRecord'] = timelineCount.count

    // 6. Xóa BrkLevelUpRecord
    const levelUpCount = await prisma.brkLevelUpRecord.deleteMany({
      where: { onSystem: systemId }
    })
    deletedRecords['BrkLevelUpRecord'] = levelUpCount.count

    // 7. Xóa BrkReferralBonus
    const referralCount = await prisma.brkReferralBonus.deleteMany({
      where: { onSystem: systemId }
    })
    deletedRecords['BrkReferralBonus'] = referralCount.count

    // 8. Xóa BrkSystemLog
    const systemLogCount = await prisma.brkSystemLog.deleteMany({
      where: { onSystem: systemId }
    })
    deletedRecords['BrkSystemLog'] = systemLogCount.count

    // 9. Xóa BrkTransaction + zero BrkWallet
    if (userIds.length > 0) {
      const wallets = await prisma.brkWallet.findMany({
        where: { userId: { in: userIds } }
      })
      if (wallets.length > 0) {
        const walletIds = wallets.map(w => w.id)
        const txCount = await prisma.brkTransaction.deleteMany({
          where: { walletId: { in: walletIds } }
        })
        deletedRecords['BrkTransaction'] = txCount.count

        await prisma.$executeRaw(
          Prisma.sql`UPDATE "brk_wallet" SET balance = 0, brkd = 0, "voucherBalance" = 0, "totalEarned" = 0, "totalWithdrawn" = 0 WHERE id IN (${Prisma.join(walletIds)})`
        )
        deletedRecords['BrkWallet_reset'] = wallets.length
      }
    }

    // 10. Xóa ActivityLog WALLET_CHANGE của các thành viên trong system
    const activityLogCount = await prisma.activityLog.deleteMany({
      where: { action: 'WALLET_CHANGE', userId: { in: userIds } }
    })
    deletedRecords['ActivityLog_WALLET_CHANGE'] = activityLogCount.count

    // 11. Xóa System records
    const systemCount = await prisma.system.deleteMany({
      where: { onSystem: systemId }
    })
    deletedRecords['System'] = systemCount.count

    revalidatePath('/tools/payments')
    revalidatePath('/tools/brk')
    revalidatePath('/tools/genealogy')

    return {
      success: true,
      memberCount: systems.length,
      deletedRecords,
      message: `Đã xóa toàn bộ dữ liệu BRK system #${systemId} (${systems.length} thành viên).`
    }
  } catch (error: any) {
    console.error('Reset System For Rebuild Error:', error)
    return { success: false, error: error.message }
  }
}
