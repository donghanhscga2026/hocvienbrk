'use server'

import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { activateBrkMember, cancelBrkMemberWithinGrace, processGracePeriodExpirations } from '@/lib/brk/activation-service'
import { getBrkWallet, getBrkTransactionHistory } from '@/lib/brk/wallet-service'
import { getLevelProgress, claimLevelGift } from '@/lib/brk/level-manager'
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

  const [systems, wallet] = await Promise.all([
    prisma.system.findMany({
      where: { userId, status: 'ACTIVE' },
      include: {
        systemTree: {
          select: { onSystem: true, nameSystem: true, fee: true, durationDays: true }
        }
      }
    }),
    getBrkWallet(userId)
  ])

  const walletBalance = wallet ? Number(wallet.balance) : 0
  if (systems.length === 0) return { walletBalance, systems: [] }

  // Load config level cho tất cả system chỉ 1 lần (thay vì query lại trong từng system)
  const onSystems = [...new Set(systems.map(s => s.onSystem))]
  const allConfigsBySystem = new Map<number, Awaited<ReturnType<typeof getAllLevelConfigs>>>()
  const configRows = await prisma.brkLevelConfig.findMany({
    where: { systemId: { in: onSystems } },
    include: { branchReqs: true },
    orderBy: { level: 'asc' }
  })
  for (const onSystem of onSystems) {
    allConfigsBySystem.set(onSystem, configRows.filter(c => c.systemId === onSystem))
  }

  // Gộp toàn bộ count F1 thành 1 query groupBy
  const f1Groups = await prisma.systemClosure.groupBy({
    by: ['ancestorId'],
    where: { ancestorId: { in: systems.map(s => s.autoId) }, depth: 1, systemId: { in: onSystems } },
    _count: { _all: true }
  })
  const f1CountByAutoId = new Map(f1Groups.map(g => [g.ancestorId, g._count._all]))

  // Gộp timeline legacy (applicationId null) thành 1 query
  const legacyTimelineRecs = await prisma.brkTimelineRecord.findMany({
    where: { userId, onSystem: { in: onSystems }, applicationId: null },
    orderBy: { id: 'desc' },
    distinct: ['onSystem']
  })
  const latestLegacyBySystem = new Map(legacyTimelineRecs.map(r => [r.onSystem, r]))

  const systemInfos = systems.map((sys) => {
    const f1Count = f1CountByAutoId.get(sys.autoId) ?? 0
    const levelProgress = getInlineLevelProgress(
      { level: sys.level, totalPoints: Number(sys.totalPoints) },
      allConfigsBySystem.get(sys.onSystem) ?? []
    )
    const latestLegacyTimeline = latestLegacyBySystem.get(sys.onSystem)

    return {
      onSystem: sys.onSystem,
      nameSystem: sys.systemTree.nameSystem,
      level: sys.level,
      totalPoints: Number(sys.totalPoints),
      f1Count,
      totalDownline: sys.applicationId != null
        ? sys.officialTeamSize
        : latestLegacyTimeline?.accumulatedTeamSize ?? 1,
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
    }
  })

  return { walletBalance, systems: systemInfos }
}

// Tính tiến trình level inline từ system record + config đã load, không query DB
function getInlineLevelProgress(
  systemRec: { level: number | null; totalPoints: number | null },
  allConfigs: Awaited<ReturnType<typeof getAllLevelConfigs>>
) {
  const currentLevel = systemRec.level || 1
  const totalPoints = Number(systemRec.totalPoints || 0)

  const nextConfig = allConfigs.find(c => c.level === currentLevel + 1)
  const currentConfig = allConfigs.find(c => c.level === currentLevel)

  let progress = 0
  let pointsNeeded = 0
  if (nextConfig) {
    pointsNeeded = Math.max(0, Number(nextConfig.pointsRequired) - totalPoints)
    const range = Number(nextConfig.pointsRequired) - (currentConfig ? Number(currentConfig.pointsRequired) : 0)
    const earned = totalPoints - (currentConfig ? Number(currentConfig.pointsRequired) : 0)
    progress = range > 0 ? Math.min(100, Math.round((earned / range) * 100)) : 0
  } else {
    progress = 100
  }

  return { currentLevel, totalPoints, currentConfig, nextConfig, progress, pointsNeeded }
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
      brkd: Number(wallet.brkd),
      voucherBalance: Number(wallet.voucherBalance),
      mbvBalance: Number(wallet.mbvBalance),
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

export async function previewMoveMemberAction(
  sourceUserId: number,
  newReferrerUserId: number
) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  const admin = await prisma.user.findUnique({ where: { id: Number(session.user.id) }, select: { role: true } })
  if (admin?.role !== 'ADMIN') throw new Error('Only admins can perform this action')

  const { previewMove } = await import('@/lib/brk/tree-surgery-service')
  return previewMove(sourceUserId, newReferrerUserId)
}

export async function moveBrkMemberAction(
  sourceUserId: number,
  newReferrerUserId: number,
  reason: string
) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  const admin = await prisma.user.findUnique({ where: { id: Number(session.user.id) }, select: { role: true } })
  if (admin?.role !== 'ADMIN') throw new Error('Only admins can perform this action')

  const { moveBrkMember } = await import('@/lib/brk/tree-surgery-service')
  const result = await moveBrkMember(sourceUserId, newReferrerUserId, reason, Number(session.user.id))

  if (result.success) {
    revalidatePath('/tools/brk')
  }
  return result
}

export async function rebuildBrkSubtreeAction(
  parentUserId: number,
  memberIds: number[],
  reason: string
) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  const admin = await prisma.user.findUnique({ where: { id: Number(session.user.id) }, select: { role: true } })
  if (admin?.role !== 'ADMIN') throw new Error('Only admins can perform this action')

  const { rebuildSubtree } = await import('@/lib/brk/tree-surgery-service')
  const result = await rebuildSubtree(parentUserId, memberIds, reason, Number(session.user.id))

  if (result.success) {
    revalidatePath('/tools/brk')
  }
  return result
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
