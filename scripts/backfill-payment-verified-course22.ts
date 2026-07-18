/**
 * backfill-payment-verified-cOURSE22.ts
 *
 * Tạo activity log PAYMENT_VERIFIED cho enrollment courseId=22
 * những người có payment.status = VERIFIED nhưng thiếu log.
 * Dùng payment.verifiedAt làm createdAt để đảm bảo đúng thứ tự.
 *
 * Cách chạy:
 *   npx tsx scripts/backfill-payment-verified-course22.ts           → Dry-run
 *   npx tsx scripts/backfill-payment-verified-course22.ts --execute  → Thực sự tạo
 */

import { PrismaClient } from '@prisma/client'
import * as readline from 'readline'

const prisma = new PrismaClient()
const COURSE_ID = 22

async function askConfirmation(question: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(resolve => {
    rl.question(`\n⚠️  ${question} (y/N): `, answer => {
      rl.close()
      resolve(answer.toLowerCase() === 'y')
    })
  })
}

async function main() {
  const isExecute = process.argv.includes('--execute')

  console.log('╔══════════════════════════════════════════════════════╗')
  console.log('║  BACKFILL PAYMENT_VERIFIED — courseId=22            ║')
  console.log('╠══════════════════════════════════════════════════════╣')
  console.log(`║  Mode: ${isExecute ? '🔴 EXECUTE (TẠO THỰC TẾ)  ' : '🟢 DRY-RUN (CHỈ XEM)       '}║`)
  console.log('╚══════════════════════════════════════════════════════╝')

  // 1. Tìm tất cả payment VERIFIED cho courseId=22
  const payments = await prisma.payment.findMany({
    where: {
      status: 'VERIFIED',
      enrollment: { courseId: COURSE_ID }
    },
    include: {
      enrollment: {
        select: {
          userId: true,
          courseId: true,
          course: { select: { name_lop: true } }
        }
      }
    },
    orderBy: { verifiedAt: 'asc' }
  })

  console.log(`\n📋 Tổng payment VERIFIED courseId=22: ${payments.length}`)

  // 2. Kiểm tra哪些 người đã có log PAYMENT_VERIFIED
  const missingLogs: typeof payments = []
  const existingLogs: typeof payments = []

  for (const payment of payments) {
    if (!payment.enrollment) continue
    const existing = await prisma.activityLog.findFirst({
      where: {
        userId: payment.enrollment.userId,
        action: 'PAYMENT_VERIFIED',
        metadata: { path: ['courseId'], equals: COURSE_ID }
      }
    })
    if (existing) {
      existingLogs.push(payment)
    } else {
      missingLogs.push(payment)
    }
  }

  console.log(`✅ Đã có log: ${existingLogs.length}`)
  console.log(`❌ Thiếu log: ${missingLogs.length}`)

  if (missingLogs.length === 0) {
    console.log('\nℹ️  Không thiếu log nào. Kết thúc.')
    return
  }

  console.log('\n📋 Chi tiết những người THIẾU log:')
  for (const p of missingLogs) {
    const time = p.verifiedAt?.toLocaleString('vi-VN') || 'N/A'
    console.log(`   - User#${p.enrollment!.userId} | payment.verifiedAt: ${time} | amount: ${Number(p.amount).toLocaleString()}đ`)
  }

  if (!isExecute) {
    console.log('\n' + '─'.repeat(60))
    console.log('📌 Đây là DRY-RUN — không tạo log nào.')
    console.log('📌 Để thực sự tạo, chạy lại với --execute:')
    console.log('   npx tsx scripts/backfill-payment-verified-course22.ts --execute')
    console.log('─'.repeat(60))
    return
  }

  const confirmed = await askConfirmation(
    `Tạo ${missingLogs.length} PAYMENT_VERIFIED logs cho courseId=22?`
  )
  if (!confirmed) {
    console.log('❌ Đã hủy.')
    return
  }

  // 3. Tạo activity log — dùng payment.verifiedAt làm createdAt
  let created = 0
  for (const payment of missingLogs) {
    if (!payment.enrollment) continue
    const createdAt = payment.verifiedAt || payment.createdAt
    try {
      await prisma.activityLog.create({
        data: {
          userId: payment.enrollment.userId,
          action: 'PAYMENT_VERIFIED',
          detail: `Xác minh thanh toán: ${payment.enrollment.course!.name_lop} - ${Number(payment.amount).toLocaleString()}đ`,
          metadata: { courseId: payment.enrollment.courseId, amount: Number(payment.amount) },
          createdAt,
        }
      })
      console.log(`   ✅ User#${payment.enrollment.userId} — createdAt: ${createdAt.toLocaleString('vi-VN')}`)
      created++
    } catch (err: any) {
      console.error(`   ❌ User#${payment.enrollment.userId} — error: ${err.message}`)
    }
  }

  console.log(`\n🎉 HOÀN TẤT: Đã tạo ${created}/${missingLogs.length} PAYMENT_VERIFIED logs`)
}

main()
  .catch(e => { console.error('Fatal:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
