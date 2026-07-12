'use server'

import { auth } from '@/auth'
import prisma from '@/lib/prisma'

export interface MbwDashboardData {
  user: { name: string | null; email: string | null }
  balance: {
    cash: number
    brkd: number
    voucherBalance: number
    affiliatePending: number
    affiliateAvailable: number
  }
  vouchers: {
    id: number
    voucherCode: string
    voucherName: string
    voucherType: string
    expiresAt: string | null
    awardedAt: string
  }[]
}

export async function getMbwDashboard(): Promise<MbwDashboardData> {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  const userId = Number(session.user.id)

  const [user, brkWallet, affWallet, userVouchers] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true }
    }),
    prisma.brkWallet.findUnique({ where: { userId } }),
    prisma.affiliateWallet.findUnique({ where: { userId } }),
    prisma.userVoucher.findMany({
      where: { userId, status: 'ACTIVE' },
      include: { voucher: true },
      orderBy: { createdAt: 'desc' }
    }),
  ])

  return {
    user: { name: user?.name ?? null, email: user?.email ?? null },
    balance: {
      cash: Number(brkWallet?.balance ?? 0),
      brkd: Number(brkWallet?.brkd ?? 0),
      voucherBalance: Number(brkWallet?.voucherBalance ?? 0),
      affiliatePending: Number(affWallet?.pendingBalance ?? 0),
      affiliateAvailable: Number(affWallet?.balance ?? 0),
    },
    vouchers: userVouchers.map((uv: any) => ({
      id: uv.id,
      voucherCode: uv.voucher.code,
      voucherName: uv.voucher.name,
      voucherType: uv.voucher.type,
      expiresAt: uv.expiresAt?.toISOString() || null,
      awardedAt: uv.createdAt.toISOString(),
    })),
  }
}
