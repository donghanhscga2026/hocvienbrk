import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('=== Bắt đầu quét toàn dự án tìm các trường hợp sai lệch học phí cọc (dry-run) ===\n')

  // 1. Lấy tất cả các BrkWallet
  const wallets = await prisma.brkWallet.findMany({
    select: { id: true, userId: true }
  })
  const walletMap = new Map(wallets.map(w => [w.userId, w.id]))

  // 2. Lấy tất cả Enrollments trạng thái PENDING
  const pendingEnrollments = await prisma.enrollment.findMany({
    where: { status: 'PENDING' },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true } },
      course: { select: { id: true, id_khoa: true, name_lop: true, phi_coc: true } }
    }
  })

  console.log(`Tổng số Enrollment PENDING trong hệ thống: ${pendingEnrollments.length}\n`)

  const affectedList: any[] = []

  for (const en of pendingEnrollments) {
    const walletId = walletMap.get(en.userId)
    if (!walletId) continue

    const courseId = en.courseId
    const coursePhiCoc = en.course?.phi_coc || 0

    // Tìm các giao dịch trừ ví MBV hoặc VNĐ cho khóa học này
    const [mbvTx, cashTx] = await Promise.all([
      prisma.brkTransaction.findFirst({
        where: { walletId, refId: `course_${courseId}`, amount: { lt: 0 } }
      }),
      prisma.brkTransaction.findFirst({
        where: { walletId, refId: `course_cash_${courseId}`, amount: { lt: 0 } }
      })
    ])

    if (mbvTx || cashTx) {
      const mbvDeducted = Math.abs(Number(mbvTx?.amount || 0))
      const cashDeducted = Math.abs(Number(cashTx?.amount || 0))
      const totalDeducted = mbvDeducted + cashDeducted
      const expectedPhiCoc = Math.max(0, coursePhiCoc - totalDeducted)
      const currentPhiCocInDb = Number(en.phi_coc)

      if (currentPhiCocInDb !== expectedPhiCoc) {
        affectedList.push({
          enrollmentId: en.id,
          userId: en.userId,
          userName: en.user.name,
          userPhone: en.user.phone,
          courseId: en.courseId,
          courseName: en.course.name_lop,
          courseIdKhoa: en.course.id_khoa,
          coursePhiCoc,
          mbvDeducted,
          cashDeducted,
          totalDeducted,
          currentPhiCocInDb,
          expectedPhiCoc,
          diff: currentPhiCocInDb - expectedPhiCoc
        })
      }
    }
  }

  console.log(`=== Kết quả quét: Phát hiện ${affectedList.length} trường hợp bị sai lệch ===\n`)

  if (affectedList.length === 0) {
    console.log('Không có trường hợp nào khác bị sai lệch.')
  } else {
    console.log(JSON.stringify(affectedList, null, 2))
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
