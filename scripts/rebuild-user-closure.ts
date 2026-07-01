import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Rebuilding user_closure from referrerId...\n')

  // Clear existing closure data
  await prisma.$executeRawUnsafe('DELETE FROM "user_closure"')
  console.log('  Cleared old user_closure\n')

  const users = await prisma.user.findMany({
    where: {},
    select: { id: true, referrerId: true },
    orderBy: { id: 'asc' }
  })

  console.log(`  Processing ${users.length} users...`)

  // Build a map for fast lookup
  const refMap = new Map<number, number | null>()
  for (const u of users) {
    refMap.set(u.id, u.referrerId && u.referrerId !== u.id ? u.referrerId : null)
  }

  let totalEntries = 0
  const BATCH_SIZE = 5000
  let batch: { ancestorId: number; descendantId: number; depth: number }[] = []

  for (const user of users) {
    // Self-ref (depth=0)
    batch.push({ ancestorId: user.id, descendantId: user.id, depth: 0 })

    // Walk up referrer chain
    let currentId = refMap.get(user.id) ?? null
    let depth = 1
    const visited = new Set<number>()
    visited.add(user.id)

    while (currentId !== null && !visited.has(currentId)) {
      visited.add(currentId)
      batch.push({ ancestorId: currentId, descendantId: user.id, depth })
      currentId = refMap.get(currentId) ?? null
      depth++
    }

    totalEntries += depth  // depth includes the self-ref

    // Flush batch
    if (batch.length >= BATCH_SIZE) {
      await prisma.userClosure.createMany({ data: batch, skipDuplicates: true })
      batch = []
    }
  }

  // Final flush
  if (batch.length > 0) {
    await prisma.userClosure.createMany({ data: batch, skipDuplicates: true })
  }

  const count = await prisma.userClosure.count()
  console.log(`\n✅ Done: ${count} closure entries created`)
  console.log(`   (from ${users.length} users)`)
}

main()
  .catch(e => { console.error('❌ Fatal:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
