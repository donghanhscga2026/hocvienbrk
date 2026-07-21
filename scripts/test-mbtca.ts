import 'dotenv/config'
import prisma from '../lib/prisma'

const ON_SYSTEM = 4
const INTERVAL_MS = 7 * 60 * 60 * 1000

async function main() {
  const runTimeArg = process.argv.find(arg => arg.startsWith('--time='))?.slice(7)
  const runTime = runTimeArg ? new Date(runTimeArg) : new Date()
  if (Number.isNaN(runTime.getTime())) throw new Error('Invalid --time value')

  const config = await prisma.systemConfig.findUnique({ where: { key: 'dongchia_start_time' } })
  if (typeof config?.value !== 'string') throw new Error('Missing dongchia_start_time config')
  const startTime = new Date(config.value)
  const roundNumber = Math.floor((runTime.getTime() - startTime.getTime()) / INTERVAL_MS) - 1
  if (roundNumber < 0) throw new Error('No completed dong chia period yet')
  const periodStart = new Date(startTime.getTime() + roundNumber * INTERVAL_MS)
  const periodEnd = new Date(periodStart.getTime() + INTERVAL_MS)

  const systemTree = await prisma.systemTree.findUnique({ where: { onSystem: ON_SYSTEM } })
  if (!systemTree) throw new Error('System 4 not found')
  const officialMembers = await prisma.system.findMany({
    where: {
      onSystem: ON_SYSTEM,
      status: 'ACTIVE',
      gracePeriodEnd: { lte: periodEnd },
      expiresAt: { gte: periodEnd },
    },
    select: { autoId: true, userId: true },
  })
  const newlyOfficial = await prisma.system.count({
    where: {
      onSystem: ON_SYSTEM,
      status: 'ACTIVE',
      gracePeriodEnd: { gte: periodStart, lt: periodEnd },
    },
  })

  const qualified: number[] = []
  for (const member of officialMembers) {
    const f1Count = await prisma.systemClosure.count({
      where: {
        ancestorId: member.autoId,
        systemId: ON_SYSTEM,
        depth: 1,
        descendant: {
          status: 'ACTIVE',
          gracePeriodEnd: { lte: periodEnd },
          expiresAt: { gte: periodEnd },
        },
      },
    })
    if (f1Count > 0) qualified.push(member.userId)
  }

  const cashRevenue = newlyOfficial * Number(systemTree.fee)
  const cashPool = cashRevenue * Number(systemTree.revenueSharePct || 2) / 100
  console.log('DRY-RUN ONLY — no database writes')
  console.log(`Round: ${roundNumber}`)
  console.log(`Period: ${periodStart.toISOString()} -> ${periodEnd.toISOString()}`)
  console.log(`New official members: ${newlyOfficial}`)
  console.log(`Qualified members: ${qualified.length}`)
  console.log(`Qualified user IDs: ${qualified.join(', ') || '(none)'}`)
  console.log(`Cash revenue/pool: ${cashRevenue}/${cashPool}`)
  console.log(`Cash per member: ${qualified.length ? Math.floor(cashPool * 100 / qualified.length) / 100 : 0}`)
}

main()
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
