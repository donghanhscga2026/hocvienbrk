import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const ON_SYSTEM = 4
const USER_ID = 1093
const REFERRER_ID = 965

async function main() {
  // 1. Xóa toàn bộ dữ liệu BRK của #1093
  const sys = await prisma.system.findUnique({
    where: { userId_onSystem: { userId: USER_ID, onSystem: ON_SYSTEM } }
  })
  if (sys) {
    await prisma.systemClosure.deleteMany({
      where: { OR: [{ ancestorId: sys.autoId }, { descendantId: sys.autoId }], systemId: ON_SYSTEM }
    })
    await prisma.brkTransaction.deleteMany({
      where: { wallet: { userId: USER_ID } }
    })
    await prisma.brkWallet.deleteMany({ where: { userId: USER_ID } })
    await prisma.brkLevelUpRecord.deleteMany({ where: { userId: USER_ID, onSystem: ON_SYSTEM } })
    await prisma.brkReferralBonus.deleteMany({ where: { userId: USER_ID, onSystem: ON_SYSTEM } })
    await prisma.system.delete({ where: { userId_onSystem: { userId: USER_ID, onSystem: ON_SYSTEM } } })
    console.log('Deleted all BRK data for #1093')
  } else {
    console.log('No existing BRK data for #1093')
  }

  // 2. Kích hoạt lại như member mới với ref = #965
  const systemTree = await prisma.systemTree.findUnique({ where: { onSystem: ON_SYSTEM } })
  if (!systemTree) throw new Error('BRK system not found')

  const now = new Date()
  const graceDays = systemTree.graceDays || 1
  const graceEnd = new Date(now.getTime() + graceDays * 24 * 60 * 60 * 1000)
  const expiresAt = new Date(now.getTime() + systemTree.durationDays * 24 * 60 * 60 * 1000)

  // IMPORTANT: Resolve placement by referrer
  // Using the same logic as activation-service: resolvePlacement(onSystem, effectiveReferrer)
  // For BRK system 4, the placement rule is FORCED_4WIDE
  // We need to call resolvePlacement, but since it uses prisma from @/lib/prisma,
  // we replicate the logic inline

  // First find the refSysId by looking at the referrer
  const refSys = await prisma.system.findUnique({
    where: { userId_onSystem: { userId: REFERRER_ID, onSystem: ON_SYSTEM } }
  })
  if (!refSys) throw new Error(`Referrer #${REFERRER_ID} not found in BRK`)

  // FORCED_4WIDE: BFS from root, find first slot
  // But for simplicity: place directly under the referrer if they have < 4 F1
  // Otherwise find first available in referrer's subtree
  const f1Count = await prisma.systemClosure.count({
    where: { ancestorId: refSys.autoId, depth: 1, systemId: ON_SYSTEM }
  })

  let parentUserId: number
  if (f1Count < 4) {
    parentUserId = REFERRER_ID
  } else {
    // BFS from referrer to find first available slot
    const queue = [refSys.autoId]
    const visited = new Set<number>()
    let found = false
    parentUserId = REFERRER_ID

    while (queue.length > 0 && !found) {
      const currentId = queue.shift()!
      if (visited.has(currentId)) continue
      visited.add(currentId)

      const fc = await prisma.systemClosure.count({
        where: { ancestorId: currentId, depth: 1, systemId: ON_SYSTEM }
      })
      if (fc < 4) {
        const node = await prisma.system.findUnique({ where: { autoId: currentId } })
        if (node) {
          parentUserId = node.userId
          found = true
          break
        }
      }
      const f1s = await prisma.systemClosure.findMany({
        where: { ancestorId: currentId, depth: 1, systemId: ON_SYSTEM }
      })
      for (const f1 of f1s) {
        if (!visited.has(f1.descendantId)) queue.push(f1.descendantId)
      }
    }
  }

  console.log(`Resolved placement: under #${parentUserId}`)

  // Create system record (totalPoints = 0 for Method B)
  const system = await prisma.system.create({
    data: {
      userId: USER_ID,
      onSystem: ON_SYSTEM,
      refSysId: parentUserId,
      status: 'ACTIVE',
      activatedAt: now,
      gracePeriodEnd: graceEnd,
      expiresAt,
      level: 1,
      totalPoints: 0,
    }
  })
  console.log('Created system record:', system.autoId)

  // Add closure
  const parentSys = await prisma.system.findUnique({
    where: { userId_onSystem: { userId: parentUserId, onSystem: ON_SYSTEM } }
  })
  if (!parentSys) throw new Error(`Parent #${parentUserId} not found`)

  await prisma.systemClosure.createMany({
    data: [
      { ancestorId: parentSys.autoId, descendantId: system.autoId, depth: 1, systemId: ON_SYSTEM },
    ]
  })
  // Add all ancestor closures
  const parentClosures = await prisma.systemClosure.findMany({
    where: { descendantId: parentSys.autoId, systemId: ON_SYSTEM, ancestorId: { not: parentSys.autoId } }
  })
  for (const pc of parentClosures) {
    await prisma.systemClosure.create({
      data: {
        ancestorId: pc.ancestorId,
        descendantId: system.autoId,
        depth: pc.depth + 1,
        systemId: ON_SYSTEM,
      }
    })
  }

  // Create wallet
  await prisma.brkWallet.create({
    data: { userId: USER_ID, balance: 0, brkd: 0, voucherBalance: 0 }
  })

  console.log('Done! #1093 activated under #', parentUserId, 'as new member')
}

main().catch(e => {
  console.error('Error:', e)
  process.exit(1)
}).finally(() => prisma.$disconnect())