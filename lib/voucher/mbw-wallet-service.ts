'use server'

import prisma from '@/lib/prisma'

export interface MbwBalance {
  cash: number
  brkd: number
  voucherBalance: number
  affiliatePending: number
  affiliateAvailable: number
  totalMbp: number
  totalMdt: number
  totalCash: number
}

/**
 * Aggregator — đọc từ BrkWallet + AffiliateWallet, không có model riêng.
 * Trả về tổng hợp số dư cho MBW Wallet UI (chưa cần UI, backend trước).
 */
export async function getMbwBalance(userId: number): Promise<MbwBalance> {
  const [brkWallet, affiliateWallet] = await Promise.all([
    prisma.brkWallet.findUnique({ where: { userId } }),
    prisma.affiliateWallet.findUnique({ where: { userId } })
  ])

  const brkBalance = Number(brkWallet?.balance ?? 0)
  const brkBrkd = Number(brkWallet?.brkd ?? 0)
  const brkVoucherBalance = Number(brkWallet?.voucherBalance ?? 0)
  const brkTotalEarned = Number(brkWallet?.totalEarned ?? 0)

  const affPending = Number(affiliateWallet?.pendingBalance ?? 0)
  const affAvailable = Number(affiliateWallet?.balance ?? 0)

  return {
    cash: brkBalance,
    brkd: brkBrkd,
    voucherBalance: brkVoucherBalance,
    affiliatePending: affPending,
    affiliateAvailable: affAvailable,
    totalMbp: brkTotalEarned,
    totalMdt: brkBrkd,
    totalCash: brkBalance + affAvailable,
  }
}
