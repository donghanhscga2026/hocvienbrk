import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('=== QUÉT TẤT CẢ CÁC GIAO DỊCH TRỪ VÍ KHÓA HỌC (MBV / VNĐ) ===\n')

  const txs = await prisma.brkTransaction.findMany({
    where: {
      OR: [
        { refId: { startsWith: 'course_' } },
        { refId: { startsWith: 'course_cash_' } }
      ]
    },
    include: {
      wallet: true
    }
  })

  console.log(`Phát hiện ${txs.length} giao dịch trừ ví liên quan đến khóa học.\n`)

  for (const tx of txs) {
    const userId = tx.wallet.userId
    let courseId: number | null = null

    if (tx.refId?.startsWith('course_cash_')) {
      courseId = parseInt(tx.refId.replace('course_cash_', ''), 10)
    } else if (tx.refId?.startsWith('course_')) {
      courseId = parseInt(tx.refId.replace('course_', ''), 10)
    }

    if (!courseId) continue

    const [user, course, enrollment] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, phone: true } }),
      prisma.course.findUnique({ where: { id: courseId }, select: { id: true, id_khoa: true, name_lop: true, phi_coc: true } }),
      prisma.enrollment.findUnique({ where: { userId_courseId: { userId, courseId } } })
    ])

    console.log(`- Tx #${tx.id} | User #${userId} (${user?.name}) | Khóa #${courseId} (${course?.name_lop})`)
    console.log(`  BalanceType: ${tx.balanceType} | Số tiền: ${tx.amount} VNĐ | Mô tả: ${tx.description}`)
    console.log(`  Enrollment Status: ${enrollment?.status || 'N/A'} | Phi cọc trong DB: ${enrollment?.phi_coc} VNĐ | Học phí gốc: ${course?.phi_coc} VNĐ\n`)
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
