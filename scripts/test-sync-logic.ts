/**
 * Test TCA Sync Logic trực tiếp
 * Mô phỏng chính xác code trong route.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient() as any

async function testSyncLogic() {
  console.log('==========================================')
  console.log('TEST: Mô phỏng Sync Logic')
  console.log('==========================================\n')

  // Mock nodes - giống hệt dữ liệu từ Chrome Extension
  const mockNodes = [
    {
      id: 99911,
      type: 'item',
      name: 'Test Root 99911',
      parentFolderId: null, // Root node
      groupName: 'Test'
    },
    {
      id: 99912,
      type: 'item',
      name: 'Test Child 99912',
      parentFolderId: 99911, // Parent = 99911
      groupName: 'Test'
    },
    {
      id: 99913,
      type: 'item',
      name: 'Test Child 99913',
      parentFolderId: 60073, // Parent TCA đã có trong DB (PHẠM THỊ NHUNG -> User 327)
      groupName: 'Test'
    }
  ]

  const mockMemberInfo = {
    99911: { phone: '099910001', email: 'test.99911@test.com' },
    99912: { phone: '099910002', email: 'test.99912@test.com' },
    99913: { phone: '099910003', email: 'test.99913@test.com' }
  }

  // Sort nodes - giống hệt logic trong route.ts
  const sortedNodes = [...mockNodes].sort((a, b) => {
    const aPid = a.parentFolderId as number | string | null | undefined
    const bPid = b.parentFolderId as number | string | null | undefined
    const aIsRoot = !aPid || aPid === 'root' || aPid === '0'
    const bIsRoot = !bPid || bPid === 'root' || bPid === '0'
    if (aIsRoot && !bIsRoot) return -1
    if (!aIsRoot && bIsRoot) return 1
    return 0
  })

  console.log('Sorted nodes:')
  sortedNodes.forEach(n => console.log(`  ${n.id}: ${n.name} (parentFolderId=${n.parentFolderId})`))
  console.log('')

  const tcaIdToUserId = new Map<number, number>()
  const tcaIdToSystemId = new Map<number, number>()

  for (const node of sortedNodes) {
    console.log(`\n${'='.repeat(50)}`)
    console.log(`Processing: ${node.name} (TCA ${node.id})`)
    
    const memberInfo = mockMemberInfo[node.id] || {}
    const phone = memberInfo.phone || null
    const email = memberInfo.email || null

    // ========== LOGIC GIỐNG HỆT route.ts ==========
    
    // Resolve parent info trước khi tạo User
    const parentTcaId = node.parentFolderId
    let parentUserId: number | null = null
    let parentSystemId: number | null = null

    console.log(`  DEBUG: parentFolderId = ${parentTcaId} (type: ${typeof parentTcaId})`)

    if (parentTcaId && String(parentTcaId) !== 'root' && String(parentTcaId) !== '0') {
      const parentIdNum = Number(parentTcaId)
      console.log(`  DEBUG: Parent ID = ${parentIdNum}`)
      
      // Thử lấy từ batch trước
      if (tcaIdToUserId.has(parentIdNum)) {
        parentUserId = tcaIdToUserId.get(parentIdNum)!
        parentSystemId = tcaIdToSystemId.get(parentIdNum) || null
        console.log(`  DEBUG: Parent found in BATCH, parentUserId=${parentUserId}`)
      } else {
        // Resolve từ DB
        console.log(`  DEBUG: Parent NOT in batch, checking DB...`)
        const parentTCAMember = await prisma.tCAMember?.findUnique({
          where: { tcaId: parentIdNum },
          include: { user: { select: { id: true } } }
        })
        if (parentTCAMember && parentTCAMember.userId) {
          parentUserId = parentTCAMember.userId
          console.log(`  DEBUG: Parent found in DB (TCAMember), parentUserId=${parentUserId}`)
          
          const parentSystem = await prisma.system.findFirst({
            where: { userId: parentTCAMember.userId, onSystem: 1 }
          })
          if (parentSystem) {
            parentSystemId = parentSystem.autoId
          }
        } else {
          console.log(`  DEBUG: Parent NOT found anywhere!`)
        }
      }
    } else {
      console.log(`  DEBUG: Root node (no parent)`)
    }

    console.log(`  FINAL: parentUserId = ${parentUserId}`)

    // ========== Tạo User ==========
    let existingUser = null
    if (email) {
      existingUser = await prisma.user.findUnique({
        where: { email: email }
      })
    }

    let userId: number
    let isNewUser = false

    if (existingUser) {
      userId = (existingUser as any).id
      console.log(`  User exists: ${userId}`)
    } else {
      // Create new user - LOGIC GIỐNG HỆT route.ts
      const bcrypt = await import('bcryptjs')
      const hashedPassword = await bcrypt.hash('Brk#3773', 10)
      
      // Sử dụng getNextAvailableId
      const { getNextAvailableId } = await import('@/lib/id-helper')
      const newId = await getNextAvailableId()

      console.log(`  Creating user: id=${newId}, referrerId=${parentUserId}`)

      const newUser = await prisma.user.create({
        data: {
          id: newId,
          name: node.name || `TCA User ${node.id}`,
          email: email || `tca_${node.id}@placeholder.local`,
          phone: phone,
          password: hashedPassword,
          role: 'STUDENT',
          referrerId: parentUserId
        }
      })

      userId = newUser.id
      isNewUser = true
      console.log(`  ✅ Created user: ${userId}, referrerId=${newUser.referrerId}`)

      // Verify immediately
      const verifyUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, referrerId: true }
      })
      console.log(`  🔍 Verified in DB: referrerId=${verifyUser?.referrerId}`)

      tcaIdToUserId.set(node.id, userId)

      // Create System
      const maxSystemId = await prisma.system.findFirst({
        orderBy: { autoId: 'desc' },
        select: { autoId: true }
      })
      const newSystemId = (maxSystemId?.autoId || 0) + 1

      const newSystem = await prisma.system.create({
        data: {
          userId: userId,
          onSystem: 1,
          refSysId: parentSystemId || 0
        }
      })

      console.log(`  ✅ Created system: ${newSystem.autoId}, refSysId=${parentSystemId || 0}`)
      tcaIdToSystemId.set(node.id, newSystem.autoId)

      // Create TCAMember
      await prisma.tCAMember.create({
        data: {
          tcaId: node.id,
          userId: userId,
          type: node.type || 'item',
          groupName: node.groupName || null,
          name: node.name || '',
          phone: phone,
          email: email,
          parentTcaId: parentTcaId ? Number(parentTcaId) : null,
          teamSize: 0
        }
      })
      console.log(`  ✅ Created TCAMember`)
    }
  }

  // Cleanup
  console.log('\n\n==========================================')
  console.log('CLEANUP...')
  
  for (const node of mockNodes) {
    await prisma.tCAMember.delete({ where: { tcaId: node.id } }).catch(() => {})
  }
  
  // Delete users created
  const emails = Object.values(mockMemberInfo).map(m => m.email)
  for (const email of emails) {
    await prisma.user.delete({ where: { email: email } }).catch(() => {})
  }
  
  console.log('Done!')
  await prisma.$disconnect()
}

testSyncLogic().catch(console.error)
