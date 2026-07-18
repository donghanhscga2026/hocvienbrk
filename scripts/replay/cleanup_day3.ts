import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()
const statusPath = path.join(process.cwd(), 'plan_temp', 'rebuild_status.json')

// Thời điểm cắt: 00:00 ngày 03/07 VN = 17:00 ngày 02/07 UTC
const CUTOFF_UTC = new Date('2026-07-02T17:00:00Z')

// 7 học viên ngày 03/07 VN (cần xóa khỏi System 4)
const DAY3_USER_IDS = [1053, 607, 1044, 1068, 1066, 617, 1023]

async function main() {
  console.log("🧹 === Dọn dẹp dữ liệu ngày 03/07 để chạy lại đúng ===\n")

  // Lấy toàn bộ users trong System 4
  const allSystems = await prisma.system.findMany({
    where: { onSystem: 4 },
    select: { autoId: true, userId: true }
  })
  const allUserIds = allSystems.map(s => s.userId)
  const day1UserIds = allUserIds.filter(id => !DAY3_USER_IDS.includes(id))

  console.log(`📋 19 học viên ngày 02/07 (giữ lại, reset level): [${day1UserIds.join(', ')}]`)
  console.log(`📋 7 học viên ngày 03/07 (xóa hoàn toàn): [${DAY3_USER_IDS.join(', ')}]\n`)

  // === BƯỚC 1: Xóa BrkTimelineRecord từ ngày 03/07 VN trở đi ===
  const deletedTimelines = await prisma.brkTimelineRecord.deleteMany({
    where: {
      userId: { in: allUserIds },
      time: { gte: CUTOFF_UTC }
    }
  })
  console.log(`🗑️  [1] Đã xóa ${deletedTimelines.count} BrkTimelineRecord từ ngày 03/07 trở đi.`)

  // === BƯỚC 2: Xóa BrkTransaction liên quan ngày 03/07 ===
  const wallets = await prisma.brkWallet.findMany({
    where: { userId: { in: allUserIds } },
    select: { id: true, userId: true }
  })
  const walletIdsByUser = new Map(wallets.map(w => [w.userId, w.id]))
  const allWalletIds = wallets.map(w => w.id)

  // 2a. Return Fee Cash (19 học viên ngày 02/07) — refId thực tế: return_fee_sys_4_user_${uid}
  let countCash = 0
  for (const uid of day1UserIds) {
    const wid = walletIdsByUser.get(uid)
    if (!wid) continue
    const r = await prisma.brkTransaction.deleteMany({
      where: { walletId: wid, refId: `return_fee_sys_4_user_${uid}` }
    })
    countCash += r.count
  }
  console.log(`🗑️  [2a] Đã xóa ${countCash} giao dịch Return Fee Cash cho 19 học viên.`)


  // 2b. Return MBDT (19 học viên ngày 02/07)
  let countMbdt = 0
  for (const uid of day1UserIds) {
    const wid = walletIdsByUser.get(uid)
    if (!wid) continue
    const r = await prisma.brkTransaction.deleteMany({
      where: { walletId: wid, refId: `return_brkd_sys_4_user_${uid}` }
    })
    countMbdt += r.count
  }
  console.log(`🗑️  [2b] Đã xóa ${countMbdt} giao dịch Return MBDT cho 19 học viên.`)

  // 2c. Ancestor notifications cho 7 học viên ngày 03/07
  let countAncestor = 0
  for (const newUid of DAY3_USER_IDS) {
    const refIdSuffix = `_under_${newUid}_active`
    const r = await prisma.brkTransaction.deleteMany({
      where: {
        walletId: { in: allWalletIds },
        refId: { endsWith: refIdSuffix }
      }
    })
    countAncestor += r.count
  }
  console.log(`🗑️  [2c] Đã xóa ${countAncestor} giao dịch ancestor notification cho 7 học viên ngày 03/07.`)

  // 2d. Join transactions của 7 học viên ngày 03/07 (nếu có)
  for (const newUid of DAY3_USER_IDS) {
    const wid = walletIdsByUser.get(newUid)
    if (!wid) continue
    await prisma.brkTransaction.deleteMany({
      where: { walletId: wid, refId: `sys_4_user_${newUid}_join` }
    })
  }
  console.log(`🗑️  [2d] Đã xóa join transactions của 7 học viên ngày 03/07 (nếu có).`)

  // === BƯỚC 3: Reset wallet về 0 cho 19 học viên ngày 02/07 ===
  for (const uid of day1UserIds) {
    await prisma.brkWallet.updateMany({
      where: { userId: uid },
      data: { balance: 0, brkd: 0, totalEarned: 0 }
    })
  }
  console.log(`💼 [3] Đã reset balance/brkd/totalEarned về 0 cho 19 học viên ngày 02/07.`)

  // === BƯỚC 4: Xóa BrkLevelUpRecord từ ngày 03/07 trở đi ===
  const deletedLevelUps = await prisma.brkLevelUpRecord.deleteMany({
    where: { onSystem: 4, promotedAt: { gte: CUTOFF_UTC } }
  })
  console.log(`🗑️  [4] Đã xóa ${deletedLevelUps.count} BrkLevelUpRecord từ ngày 03/07 trở đi.`)

  // === BƯỚC 5: Reset System.level = 0 cho 19 học viên ngày 02/07 ===
  await prisma.system.updateMany({
    where: { onSystem: 4, userId: { in: day1UserIds } },
    data: { level: 0 }
  })
  console.log(`📉 [5] Đã reset level = 0 cho 19 học viên ngày 02/07.`)

  // === BƯỚC 6: Xóa System records và SystemClosure của 7 học viên ngày 03/07 ===
  const day3Systems = await prisma.system.findMany({
    where: { onSystem: 4, userId: { in: DAY3_USER_IDS } },
    select: { autoId: true }
  })
  const day3AutoIds = day3Systems.map(s => s.autoId)

  if (day3AutoIds.length > 0) {
    await prisma.systemClosure.deleteMany({
      where: {
        systemId: 4,
        OR: [
          { descendantId: { in: day3AutoIds } },
          { ancestorId: { in: day3AutoIds } }
        ]
      }
    })
    await prisma.system.deleteMany({ where: { onSystem: 4, userId: { in: DAY3_USER_IDS } } })
    console.log(`🗑️  [6] Đã xóa ${day3AutoIds.length} System + SystemClosure của 7 học viên ngày 03/07.`)
  }

  // === BƯỚC 7: Dựng lại SystemClosure cho 19 học viên còn lại ===
  console.log("🔄 [7] Dựng lại SystemClosure cho 19 học viên còn lại...")
  await prisma.systemClosure.deleteMany({ where: { systemId: 4 } })

  const root = await prisma.system.findFirst({ where: { onSystem: 4, refSysId: 0 } })
  if (root) {
    async function processNode(autoId: number, userId: number, refSysId: number) {
      await prisma.systemClosure.upsert({
        where: { ancestorId_descendantId_systemId: { ancestorId: autoId, descendantId: autoId, systemId: 4 } },
        update: { depth: 0 },
        create: { ancestorId: autoId, descendantId: autoId, depth: 0, systemId: 4 }
      })
      if (refSysId > 0) {
        const parent = await prisma.system.findFirst({ where: { userId: refSysId, onSystem: 4 } })
        if (parent) {
          const parentClosures = await prisma.systemClosure.findMany({ where: { systemId: 4, descendantId: parent.autoId } })
          for (const pc of parentClosures) {
            await prisma.systemClosure.upsert({
              where: { ancestorId_descendantId_systemId: { ancestorId: pc.ancestorId, descendantId: autoId, systemId: 4 } },
              update: { depth: pc.depth + 1 },
              create: { ancestorId: pc.ancestorId, descendantId: autoId, depth: pc.depth + 1, systemId: 4 }
            })
          }
        }
      }
      const children = await prisma.system.findMany({ where: { refSysId: userId, onSystem: 4, userId: { not: userId } } })
      for (const child of children) await processNode(child.autoId, child.userId, child.refSysId)
    }
    await processNode(root.autoId, root.userId, root.refSysId)
    console.log("✅ [7] Dựng lại SystemClosure thành công!")
  }

  // === BƯỚC 8: Cập nhật rebuild_status.json về CRON3 ngày 02/07 ===
  const currentStatus = JSON.parse(fs.readFileSync(statusPath, 'utf-8'))
  currentStatus.currentDayIndex = 0
  currentStatus.currentStep = 'CRON3'
  fs.writeFileSync(statusPath, JSON.stringify(currentStatus, null, 2), 'utf-8')
  console.log("📝 [8] Đã cập nhật rebuild_status.json → currentDayIndex=0, currentStep=CRON3")

  console.log("\n✅ DỌN DẸP HOÀN TẤT!")
  console.log("🎯 Trạng thái hiện tại: 19 học viên ngày 02/07 ở Level 0, ví sạch, closure đầy đủ.")
  console.log("▶️  Bước tiếp theo: chạy step_rebuild.ts (CRON3 ngày 02/07) để nạp lại 7 học viên ngày 03/07.")
}

main()
  .catch(err => { console.error('❌ Lỗi:', err); process.exit(1) })
  .finally(() => prisma.$disconnect())
