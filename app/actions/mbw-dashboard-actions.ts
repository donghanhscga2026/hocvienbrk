'use server'

import { auth } from '@/auth'
import prisma from '@/lib/prisma'

export interface MbwDashboardData {
  user: { id: number; name: string | null; email: string | null }
  balance: {
    cash: number
    brkd: number
    voucherBalance: number
    mbvBalance: number
  }
  vouchers: {
    id: number
    voucherCode: string
    voucherName: string
    voucherType: string
    description: string | null
    expiresAt: string | null
    awardedAt: string
  }[]
}

export async function getMbwDashboard(): Promise<MbwDashboardData> {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  const userId = Number(session.user.id)

  const [user, brkWallet, userVouchers] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true }
    }),
    prisma.brkWallet.findUnique({
      where: { userId },
      select: { balance: true, brkd: true, voucherBalance: true, mbvBalance: true }
    }),
    prisma.userVoucher.findMany({
      where: { userId, status: 'ACTIVE' },
      include: { voucher: { select: { code: true, name: true, type: true, description: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50
    }),
  ])

  return {
    user: { id: user?.id ?? userId, name: user?.name ?? null, email: user?.email ?? null },
    balance: {
      cash: Number(brkWallet?.balance ?? 0),
      brkd: Number(brkWallet?.brkd ?? 0),
      voucherBalance: Number(brkWallet?.voucherBalance ?? 0),
      mbvBalance: Number(brkWallet?.mbvBalance ?? 0),
    },
    vouchers: userVouchers.map((uv: any) => ({
      id: uv.id,
      voucherCode: uv.voucher.code,
      voucherName: uv.voucher.name,
      voucherType: uv.voucher.type,
      description: uv.voucher.description ?? null,
      expiresAt: uv.expiresAt?.toISOString() || null,
      awardedAt: uv.createdAt.toISOString(),
    })),
  }
}
