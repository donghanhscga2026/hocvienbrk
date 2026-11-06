import 'server-only'
import prisma from '@/lib/prisma'
import { checkoutKey, readPurchase } from './purchase-snapshot'

// Khóa cả phép tính phần còn thiếu và ghi sổ ví để hai tab không trả trùng.
export async function debitCheckoutWallets(userId: number, courseId: number, options: { useVoucher: boolean; voucherAmount: number; useCash: boolean }) {
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'wallet-checkout:' + userId + ':' + courseId}))`
    const enrollment = await tx.enrollment.findUnique({ where: { userId_courseId: { userId, courseId } }, include: { payment: true } })
    if (enrollment) {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'enrollment-order:' + enrollment.id}))`
      const current = await tx.enrollment.findUnique({ where: { id: enrollment.id } })
      if (!current || ['CANCELLED', 'REJECTED'].includes(current.status)) throw new Error('Đăng ký đã hủy hoặc bị từ chối.')
      if (['ACTIVE', 'COMPLETED'].includes(current.status)) return { remaining: 0, voucherDeducted: 0, cashDeducted: 0, walletPaid: 0 }
    }
    const course = await tx.course.findUnique({ where: { id: courseId }, select: { phi_coc: true, id_khoa: true, allowMbvDeduction: true, voucherConfig: true } })
    if (!course) throw new Error('Không tìm thấy sản phẩm.')
    const purchase = enrollment ? await readPurchase(tx, enrollment.id) : null
    const intent = await tx.systemConfig.findUnique({ where: { key: checkoutKey(userId, courseId) } })
    const price = purchase?.price ?? (intent?.value as { price?: number } | null)?.price ?? enrollment?.phi_coc ?? course.phi_coc
    const benefitVoucherId = purchase?.benefitVoucherId ?? enrollment?.payment?.voucherId ?? null
    const amountDue = purchase?.benefitAmountDue ?? (benefitVoucherId != null ? enrollment?.phi_coc ?? price : price)
    if (benefitVoucherId != null && (options.useCash || options.useVoucher)) throw new Error('Lượt thanh toán đã dùng quà tặng, không kết hợp thêm ví.')
    const allowed = course.allowMbvDeduction && course.voucherConfig === 'WALLET'
    if ((options.useCash || options.useVoucher) && !allowed) throw new Error('Sản phẩm chưa cho phép thanh toán bằng ví.')
    await tx.$queryRaw`SELECT id FROM "brk_wallet" WHERE "userId" = ${userId} FOR UPDATE`
    const wallet = await tx.brkWallet.findUnique({ where: { userId } })
    if (!wallet) return { remaining: amountDue, voucherDeducted: 0, cashDeducted: 0, walletPaid: 0 }
    const [mbv, cash] = await Promise.all([
      tx.brkTransaction.aggregate({ where: { walletId: wallet.id, refId: 'course_' + courseId }, _sum: { amount: true } }),
      tx.brkTransaction.aggregate({ where: { walletId: wallet.id, refId: 'course_cash_' + courseId }, _sum: { amount: true } }),
    ])
    const alreadyPaid = Math.abs(Number(mbv._sum.amount) || 0) + Math.abs(Number(cash._sum.amount) || 0)
    let remaining = Math.max(0, amountDue - alreadyPaid)
    const requested = Number.isFinite(options.voucherAmount) ? Math.max(0, Math.floor(options.voucherAmount)) : 0
    const voucherDeducted = options.useVoucher ? Math.floor(Math.min(Math.max(0, Number(wallet.mbvBalance)), requested, remaining)) : 0
    remaining -= voucherDeducted
    const cashDeducted = options.useCash ? Math.floor(Math.min(Math.max(0, Number(wallet.balance)), remaining)) : 0
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
    return { remaining, voucherDeducted, cashDeducted, walletPaid: alreadyPaid + voucherDeducted + cashDeducted }
  }, { timeout: 20000 })
}
