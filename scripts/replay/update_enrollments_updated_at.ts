import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log("🔄 Bắt đầu đồng bộ lại trường updatedAt của Enrollment với logic kiểm soát tính hợp lệ chặt chẽ:")
  console.log("- Học viên không thể kích hoạt trước khi đăng ký (mốc kích hoạt >= Enrollment.createdAt).")
  console.log("- Ưu tiên mốc thời gian thực tế chuyển khoản của Payment, nếu không hợp lệ thì dùng mốc duyệt verifiedAt, cuối cùng fallback về Enrollment.createdAt.")

  const enrollments = await prisma.enrollment.findMany({
    where: { courseId: 22, status: 'ACTIVE' },
    include: { user: { select: { name: true } } }
  })

  // 1. Quét activity_log
  const activityLogs = await prisma.activityLog.findMany({
    where: {
      action: { in: ['PAYMENT_VERIFIED', 'PAYMENT_AUTO_VERIFIED'] }
    },
    select: { userId: true, createdAt: true, metadata: true }
  })

  const logMap = new Map<number, Date>()
  for (const log of activityLogs) {
    if (log.metadata) {
      try {
        const meta = typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata
        if (Number(meta.courseId) === 22) {
          const existing = logMap.get(log.userId)
          if (!existing || log.createdAt.getTime() < existing.getTime()) {
            logMap.set(log.userId, log.createdAt)
          }
        }
      } catch (e) {}
    }
  }

  // 2. Xác định ngày kích hoạt chuẩn theo logic chặt chẽ
  const finalActivationMap = new Map<number, Date>()

  for (const e of enrollments) {
    let actDate: Date = e.createdAt

    const payment = await prisma.payment.findFirst({
      where: { enrollmentId: e.id, status: 'VERIFIED' }
    })

    if (payment) {
      // Nếu transferTime hợp lệ (>= ngày đăng ký)
      if (payment.transferTime && payment.transferTime.getTime() >= e.createdAt.getTime()) {
        actDate = payment.transferTime
      } else if (payment.verifiedAt && payment.verifiedAt.getTime() >= e.createdAt.getTime()) {
        // Nếu transferTime bị ghi lùi ngày phi lý, dùng verifiedAt (nếu hợp lệ)
        actDate = payment.verifiedAt
      } else {
        // Fallback về đăng ký nếu cả hai đều phi lý
        actDate = e.createdAt
      }
    } else {
      const logTime = logMap.get(e.userId)
      if (logTime && logTime.getTime() >= e.createdAt.getTime()) {
        actDate = logTime
      } else {
        actDate = e.createdAt
      }
    }

    finalActivationMap.set(e.userId, actDate)
  }

  // 3. Thực thi cập nhật trường updatedAt cho Enrollment bằng SQL Raw
  console.log(`\n⚙️ Đang cập nhật...`)
  let updatedCount = 0
  for (const e of enrollments) {
    const actDate = finalActivationMap.get(e.userId)
    if (actDate) {
      await prisma.$executeRaw`
        UPDATE "Enrollment" 
        SET "updatedAt" = ${actDate} 
        WHERE id = ${e.id}
      `
      updatedCount++
    }
  }

  console.log(`\n✅ Hoàn thành! Đã đồng bộ chuẩn xác ${updatedCount}/${enrollments.length} học viên.`)

  // In ra thông tin đối chiếu của các học viên được rà soát
  const inspectIds = [1008, 1053, 607, 974, 1093]
  console.log("\n=== ĐỐI CHIẾU CÁC HỌC VIÊN ĐƯỢC RÀ SOÁT ===")
  for (const id of inspectIds) {
    const e = enrollments.find(x => x.userId === id)
    if (e) {
      const finalTime = finalActivationMap.get(id)
      console.log(`- User #${id} (${e.user?.name}): Đăng ký: ${e.createdAt.toISOString()} ➔ Kích hoạt chuẩn: ${finalTime?.toISOString()}`)
    }
  }
}

main().finally(() => prisma.$disconnect())
