import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Bắt đầu seed BRK levels...')

  const systemId = 4

  let systemTree = await prisma.systemTree.findUnique({
    where: { onSystem: systemId }
  })

  if (!systemTree) {
    systemTree = await prisma.systemTree.create({
      data: {
        onSystem: systemId,
        nameSystem: 'BRK',
        fee: 1,
        durationDays: 30,
        graceDays: 3,
        returnPct: 21.0,
        revenueSharePct: 2.0,
        revenueShareIntervalDays: 3,
        pointsPerDollar: 0.56,
      }
    })
    console.log(`✅ Tạo SystemTree: ${systemTree.nameSystem} (onSystem=${systemId})`)
  } else {
    console.log(`ℹ️ SystemTree đã tồn tại: ${systemTree.nameSystem} (onSystem=${systemId})`)
  }

  const levels = [
    {
      level: 1, pointsRequired: 15, personalFeePct: 21.0, giftValue: 0, timeLimitDays: null,
      branches: [] as { branchLevel: number; count: number }[]
    },
    {
      level: 2, pointsRequired: 50, personalFeePct: 30.0, giftValue: 500000, timeLimitDays: 6,
      branches: [] as { branchLevel: number; count: number }[]
    },
    {
      level: 3, pointsRequired: 250, personalFeePct: 39.0, giftValue: 1_000_000, timeLimitDays: 12,
      branches: [{ branchLevel: 1, count: 2 }]
    },
    {
      level: 4, pointsRequired: 1000, personalFeePct: 52.5, giftValue: 2_000_000, timeLimitDays: 15,
      branches: [{ branchLevel: 2, count: 2 }, { branchLevel: 1, count: 1 }]
    },
    {
      level: 5, pointsRequired: 4000, personalFeePct: 64.5, giftValue: 4_000_000, timeLimitDays: 24,
      branches: [{ branchLevel: 3, count: 2 }, { branchLevel: 2, count: 1 }, { branchLevel: 1, count: 1 }]
    },
    {
      level: 6, pointsRequired: 16000, personalFeePct: 70.5, giftValue: 8_000_000, timeLimitDays: 36,
      branches: [{ branchLevel: 4, count: 2 }, { branchLevel: 2, count: 2 }]
    },
    {
      level: 7, pointsRequired: 50000, personalFeePct: 75.0, giftValue: 16_000_000, timeLimitDays: null,
      branches: [{ branchLevel: 5, count: 2 }, { branchLevel: 4, count: 1 }, { branchLevel: 3, count: 1 }]
    },
    {
      level: 8, pointsRequired: 100000, personalFeePct: 78.0, giftValue: 32_000_000, timeLimitDays: null,
      branches: [{ branchLevel: 6, count: 2 }, { branchLevel: 5, count: 1 }, { branchLevel: 4, count: 1 }]
    },
  ]

  for (const levelData of levels) {
    const existing = await prisma.brkLevelConfig.findUnique({
      where: { systemId_level: { systemId, level: levelData.level } }
    })

    if (existing) {
      console.log(`ℹ️ Level ${levelData.level} đã tồn tại, cập nhật...`)
      await prisma.brkLevelConfig.update({
        where: { id: existing.id },
        data: {
          pointsRequired: levelData.pointsRequired,
          personalFeePct: levelData.personalFeePct,
          giftValue: levelData.giftValue,
          timeLimitDays: levelData.timeLimitDays,
        }
      })

      await prisma.brkLevelBranchReq.deleteMany({ where: { configId: existing.id } })
      for (const branch of levelData.branches) {
        await prisma.brkLevelBranchReq.create({
          data: { configId: existing.id, branchLevel: branch.branchLevel, count: branch.count }
        })
      }
    } else {
      const config = await prisma.brkLevelConfig.create({
        data: {
          systemId,
          level: levelData.level,
          pointsRequired: levelData.pointsRequired,
          personalFeePct: levelData.personalFeePct,
          giftValue: levelData.giftValue,
          timeLimitDays: levelData.timeLimitDays,
        }
      })

      for (const branch of levelData.branches) {
        await prisma.brkLevelBranchReq.create({
          data: { configId: config.id, branchLevel: branch.branchLevel, count: branch.count }
        })
      }
      console.log(`✅ Level ${levelData.level}: ${levelData.pointsRequired}pts, ${levelData.personalFeePct}%, gift=${levelData.giftValue}${levelData.timeLimitDays ? `, time=${levelData.timeLimitDays}d` : ', unlimited'}`)
    }
  }

  console.log('🎉 Seed BRK levels hoàn tất!')
}

main()
  .catch((e) => {
    console.error('❌ Seed thất bại:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
