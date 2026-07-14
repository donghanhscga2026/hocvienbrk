import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function backfill() {
  console.log('=== BACKFILL ACTIVITY LOGS ===\n')

  let totalCreated = 0

  // 1. REGISTER — từ User.createdAt
  console.log('📥 Backfilling REGISTER from Users...')
  const users = await prisma.user.findMany({
    select: { id: true, createdAt: true, email: true },
    orderBy: { createdAt: 'asc' }
  })
  const registerData = users.map(u => ({
    userId: u.id,
    action: 'REGISTER',
    detail: `Đăng ký tài khoản: ${u.email}`,
    createdAt: u.createdAt,
  }))
  if (registerData.length > 0) {
    const r = await prisma.activityLog.createMany({ data: registerData, skipDuplicates: true })
    console.log(`  ✅ ${r.count} REGISTER logs`)
    totalCreated += r.count
  }

  // 2. ENROLL_FREE / ENROLL_PAID — từ Enrollment
  console.log('📥 Backfilling ENROLL from Enrollments...')
  const enrollments = await prisma.enrollment.findMany({
    select: {
      userId: true, courseId: true, status: true, createdAt: true,
      course: { select: { name_lop: true, id_khoa: true, phi_coc: true } }
    },
    orderBy: { createdAt: 'asc' }
  })
  const enrollData = enrollments
    .filter(e => e.status === 'ACTIVE' && e.course)
    .map(e => ({
      userId: e.userId,
      action: (Number(e.course.phi_coc) === 0 ? 'ENROLL_FREE' : 'ENROLL_PAID') as string,
      detail: `${Number(e.course.phi_coc) === 0 ? 'Kích hoạt miễn phí' : 'Đăng ký khóa học'}: ${e.course.name_lop} (${e.course.id_khoa})`,
      metadata: { courseId: e.courseId, idKhoa: e.course.id_khoa },
      createdAt: e.createdAt,
    }))
  if (enrollData.length > 0) {
    const r = await prisma.activityLog.createMany({ data: enrollData, skipDuplicates: true })
    console.log(`  ✅ ${r.count} ENROLL logs`)
    totalCreated += r.count
  }

  // 3. PAYMENT_VERIFIED — từ Payment (verified)
  console.log('📥 Backfilling PAYMENT_VERIFIED from Payments...')
  const payments = await prisma.payment.findMany({
    where: { status: 'VERIFIED' },
    include: {
      enrollment: {
        select: { userId: true, courseId: true, course: { select: { name_lop: true } } }
      }
    },
    orderBy: { createdAt: 'asc' }
  })
  const paymentData = payments
    .filter(p => p.enrollment?.userId && p.enrollment?.course)
    .map(p => ({
      userId: p.enrollment!.userId,
      action: 'PAYMENT_VERIFIED',
      detail: `Xác minh thanh toán: ${p.enrollment!.course!.name_lop} - ${Number(p.amount).toLocaleString()}đ`,
      metadata: { courseId: p.enrollment!.courseId, amount: Number(p.amount) },
      createdAt: p.verifiedAt || p.createdAt,
    }))
  if (paymentData.length > 0) {
    const r = await prisma.activityLog.createMany({ data: paymentData, skipDuplicates: true })
    console.log(`  ✅ ${r.count} PAYMENT_VERIFIED logs`)
    totalCreated += r.count
  }

  // 4. WALLET_CHANGE — từ BrkTransaction
  console.log('📥 Backfilling WALLET_CHANGE from BrkTransactions...')
  const brkTxns = await prisma.brkTransaction.findMany({
    select: {
      walletId: true, amount: true, type: true, description: true, balanceType: true, createdAt: true,
      wallet: { select: { userId: true } }
    },
    orderBy: { createdAt: 'asc' }
  })
  const walletData = brkTxns.map(t => ({
    userId: t.wallet.userId,
    action: 'WALLET_CHANGE' as string,
    detail: `${t.balanceType} ${Number(t.amount) >= 0 ? '+' : ''}${Number(t.amount).toLocaleString()}đ: ${t.description}`,
    metadata: { balanceType: t.balanceType, amount: Number(t.amount), type: t.type },
    createdAt: t.createdAt,
  }))
  if (walletData.length > 0) {
    const r = await prisma.activityLog.createMany({ data: walletData, skipDuplicates: true })
    console.log(`  ✅ ${r.count} WALLET_CHANGE logs (BRK)`)
    totalCreated += r.count
  }

  // 5. WALLET_CHANGE — từ AffiliateTransaction
  console.log('📥 Backfilling WALLET_CHANGE from AffiliateTransactions...')
  const affTxns = await prisma.affiliateTransaction.findMany({
    select: {
      walletId: true, amount: true, type: true, description: true, createdAt: true,
      wallet: { select: { userId: true } }
    },
    orderBy: { createdAt: 'asc' }
  })
  const affWalletData = affTxns.map(t => ({
    userId: t.wallet.userId,
    action: 'WALLET_CHANGE' as string,
    detail: `AFF ${Number(t.amount) >= 0 ? '+' : ''}${Number(t.amount).toLocaleString()}đ: ${t.description}`,
    metadata: { balanceType: 'AFFILIATE', amount: Number(t.amount), type: t.type },
    createdAt: t.createdAt,
  }))
  if (affWalletData.length > 0) {
    const r = await prisma.activityLog.createMany({ data: affWalletData, skipDuplicates: true })
    console.log(`  ✅ ${r.count} WALLET_CHANGE logs (Affiliate)`)
    totalCreated += r.count
  }

  // 6. AFFILIATE_CLICK — từ AffiliateClick (resolve userId from link)
  console.log('📥 Backfilling AFFILIATE_CLICK from AffiliateClicks...')
  const clicks = await prisma.affiliateClick.findMany({
    select: {
      id: true, ipAddress: true, deviceType: true, createdAt: true,
      link: { select: { userId: true } }
    },
    orderBy: { createdAt: 'asc' }
  })
  const clickData = clicks
    .filter(c => c.link?.userId)
    .map(c => ({
      userId: c.link!.userId,
      action: 'AFFILIATE_CLICK' as string,
      detail: 'Click link affiliate',
      metadata: { deviceType: c.deviceType, ipAddress: c.ipAddress },
      createdAt: c.createdAt,
    }))
  if (clickData.length > 0) {
    const r = await prisma.activityLog.createMany({ data: clickData, skipDuplicates: true })
    console.log(`  ✅ ${r.count} AFFILIATE_CLICK logs`)
    totalCreated += r.count
  }

  console.log(`\n=== HOÀN TẤT: ${totalCreated} activity logs đã tạo ===`)
}

backfill()
  .then(() => process.exit(0))
  .catch(e => { console.error(e); process.exit(1) })
