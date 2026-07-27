import 'dotenv/config'
import prisma from '../lib/prisma'

const SYSTEM_ID = 4

function formatVi(date: Date) {
  return date.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
}

async function getLevelAtTime(userId: number, time: Date): Promise<number> {
  const latestLevelUp = await prisma.brkLevelUpRecord.findFirst({
    where: { userId, onSystem: SYSTEM_ID, promotedAt: { lte: time } },
    orderBy: [
      { promotedAt: 'desc' },
      { toLevel: 'desc' }
    ],
    select: { toLevel: true }
  })
  return latestLevelUp?.toLevel ?? 1
}

async function main() {
  const execute = process.argv.includes('--execute')

  console.log('╔══════════════════════════════════════════════════════╗')
  console.log('║   MIGRATION: UPDATE TIMELINE COMMISSIONS & BLOCKERS   ║')
  console.log(`║   Mode: ${execute ? '🔴 EXECUTE (Cập nhật thực tế)' : '🟡 DRY-RUN (Xem trước)'}             ║`)
  console.log('╚══════════════════════════════════════════════════════╝')

  // 1. Lấy tất cả các dòng Tăng trưởng tích lũy của Hệ thống 4 để xử lý cập nhật hoặc sửa lại
  const records = await prisma.brkTimelineRecord.findMany({
    where: {
      onSystem: SYSTEM_ID,
      type: 'TRANSACTION',
      targetMemberId: { not: null },
      title: 'Tăng trưởng tích lũy'
    },
    include: {
      user: { select: { name: true } }
    },
    orderBy: { time: 'asc' }
  })

  console.log(`\nTìm thấy ${records.length} dòng lịch sử cần xử lý cập nhật.`)

  if (records.length === 0) {
    console.log('🎉 Không có dòng lịch sử nào cần cập nhật. Hoàn tất!')
    return
  }

  // Lấy danh sách cấu hình cấp bậc của Hệ thống 4
  const levelConfigsRaw = await prisma.brkLevelConfig.findMany({
    where: { systemId: SYSTEM_ID }
  })
  const levelConfigs = new Map(levelConfigsRaw.map(c => [c.level, c]))

  let updateCount = 0
  const updatesList: { id: number; oldDesc: string; newDesc: string }[] = []

  // Nhóm các bản ghi theo cặp (targetMemberId, time) để xử lý theo đợt kích hoạt
  const groups = new Map<string, typeof records>()
  for (const record of records) {
    const key = `${record.targetMemberId}_${record.time.getTime()}`
    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key)!.push(record)
  }

  console.log(`Nhóm thành ${groups.size} đợt kích hoạt thành viên chính thức để tính toán.`)

  for (const [key, groupRecords] of groups.entries()) {
    const targetMemberId = groupRecords[0].targetMemberId!
    const time = groupRecords[0].time

    // Lấy thông tin thành viên mới
    const targetSys = await prisma.system.findFirst({
      where: { userId: targetMemberId, onSystem: SYSTEM_ID },
      include: { user: { select: { name: true } } }
    })
    if (!targetSys) continue
    const targetMemberName = targetSys.user?.name || 'N/A'

    // Lấy tuyến trên của thành viên mới này
    const ancestors = await prisma.systemClosure.findMany({
      where: { descendantId: targetSys.autoId, depth: { gte: 1 }, systemId: SYSTEM_ID },
      orderBy: { depth: 'asc' },
      include: {
        ancestor: {
          include: {
            user: { select: { name: true } }
          }
        }
      }
    })

    // Tính toán cấp bậc tại thời điểm kích hoạt
    const newMemberLevel = await getLevelAtTime(targetMemberId, time)
    const newMemberConfig = levelConfigs.get(newMemberLevel)
    let previousPct = newMemberConfig ? Number(newMemberConfig.personalFeePct) : 21

    let prevMemberId = targetMemberId
    let prevMemberName = targetMemberName

    // Duyệt qua tuyến trên để xác định % hoa hồng chênh lệch và blocker đồng cấp
    const creditsMap = new Map<number, { earnPct: number; blockerId: number | null; blockerName: string | null; blockerDepth: number | null }>()

    for (const closure of ancestors) {
      const uplineSystem = closure.ancestor
      const uplineLevel = await getLevelAtTime(uplineSystem.userId, time)
      const config = levelConfigs.get(uplineLevel)
      if (!config) continue

      const uplinePct = Number(config.personalFeePct)
      const earnPct = uplinePct - previousPct
      previousPct = Math.max(previousPct, uplinePct)

      let blockerId: number | null = null
      let blockerName: string | null = null

      if (earnPct <= 0) {
        blockerId = prevMemberId
        blockerName = prevMemberName
      }

      creditsMap.set(uplineSystem.userId, {
        earnPct,
        blockerId,
        blockerName,
        blockerDepth: earnPct <= 0 ? 1 : null
      })

      prevMemberId = uplineSystem.userId
      prevMemberName = uplineSystem.user?.name || 'N/A'
    }

    // Cập nhật mô tả cho từng dòng lịch sử trong nhóm
    for (const record of groupRecords) {
      const credit = creditsMap.get(record.userId)
      if (!credit) continue

      let suffix = ''
      if (credit.earnPct > 0) {
        suffix = ` (+${credit.earnPct}% hoa hồng chênh lệch)`
      } else if (credit.blockerId) {
        const blockerLabel = credit.blockerDepth && credit.blockerDepth > 0 ? `F${credit.blockerDepth} ` : ''
        suffix = ` (0% hoa hồng chênh lệch do đồng cấp với ${blockerLabel}#${credit.blockerId} - ${credit.blockerName})`
      } else {
        suffix = ' (0% hoa hồng chênh lệch)'
      }

      // Đảm bảo không bị lặp hậu tố và giữ nguyên Xem nhân duyên nếu có
      const oldDesc = record.description
      let newDesc = oldDesc
      if (oldDesc.includes('hoa hồng chênh lệch')) {
        newDesc = oldDesc.replace(/\s*\(0% hoa hồng chênh lệch.*?\)/g, '').replace(/\s*\(\+\d+(?:\.\d+)?% hoa hồng chênh lệch\)/g, '') + suffix
      } else {
        newDesc = oldDesc + suffix
      }

      if (oldDesc !== newDesc) {
        updatesList.push({
          id: record.id,
          oldDesc,
          newDesc
        })
        updateCount++
      }
    }
  }

  console.log(`\n=== THỐNG KÊ CHI TIẾT SẼ THAY ĐỔI (${updateCount} bản ghi) ===`)
  updatesList.slice(0, 50).forEach((item, index) => {
    console.log(`  ${index + 1}. [ID ${item.id}]`)
    console.log(`     Gốc:  ${item.oldDesc}`)
    console.log(`     Mới:  ${item.newDesc}`)
  })
  if (updatesList.length > 50) {
    console.log(`  ... và ${updatesList.length - 50} bản ghi khác.`)
  }

  if (execute) {
    console.log('\n🔄 Đang thực thi cập nhật vào cơ sở dữ liệu thực tế...')
    for (const item of updatesList) {
      await prisma.brkTimelineRecord.update({
        where: { id: item.id },
        data: { description: item.newDesc }
      })
    }
    console.log(`\n🎉 Cập nhật thành công ${updateCount} bản ghi lịch sử!`)
  } else {
    console.log('\n💡 Chế độ DRY-RUN: Không có dữ liệu nào thay đổi trong DB.')
    console.log('💡 Để chạy thực tế, vui lòng chạy lệnh với flag: --execute')
  }
}

main()
  .catch(error => {
    console.error('❌ Lỗi:', error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
