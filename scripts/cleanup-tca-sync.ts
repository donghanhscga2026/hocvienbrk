import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('=== XÓA DỮ LIỆU TCA MỚI SYNC ===\n')

  // Danh sách TCA IDs đã sync gần đây (từ log)
  const tcaIdsToDelete = [
    60074, 60214, 61483, 61494, 61510, 61789, 
    61345, 61392, 61483, 61494, 61928, 61179, 
    61510, 61535, 61752, 61753, 61983, 61800, 61899
  ]

  // Lấy unique TCA IDs
  const uniqueTcaIds = [...new Set(tcaIdsToDelete)]

  console.log('TCA IDs sẽ xóa:', uniqueTcaIds)

  // Bước 1: Lấy thông tin các TCA members sẽ xóa
  const tcaMembers = await prisma.tCAMember.findMany({
    where: { tcaId: { in: uniqueTcaIds } }
  })

  console.log(`\nTìm thấy ${tcaMembers.length} TCA members`)

  // Lấy userIds
  const userIds = tcaMembers.map(t => t.userId).filter(id => id != null)
  console.log('User IDs:', userIds)

  // Bước 2: Xóa TCAMembers
  console.log('\n--- Xóa TCAMembers ---')
  await prisma.tCAMember.deleteMany({
    where: { tcaId: { in: uniqueTcaIds } }
  })
  console.log('✅ Đã xóa TCAMembers')

  // Bước 3: Xóa Systems của các user này (chỉ xóa nếu không có TCA khác)
  console.log('\n--- Xóa Systems ---')
  for (const userId of userIds) {
    // Kiểm tra xem user này còn TCA nào khác không
    const remainingTCA = await prisma.tCAMember.findFirst({
      where: { userId }
    })

    if (!remainingTCA) {
      // Xóa System
      await prisma.system.deleteMany({
        where: { userId, onSystem: 1 }
      })
      console.log(`✅ Đã xóa System của user ${userId}`)
    } else {
      console.log(`⏭️ Bỏ qua user ${userId} vì còn TCA ${remainingTCA.tcaId}`)
    }
  }

  // Bước 4: Xóa Users mới tạo (không có referrerId từ TCA gốc)
  console.log('\n--- Xóa Users ---')
  for (const userId of userIds) {
    // Kiểm tra user còn TCA nào không
    const hasTCAMember = await prisma.tCAMember.findFirst({
      where: { userId }
    })

    if (!hasTCAMember) {
      // Xóa user
      await prisma.user.delete({
        where: { id: userId }
      }).catch(e => console.log(`⚠️ Không xóa được user ${userId}:`, e.message))
      console.log(`✅ Đã xóa user ${userId}`)
    }
  }

  // Bước 5: Xóa closures trùng lặp (sẽ regenerate lại)
  console.log('\n--- Cleanup Closures ---')
  // Xóa closures không còn descendant trong hệ thống
  const allSystems = await prisma.system.findMany({
    where: { onSystem: 1 },
    select: { autoId: true }
  })
  const systemIds = allSystems.map(s => s.autoId)

  // Lấy closures có descendant không trong hệ thống
  const orphanClosures = await prisma.systemClosure.findMany({
    where: {
      systemId: 1,
      descendantId: { notIn: systemIds }
    }
  })

  if (orphanClosures.length > 0) {
    await prisma.systemClosure.deleteMany({
      where: {
        systemId: 1,
        descendantId: { notIn: systemIds }
      }
    })
    console.log(`✅ Đã xóa ${orphanClosures.length} orphan closures`)
  }

  // Bước 6: Regenerate closures cho system 1
  console.log('\n--- Regenerate Closures ---')
  await regenerateClosures(1)

  console.log('\n=== HOÀN TẤT ===')
}

async function regenerateClosures(systemId: number) {
  console.log(`🔗 Regenerating closures for system ${systemId}...`)

  const allSystems = await prisma.system.findMany({ where: { onSystem: systemId } })
  console.log(`📊 Tổng số systems: ${allSystems.length}`)

  const closureRecords: any[] = []
  const userToSystem = new Map<number, any>()
  for (const s of allSystems) userToSystem.set(s.userId, s)

  for (const s of allSystems) {
    // Self closure
    closureRecords.push({ ancestorId: s.autoId, descendantId: s.autoId, depth: 0, systemId })

    // Walk up the tree
    let currentParentUserId = s.refSysId
    let currentDepth = 1
    let visited = new Set<number>([s.userId])

    while (currentParentUserId > 0 && currentDepth < 100) {
      if (visited.has(currentParentUserId)) break

      const parentSystem = userToSystem.get(currentParentUserId)
      if (!parentSystem) break

      closureRecords.push({
        ancestorId: parentSystem.autoId,
        descendantId: s.autoId,
        depth: currentDepth,
        systemId
      })

      visited.add(currentParentUserId)

      if (parentSystem.refSysId === parentSystem.userId || parentSystem.refSysId === 0) break

      currentParentUserId = parentSystem.refSysId
      currentDepth++
    }
  }

  console.log(`🗑️ Deleting old closures...`)
  await prisma.systemClosure.deleteMany({ where: { systemId } })

  console.log(`💾 Inserting ${closureRecords.length} closures...`)
  await prisma.systemClosure.createMany({ data: closureRecords, skipDuplicates: true })

  console.log(`✅ Done! Created ${closureRecords.length} closures`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())