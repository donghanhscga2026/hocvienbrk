import prisma from '../lib/prisma'

const BRKP_PER_ACTIVATION = 17

async function main() {
  console.log('=== REBUILD METHOD B START ===')
  const start = Date.now()

  // 0. Config
  await prisma.systemConfig.upsert({
    where: { key: 'brk_promotion_logic' },
    update: { value: 'B' },
    create: { key: 'brk_promotion_logic', value: 'B' }
  })
  await prisma.systemTree.update({
    where: { onSystem: 4 },
    data: { nameSystem: 'MB - Ngân hàng phước báu', graceDays: 1 }
  })
  console.log('Config done')

  // 1. Cleanup — delete all system 4 data
  const systems = await prisma.system.findMany({ where: { onSystem: 4 }, select: { autoId: true, userId: true } })
  const autoIds = systems.map(s => s.autoId)
  const userIds = systems.map(s => s.userId)
  console.log(`Found ${systems.length} systems, ${autoIds.length} autoIds, ${userIds.length} userIds`)

  if (userIds.length > 0) {
    await prisma.brkRevenueAward.deleteMany({ where: { pool: { systemId: 4 } } })
    await prisma.brkRevenuePool.deleteMany({ where: { systemId: 4 } })
    if (autoIds.length > 0) {
      await prisma.systemClosure.deleteMany({ where: { OR: [{ ancestorId: { in: autoIds } }, { descendantId: { in: autoIds } }] } })
    }
    await prisma.brkLevelUpRecord.deleteMany({ where: { onSystem: 4 } })
    await prisma.brkReferralBonus.deleteMany({ where: { onSystem: 4 } })

    const wallets = await prisma.brkWallet.findMany({ where: { userId: { in: userIds } } })
    if (wallets.length > 0) {
      await prisma.brkTransaction.deleteMany({ where: { walletId: { in: wallets.map(w => w.id) } } })
      // Reset wallets
      for (const w of wallets) {
        await prisma.brkWallet.update({ where: { id: w.id }, data: { balance: 0, brkd: 0, voucherBalance: 0, totalEarned: 0, totalWithdrawn: 0 } })
      }
    }

    await prisma.system.deleteMany({ where: { onSystem: 4 } })
  }
  console.log('Cleanup done')

  // 2. Load enrollments
  const enrollments = await prisma.enrollment.findMany({
    where: { courseId: 22, status: 'ACTIVE' },
    include: {
      user: { select: { id: true, name: true, referrerId: true } },
      payment: { select: { transferTime: true, verifiedAt: true } },
    },
  })
  enrollments.sort((a: any, b: any) => {
    const ta = a.payment?.transferTime || a.payment?.verifiedAt || a.createdAt
    const tb = b.payment?.transferTime || b.payment?.verifiedAt || b.createdAt
    return ta.getTime() - tb.getTime()
  })
  console.log(`Found ${enrollments.length} enrollments`)

  const systemTree = await prisma.systemTree.findUnique({ where: { onSystem: 4 } })
  const fee = Number(systemTree?.fee || 26868)

  // 3. Group by day
  const enrollByDay = new Map<string, any[]>()
  for (const e of enrollments) {
    const d = (e.payment?.transferTime || e.payment?.verifiedAt || e.createdAt).toLocaleDateString('vi-VN')
    if (!enrollByDay.has(d)) enrollByDay.set(d, [])
    enrollByDay.get(d)!.push(e)
  }
  const sortedDays = Array.from(enrollByDay.keys())
  console.log(`Days: ${sortedDays.join(', ')}`)

  const now = new Date()
  let processedCount = 0
  const pending: { userId: number; activatedAt: Date; refSysId: number }[] = []
  let daysProcessed = 0
  const SHARE_PCT = Number(systemTree?.revenueSharePct || 2.0)

  function getEvalTime(year: number, month: number, day: number) {
    return new Date(Date.UTC(year, month, day - 1, 23, 8, 0))
  }
  function getCurrentEvalTime() {
    const n = new Date()
    const t = getEvalTime(n.getFullYear(), n.getMonth(), n.getDate())
    return t <= n ? t : getEvalTime(n.getFullYear(), n.getMonth(), n.getDate() - 1)
  }

  for (const day of sortedDays) {
    const dayEnrollments = enrollByDay.get(day)!
    const [d, m, y] = day.split('/')

    // Create systems for this day
    for (const enrollment of dayEnrollments) {
      const userId = enrollment.userId
      const activatedAt = enrollment.payment?.transferTime || enrollment.payment?.verifiedAt || enrollment.createdAt
      const graceEnd = new Date(activatedAt.getTime() + 24 * 60 * 60 * 1000)
      const expiresAt = new Date(activatedAt.getTime() + 30 * 24 * 60 * 60 * 1000)
      processedCount++
      let refSysId = 0
      if (processedCount <= 1) {
        // First member has refSysId=0
      } else {
        const effectiveReferrer = enrollment.referrerId || enrollment.user.referrerId
        refSysId = await (await import('../lib/brk/placement-rules')).resolvePlacement(4, effectiveReferrer)
      }

      await prisma.system.create({
        data: {
          userId, onSystem: 4, refSysId, status: 'ACTIVE',
          activatedAt, gracePeriodEnd: graceEnd, expiresAt, level: 1, totalPoints: 0
        }
      })
      await (await import('../lib/system-closure-helpers')).addUserToSystemClosure(userId, refSysId, 4)
      await (await import('../lib/brk/wallet-service')).ensureBrkWallet(userId)
      pending.push({ userId, activatedAt, refSysId })
    }

    const evalTime = getEvalTime(Number(y), Number(m) - 1, Number(d) + 1)
    if (evalTime > now) break

    const due = pending.filter(p => p.activatedAt.getTime() + 24 * 60 * 60 * 1000 <= evalTime.getTime())
    const remaining = pending.filter(p => p.activatedAt.getTime() + 24 * 60 * 60 * 1000 > evalTime.getTime())
    pending.length = 0
    pending.push(...remaining)

    if (due.length > 0) {
      console.log(`Day ${day}: confirming ${due.length} members at ${evalTime.toISOString()}`)
      for (const member of due) {
        await prisma.system.update({
          where: { userId_onSystem: { userId: member.userId, onSystem: 4 } },
          data: { totalPoints: { increment: BRKP_PER_ACTIVATION } }
        })
        await (await import('../lib/brk/commission-calculator')).distributeCommission(member.userId, 4, fee, systemTree!, evalTime)
        await (await import('../lib/brk/wallet-service')).creditBrkWallet(member.userId, (fee * 21) / 100, 'RETURN_FEE' as any, 'Hoàn 21% phí tham gia sau 1 ngày cân nhắc', undefined, evalTime)
        const brkdReturn = Math.round((12868686 * 21) / 100)
        if (brkdReturn > 0) {
          await (await import('../lib/brk/wallet-service')).creditBrkdWallet(member.userId, brkdReturn, 'BRKD hoàn 21% sau 1 ngày cân nhắc', undefined, evalTime)
        }
        await (await import('../lib/brk/level-manager')).checkAndPromoteLevel(member.userId, 4, evalTime, undefined, member.userId)

        const memberSys = await prisma.system.findUnique({ where: { userId_onSystem: { userId: member.userId, onSystem: 4 } } })
        if (memberSys) {
          const closures = await prisma.systemClosure.findMany({
            where: { descendantId: memberSys.autoId, depth: { gte: 1 }, systemId: 4 }
          })
          const ancestorSystems = await prisma.system.findMany({
            where: { autoId: { in: closures.map(c => c.ancestorId) } }
          })
          for (const ancestor of ancestorSystems) {
            await (await import('../lib/brk/level-manager')).checkAndPromoteLevel(ancestor.userId, 4, evalTime, undefined, ancestor.userId)
          }
        }
      }
    }

    daysProcessed++
    if (daysProcessed % 3 === 0) {
      await (await import('../lib/brk/revenue-share-service')).processRevenueShareForSystem(4, getEvalTime(Number(y), Number(m) - 1, Number(d) + 1))
      console.log(`Revenue share ${Math.floor(daysProcessed / 3)} done`)
    }
  }

  // Final: remaining pending
  if (pending.length > 0) {
    const due = pending.filter(p => p.activatedAt.getTime() + 24 * 60 * 60 * 1000 <= now.getTime())
    if (due.length > 0) {
      const latestEval = getCurrentEvalTime()
      console.log(`Final: confirming ${due.length} members at ${latestEval.toISOString()}`)
      for (const member of due) {
        await prisma.system.update({
          where: { userId_onSystem: { userId: member.userId, onSystem: 4 } },
          data: { totalPoints: { increment: BRKP_PER_ACTIVATION } }
        })
        await (await import('../lib/brk/commission-calculator')).distributeCommission(member.userId, 4, fee, systemTree!, latestEval)
        await (await import('../lib/brk/wallet-service')).creditBrkWallet(member.userId, (fee * 21) / 100, 'RETURN_FEE' as any, 'Hoàn 21% phí tham gia sau 1 ngày cân nhắc', undefined, latestEval)
        const brkdReturn = Math.round((12868698 * 21) / 100)
        if (brkdReturn > 0) {
          await (await import('../lib/brk/wallet-service')).creditBrkdWallet(member.userId, brkdReturn, 'BRKD hoàn 21% sau 1 ngày cân nhắc', undefined, latestEval)
        }
        await (await import('../lib/brk/level-manager')).checkAndPromoteLevel(member.userId, 4, latestEval, undefined, member.userId)

        const memberSys = await prisma.system.findUnique({ where: { userId_onSystem: { userId: member.userId, onSystem: 4 } } })
        if (memberSys) {
          const closures = await prisma.systemClosure.findMany({
            where: { descendantId: memberSys.autoId, depth: { gte: 1 }, systemId: 4 }
          })
          const ancestorSystems = await prisma.system.findMany({
            where: { autoId: { in: closures.map(c => c.ancestorId) } }
          })
          for (const ancestor of ancestorSystems) {
            await (await import('../lib/brk/level-manager')).checkAndPromoteLevel(ancestor.userId, 4, latestEval, undefined, ancestor.userId)
          }
        }
      }
    }
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1)
  console.log(`=== REBUILD DONE in ${elapsed}s ===`)
  await prisma.$disconnect()
}

main().catch(e => { console.error('ERROR:', e?.stack || e?.message || e); process.exit(1) })