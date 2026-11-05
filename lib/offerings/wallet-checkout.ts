import 'server-only'
import prisma from '@/lib/prisma'

// Khóa cả phép tính phần còn thiếu và ghi sổ ví để hai tab không trả trùng.
export async function debitCheckoutWallets(userId: number, courseId: number, options: { useVoucher: boolean; voucherAmount: number; useCash: boolean }) {
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'wallet-checkout:' + userId + ':' + courseId}))`
    const enrollment = await tx.enrollment.findUnique({ where: { userId_courseId: { userId, courseId } } })
    if (enrollment) {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'enrollment-order:' + enrollment.id}))`
      const current = await tx.enrollment.findUnique({ where: { id: enrollment.id } })
      if (!current || ['CANCELLED', 'REJECTED'].includes(current.status)) throw new Error('Đăng ký đã hủy hoặc bị từ chối.')
      if (['ACTIVE', 'COMPLETED'].includes(current.status)) return { remaining: 0, voucherDeducted: 0, cashDeducted: 0 }
    }
    const course = await tx.course.findUnique({ where: { id: courseId }, select: { phi_coc: true, id_khoa: true, allowMbvDeduction: true, voucherConfig: true } })
    if (!course || !course.allowMbvDeduction || course.voucherConfig !== 'WALLET') throw new Error('Sản phẩm chưa cho phép thanh toán bằng ví.')
    await tx.$queryRaw`SELECT id FROM "brk_wallet" WHERE "userId" = ${userId} FOR UPDATE`
    const wallet = await tx.brkWallet.findUnique({ where: { userId } })
    if (!wallet) return { remaining: course.phi_coc, voucherDeducted: 0, cashDeducted: 0 }
    const [mbv, cash] = await Promise.all([
      tx.brkTransaction.aggregate({ where: { walletId: wallet.id, refId: 'course_' + courseId }, _sum: { amount: true } }),
      tx.brkTransaction.aggregate({ where: { walletId: wallet.id, refId: 'course_cash_' + courseId }, _sum: { amount: true } }),
    ])
    let remaining = Math.max(0, course.phi_coc - Math.abs(Number(mbv._sum.amount) || 0) - Math.abs(Number(cash._sum.amount) || 0))
    const requested = Number.isFinite(options.voucherAmount) ? Math.max(0, Math.floor(options.voucherAmount)) : 0
    const voucherDeducted = options.useVoucher ? Math.floor(Math.min(Number(wallet.mbvBalance), requested, remaining)) : 0
    remaining -= voucherDeducted
    const cashDeducted = options.useCash ? Math.floor(Math.min(Number(wallet.balance), remaining)) : 0
    remaining -= cashDeducted
    for (const part of [
      { amount: voucherDeducted, balance: Number(wallet.mbvBalance), balanceType: 'MBV' as const, refId: 'course_' + courseId },
      { amount: cashDeducted, balance: Number(wallet.balance), balanceType: 'CASH' as const, refId: 'course_cash_' + courseId },
    ]) {
      if (part.amount <= 0) continue
      await tx.brkTransaction.create({ data: { walletId: wallet.id, amount: -part.amount, type: 'ADJUSTMENT', balanceType: part.balanceType, refId: part.refId, sourceMemberId: userId,
        description: `Thanh toán ${course.id_khoa} (${part.balanceType})`, balanceBefore: part.balance, balanceAfter: part.balance - part.amount } })
    }
    if (voucherDeducted || cashDeducted) await tx.brkWallet.update({ where: { userId }, data: { mbvBalance: { decrement: voucherDeducted }, balance: { decrement: cashDeducted } } })
    return { remaining, voucherDeducted, cashDeducted }
  }, { timeout: 20000 })
}
