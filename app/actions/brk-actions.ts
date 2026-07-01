'use server'

import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { activateBrkMember, cancelBrkMemberWithinGrace, processGracePeriodExpirations } from '@/lib/brk/activation-service'
import { getBrkWallet, getBrkTransactionHistory } from '@/lib/brk/wallet-service'
import { getLevelProgress, claimLevelGift, createReferralBonus } from '@/lib/brk/level-manager'
import { getSystemTreeByCourseId, getAllLevelConfigs } from '@/lib/brk/config-service'
import { getRevenueShareHistory } from '@/lib/brk/revenue-share-service'
import { addUserToSystemClosure } from '@/lib/system-closure-helpers'

export async function createBrkSystem(formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  const nameSystem = formData.get('nameSystem') as string
  const fee = Number(formData.get('fee') || 1)
  const durationDays = Number(formData.get('durationDays') || 30)
  const graceDays = Number(formData.get('graceDays') || 7)
  const returnPct = Number(formData.get('returnPct') || 21)
  const courseId = formData.get('courseId') ? Number(formData.get('courseId')) : null

  if (!nameSystem) throw new Error('nameSystem is required')

  const maxOnSystem = await prisma.systemTree.findFirst({ orderBy: { onSystem: 'desc' } })
  const onSystem = (maxOnSystem?.onSystem ?? 0) + 1

  const systemTree = await prisma.systemTree.create({
    data: {
      onSystem,
      nameSystem,
      courseId,
      creatorId: Number(session.user.id),
      fee,
      durationDays,
      graceDays,
      returnPct,
    }
  })

  await addUserToSystemClosure(Number(session.user.id), 0, onSystem)

  await prisma.system.create({
    data: {
      userId: Number(session.user.id),
      onSystem,
      refSysId: 0,
      status: 'ACTIVE',
      activatedAt: new Date(),
      level: 1,
    }
  })

  revalidatePath('/tools/brk')
  return { success: true, onSystem }
}

export async function getBrkDashboard() {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  const userId = Number(session.user.id)

  const systems = await prisma.system.findMany({
    where: { userId, status: 'ACTIVE' },
    include: {
      systemTree: {
        select: { onSystem: true, nameSystem: true, fee: true, durationDays: true }
      }
    }
  })

  const wallet = await getBrkWallet(userId)
  const walletBalance = wallet ? Number(wallet.balance) : 0

  const systemInfos = []
  for (const sys of systems) {
    const f1Count = await prisma.systemClosure.count({
      where: { ancestorId: sys.autoId, depth: 1, systemId: sys.onSystem }
    })
    const totalDownline = await prisma.systemClosure.count({
      where: { ancestorId: sys.autoId, depth: { gte: 1 }, systemId: sys.onSystem }
    })
    const levelProgress = await getLevelProgress(userId, sys.onSystem)

    systemInfos.push({
      onSystem: sys.onSystem,
      nameSystem: sys.systemTree.nameSystem,
      level: sys.level,
      totalPoints: Number(sys.totalPoints),
      f1Count,
      totalDownline,
      activatedAt: sys.activatedAt?.toISOString() || null,
      expiresAt: sys.expiresAt?.toISOString() || null,
      gracePeriodEnd: sys.gracePeriodEnd?.toISOString() || null,
      levelProgress: levelProgress ? {
        currentLevel: levelProgress.currentLevel,
        totalPoints: levelProgress.totalPoints,
        progress: levelProgress.progress,
        pointsNeeded: levelProgress.pointsNeeded,
        nextConfig: levelProgress.nextConfig ? { level: levelProgress.nextConfig.level } : null,
      } : null,
      bonusEligible: f1Count >= 2,
    })
  }

  return { walletBalance, systems: systemInfos }
}

export async function joinBrkSystem(onSystem: number) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  const userId = Number(session.user.id)

  const systemTree = await prisma.systemTree.findUnique({ where: { onSystem } })
  if (!systemTree) throw new Error('System not found')
  if (!systemTree.courseId) throw new Error('BRK system chưa được cấu hình khóa học.')

  const existingEnrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId: systemTree.courseId } }
  })
  if (existingEnrollment?.status === 'ACTIVE') {
    return { success: true, status: 'ACTIVE' }
  }

  const { enrollInCourseAction } = await import('./course-actions')
  const result = await enrollInCourseAction(systemTree.courseId)

  const course = await prisma.course.findUnique({
    where: { id: systemTree.courseId },
    select: { id_khoa: true }
  })

  revalidatePath('/tools/brk')
  return { success: true, status: result.status, courseIdKhoa: course?.id_khoa }
}

export async function cancelBrkMembership(onSystem: number) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  const userId = Number(session.user.id)

  const result = await cancelBrkMemberWithinGrace(userId, onSystem)
  revalidatePath('/tools/brk')
  return result
}

export async function getBrkWalletData() {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  const userId = Number(session.user.id)

  const wallet = await getBrkWallet(userId)
  const transactions = await getBrkTransactionHistory(userId)
  return {
    wallet: wallet ? {
      balance: Number(wallet.balance),
      totalEarned: Number(wallet.totalEarned),
      totalWithdrawn: Number(wallet.totalWithdrawn),
    } : null,
    transactions: transactions.map(tx => ({
      id: tx.id,
      amount: Number(tx.amount),
      type: tx.type,
      description: tx.description,
      balanceBefore: Number(tx.balanceBefore),
      balanceAfter: Number(tx.balanceAfter),
      createdAt: tx.createdAt.toISOString(),
    }))
  }
}

export async function getBrkLevelData(onSystem: number) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  const userId = Number(session.user.id)

  const progress = await getLevelProgress(userId, onSystem)
  const configs = await getAllLevelConfigs(onSystem)
  return { progress, configs }
}

export async function claimBrkLevelGift(onSystem: number, courseId: number) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  const userId = Number(session.user.id)

  const result = await claimLevelGift(userId, onSystem, courseId)
  revalidatePath('/tools/brk')
  return result
}

export async function getBrkRevenueShare(onSystem: number) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  const userId = Number(session.user.id)

  return getRevenueShareHistory(userId, onSystem)
}

export async function getAvailableBrkSystems() {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  const userId = Number(session.user.id)

  const allSystems = await prisma.systemTree.findMany({
    where: { fee: { gt: 0 } },
    select: {
      onSystem: true,
      nameSystem: true,
      fee: true,
      durationDays: true,
      graceDays: true,
      returnPct: true,
    }
  })

  const userSystems = await prisma.system.findMany({
    where: { userId },
    select: { onSystem: true, status: true }
  })
  const userSystemSet = new Set(userSystems.map(s => s.onSystem))

  return allSystems.map(sys => ({
    onSystem: sys.onSystem,
    nameSystem: sys.nameSystem,
    fee: Number(sys.fee),
    durationDays: sys.durationDays,
    graceDays: sys.graceDays,
    returnPct: Number(sys.returnPct),
    joined: userSystemSet.has(sys.onSystem),
    userStatus: userSystems.find(s => s.onSystem === sys.onSystem)?.status || null,
  }))
}
