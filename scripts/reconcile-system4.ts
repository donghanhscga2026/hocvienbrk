import { PrismaClient } from '@prisma/client'
import { parseArgs } from 'util'

const prisma = new PrismaClient()
const SYSTEM_ID = 4
const MBDT_BASE = 12_000_000

function mbdtToMbp(mbdt: number): number {
  return Math.round((mbdt / MBDT_BASE) * 16 * 1000) / 1000
}

function getCorrectLevel(points: number): number {
  if (points >= 100000) return 8
  if (points >= 50000) return 7
  if (points >= 16000) return 6
  if (points >= 4000) return 5
  if (points >= 1000) return 4
  if (points >= 250) return 3
  if (points >= 50) return 2
  return 1
}

async function main() {
  const { values } = parseArgs({
    options: {
      execute: { type: 'boolean', default: false }
    }
  })

  const isExecute = values.execute === true
  console.log(`======================================================`)
  console.log(`   RECONCILE SYSTEM 4 - MODE: ${isExecute ? '🔴 EXECUTE (GHI DB)' : '🟢 DRY-RUN (DỰ KIẾN)'}   `)
  console.log(`======================================================\n`)

  // 1. Load data
  const members = await prisma.system.findMany({
    where: { onSystem: SYSTEM_ID },
    include: { user: { select: { name: true } } }
  })

  const closures = await prisma.systemClosure.findMany({
    where: { systemId: SYSTEM_ID }
  })

  const timelines = await prisma.brkTimelineRecord.findMany({
    where: { onSystem: SYSTEM_ID, type: 'ACTIVATION', title: 'Chính thức tham gia' }
  })

  // Ánh xạ userId -> MBDT gốc và ngày kích hoạt
  const userOriginalMBDTMap = new Map<number, number>()
  const userActivatedAtMap = new Map<number, Date>()
  timelines.forEach(t => {
    const originalMBDT = Math.round(t.amountBrkd / 0.21)
    userOriginalMBDTMap.set(t.userId, originalMBDT)
    userActivatedAtMap.set(t.userId, t.time)
  })

  const memberMap = new Map<number, typeof members[0]>()
  members.forEach(m => {
    memberMap.set(m.autoId, m)
  })

  const ancestorToDescendants = new Map<number, number[]>()
  closures.forEach(c => {
    if (c.ancestorId !== c.descendantId) {
      if (!ancestorToDescendants.has(c.ancestorId)) {
        ancestorToDescendants.set(c.ancestorId, [])
      }
      ancestorToDescendants.get(c.ancestorId)!.push(c.descendantId)
    }
  })

  // 2. Audit points & levels
  const pointsUpdates: { autoId: number; userId: string; name: string; oldPts: number; newPts: number; oldLevel: number; newLevel: number }[] = []

  for (const member of members) {
    const ownMBDT = userOriginalMBDTMap.get(member.userId) || 0
    const ownMBP = ownMBDT > 0 ? mbdtToMbp(ownMBDT) : 0

    const descendantAutoIds = ancestorToDescendants.get(member.autoId) || []
    let correctPoints = ownMBP
    descendantAutoIds.forEach(descId => {
      const descMember = memberMap.get(descId)
      if (descMember) {
        const descMBDT = userOriginalMBDTMap.get(descMember.userId) || 0
        const descMBP = descMBDT > 0 ? mbdtToMbp(descMBDT) : 0
        correctPoints += descMBP
      }
    })

    correctPoints = Math.round(correctPoints * 1000) / 1000
    const dbPoints = Math.round(Number(member.totalPoints) * 1000) / 1000
    const correctLevel = getCorrectLevel(correctPoints)

    if (Math.abs(dbPoints - correctPoints) > 0.01 || member.level !== correctLevel) {
      pointsUpdates.push({
        autoId: member.autoId,
        userId: `#${member.userId}`,
        name: member.user.name || 'N/A',
        oldPts: dbPoints,
        newPts: correctPoints,
        oldLevel: member.level,
        newLevel: correctLevel
      })
    }
  }

  console.log(`--- PHẦN 1: ĐIỀU CHỈNH DOANH SỐ & CẤP BẬC ---`)
  console.log(`Số thành viên cần điều chỉnh: ${pointsUpdates.length}`)
  pointsUpdates.forEach(p => {
    console.log(`- ${p.userId} (${p.name}):`)
    console.log(`  Điểm: ${p.oldPts} ➔ ${p.newPts} MBP (${p.newPts - p.oldPts > 0 ? '+' : ''}${Math.round((p.newPts - p.oldPts)*1000)/1000} MBP)`)
    console.log(`  Cấp:  ${p.oldLevel} ➔ ${p.newLevel} ${p.oldLevel !== p.newLevel ? '⚠️ THAY ĐỔI' : ''}`)
  })
  console.log()

  // 3. Tìm các dòng hoa hồng retroactive phát sinh sai từ mốc 28/07 (mốc chạy cron lỗi)
  // Quét tất cả timeline COMMISSION phát sinh từ 2026-07-27T20:00:00Z
  const candidateTimelines = await prisma.brkTimelineRecord.findMany({
    where: {
      onSystem: SYSTEM_ID,
      time: { gte: new Date('2026-07-27T20:00:00Z') },
      type: 'TRANSACTION',
      txType: 'COMMISSION'
    }
  })

  // Lọc chỉ giữ lại những giao dịch của targetMember đã kích hoạt từ trước ngày 27/07
  const invalidTimelines = candidateTimelines.filter(t => {
    if (!t.targetMemberId) return false
    const activatedAt = userActivatedAtMap.get(t.targetMemberId)
    // Nếu ngày kích hoạt của thành viên F đó là trước ngày 27/07 ➔ Đây là hoa hồng retroactive sai!
    return activatedAt && activatedAt < new Date('2026-07-27T00:00:00Z')
  })

  // Tìm các bản ghi thăng cấp Level Up sai của #1098 và các ví thăng cấp tương ứng
  const invalidLevelUps = await prisma.brkLevelUpRecord.findMany({
    where: {
      onSystem: SYSTEM_ID,
      userId: 1098,
      toLevel: 2,
      promotedAt: { gte: new Date('2026-07-27T20:00:00Z') }
    }
  })

  const invalidLevelUpTimeline = await prisma.brkTimelineRecord.findMany({
    where: {
      onSystem: SYSTEM_ID,
      userId: 1098,
      type: 'LEVEL_UP',
      time: { gte: new Date('2026-07-27T20:00:00Z') }
    }
  })

  console.log(`--- PHẦN 2: CÁC GIAO DỊCH HOA HỒNG RETROACTIVE SAI SẼ BỊ XÓA ---`)
  invalidTimelines.forEach(t => {
    console.log(`- Timeline ID ${t.id} cho #${t.userId}: ${t.description} (CASH: +${t.amountCash}, BRKD: +${t.amountBrkd})`)
  })
  if (invalidTimelines.length === 0) console.log('Không tìm thấy giao dịch hoa hồng sai.')
  console.log()

  console.log(`--- PHẦN 3: LỊCH SỬ THĂNG CẤP & SNAPSHOT SAI SẼ BỊ XÓA ---`)
  invalidLevelUps.forEach(l => {
    console.log(`- Bản ghi thăng cấp LevelUp: #${l.userId} lên Cấp ${l.toLevel} lúc ${l.promotedAt.toISOString()}`)
  })
  invalidLevelUpTimeline.forEach(t => {
    console.log(`- Timeline Level Up ID ${t.id}: ${t.description}`)
  })
  console.log()

  // Tìm các transactions ví tương ứng để xóa và khấu trừ balance
  // refId của commission: sys_4_member_{targetMemberId}_app_1 (hoặc không có app_1 tùy cấu hình)
  const targetMemberIds = Array.from(new Set(invalidTimelines.map(t => t.targetMemberId).filter(Boolean) as number[]))
  
  const refIdsToDelete = [
    ...targetMemberIds.map(id => `sys_4_member_${id}_app_1`),
    ...targetMemberIds.map(id => `sys_4_member_${id}`),
    `level_2_sys_4_user_1098_points`
  ]

  const invalidTxs = await prisma.brkTransaction.findMany({
    where: {
      refId: { in: refIdsToDelete },
      createdAt: { gte: new Date('2026-07-27T20:00:00Z') } // Chỉ lọc giao dịch sai tạo ngày 28/07
    },
    include: {
      wallet: true
    }
  })

  // Các ví bị ảnh hưởng và lượng tiền cần khấu trừ
  const walletDeductions = new Map<number, { cash: number; brkd: number; userId: number }>()

  invalidTxs.forEach(t => {
    if (!walletDeductions.has(t.walletId)) {
      walletDeductions.set(t.walletId, { cash: 0, brkd: 0, userId: t.wallet.userId })
    }
    const current = walletDeductions.get(t.walletId)!
    if (t.balanceType === 'CASH') {
      current.cash += Number(t.amount)
    } else if (t.balanceType === 'BRKD') {
      current.brkd += Number(t.amount)
    }
  })

  console.log(`--- PHẦN 4: KHẤU TRỪ VÍ THÀNH VIÊN ---`)
  for (const [walletId, d] of walletDeductions.entries()) {
    console.log(`- Ví #${d.userId} (walletId: ${walletId}): Khấu trừ CASH: -${d.cash} | Khấu trừ BRKD: -${d.brkd} MBDT`)
  }
  if (walletDeductions.size === 0) console.log('Không có khấu trừ ví nào.')
  console.log()

  // 4. Thực thi cập nhật DB nếu --execute
  if (isExecute) {
    console.log('🔴 ĐANG THỰC THI GHI VÀO CƠ SỞ DỮ LIỆU...')

    // A. Cập nhật totalPoints và level cho các thành viên sai lệch
    for (const p of pointsUpdates) {
      await prisma.system.update({
        where: { autoId: p.autoId },
        data: {
          totalPoints: p.newPts,
          level: p.newLevel
        }
      })
    }
    console.log(`✅ Đã điều chỉnh totalPoints và level cho ${pointsUpdates.length} thành viên.`);

    // B. Xóa các Timeline sai
    const timelineIdsToDelete = [
      ...invalidTimelines.map(t => t.id),
      ...invalidLevelUpTimeline.map(t => t.id)
    ]
    if (timelineIdsToDelete.length > 0) {
      await prisma.brkTimelineRecord.deleteMany({
        where: { id: { in: timelineIdsToDelete } }
      })
      console.log(`✅ Đã xóa ${timelineIdsToDelete.length} bản ghi Timeline Record.`);
    }

    // C. Xóa Level Up record sai
    if (invalidLevelUps.length > 0) {
      await prisma.brkLevelUpRecord.deleteMany({
        where: {
          id: { in: invalidLevelUps.map(l => l.id) }
        }
      })
      console.log(`✅ Đã xóa bản ghi thăng cấp LevelUp.`);
    }

    // D. Khấu trừ ví và xóa transaction
    if (invalidTxs.length > 0) {
      // Trừ balance trong ví
      for (const [walletId, d] of walletDeductions.entries()) {
        await prisma.brkWallet.update({
          where: { id: walletId },
          data: {
            balance: { decrement: d.cash },
            brkd: { decrement: d.brkd }
          }
        })
      }
      console.log(`✅ Đã khấu trừ số dư của ${walletDeductions.size} ví thành viên.`);

      // Xóa các transaction
      await prisma.brkTransaction.deleteMany({
        where: { id: { in: invalidTxs.map(t => t.id) } }
      })
      console.log(`✅ Đã xóa các bản ghi giao dịch thừa.`);
    }

    console.log('\n🎉 HOÀN THÀNH ĐỒNG BỘ VÀ DỌN DẸP TOÀN BỘ DỮ LIỆU SAI LỆCH HỆ THỐNG 4!');
  } else {
    console.log('🟢 Chế độ DRY-RUN: Không có dữ liệu nào bị thay đổi trong database.');
    console.log('Bạn hãy chạy lệnh sau để thực thi cập nhật:');
    console.log('  npx tsx scripts/reconcile-system4.ts --execute');
  }
}

main().catch(err => {
  console.error('Lỗi khi chạy reconcile:', err)
}).finally(() => prisma.$disconnect())
