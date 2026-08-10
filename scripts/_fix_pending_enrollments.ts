import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('=== THỰC THI ĐỒNG BỘ CẬP NHẬT SỐ TIỀN PHÍ CỌC TRONG DB CHO CÁC ENROLLMENT PENDING ===\n')

  const targetUsers = [607, 769, 794, 1029, 1180]

  for (const userId of targetUsers) {
    const wallet = await prisma.brkWallet.findUnique({ where: { userId } })
    if (!wallet) continue

    const courseId = 38 // Zalo Mastery
    const course = await prisma.course.findUnique({ where: { id: courseId } })
    if (!course) continue

    const [mbvTx, cashTx] = await Promise.all([
      prisma.brkTransaction.findFirst({ where: { walletId: wallet.id, refId: `course_${courseId}`, amount: { lt: 0 } } }),
      prisma.brkTransaction.findFirst({ where: { walletId: wallet.id, refId: `course_cash_${courseId}`, amount: { lt: 0 } } })
    ])

    const mbvDeducted = Math.abs(Number(mbvTx?.amount || 0))
    const cashDeducted = Math.abs(Number(cashTx?.amount || 0))
    const totalDeducted = Math.floor(mbvDeducted + cashDeducted)
    const expectedPhiCoc = Math.max(0, course.phi_coc - totalDeducted)

    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } }
    })

    if (enrollment) {
      console.log(`User #${userId}: Cập nhật phi_coc từ ${enrollment.phi_coc} VNĐ -> ${expectedPhiCoc} VNĐ`)
      await prisma.enrollment.update({
        where: { id: enrollment.id },
        data: { phi_coc: expectedPhiCoc }
      })
    }
  }

  console.log('\n Đã cập nhật thành công dữ liệu cho tất cả các tài khoản.')
}

main().catch(console.error).finally(() => prisma.$disconnect())
