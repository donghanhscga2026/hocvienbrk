import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient() as any

async function testSyncWithMockData() {
  console.log('==========================================')
  console.log('TEST: Sync với Mock Data')
  console.log('==========================================\n')

  // Mock data - giả lập dữ liệu từ Chrome Extension
  const mockNodes = [
    {
      id: 99991,
      type: 'item',
      name: 'Test Root User',
      parentFolderId: null, // Root node
      groupName: 'Test Group'
    },
    {
      id: 99992,
      type: 'item',
      name: 'Test Child User 1',
      parentFolderId: 99991, // Parent là 99991
      groupName: 'Test Group'
    },
    {
      id: 99993,
      type: 'item',
      name: 'Test Child User 2',
      parentFolderId: 99992, // Parent là 99992 (grandchild)
      groupName: 'Test Group'
    }
  ]

  const mockMemberInfo = {
    99991: { phone: '0999000001', email: 'test.root@test.com', address: 'Test Address' },
    99992: { phone: '0999000002', email: 'test.child1@test.com', address: 'Test Address 2' },
    99993: { phone: '0999000003', email: 'test.child2@test.com', address: 'Test Address 3' }
  }

  console.log('Mock Data:')
  console.log('  99991 (Root) → parentFolderId: null')
  console.log('  99992 (Child 1) → parentFolderId: 99991 (Root)')
  console.log('  99993 (Child 2) → parentFolderId: 99992 (Child 1)')
  console.log('')

  // Simulate Sync logic
  const tcaIdToUserId = new Map<number, number>()
  const tcaIdToSystemId = new Map<number, number>()

  // Sort nodes by hierarchy (parents first)
  const sortedNodes = [...mockNodes].sort((a, b) => {
    const aPid = a.parentFolderId as number | string | null | undefined
    const bPid = b.parentFolderId as number | string | null | undefined
    const aIsRoot = !aPid || aPid === 'root' || aPid === '0'
    const bIsRoot = !bPid || bPid === 'root' || bPid === '0'
    if (aIsRoot && !bIsRoot) return -1
    if (!aIsRoot && bIsRoot) return 1
    return 0
  }) as typeof mockNodes

  console.log('Sorted nodes (parents first):')
  sortedNodes.forEach(n => {
    console.log(`  TCA ${n.id}: ${n.name} (parentFolderId=${n.parentFolderId})`)
  })
  console.log('')

  // Process each node
  for (const node of sortedNodes) {
    console.log(`\n${'='.repeat(50)}`)
    console.log(`Processing TCA ${node.id}: ${node.name}`)
    
    const memberInfo = mockMemberInfo[node.id] || {}
    const phone = memberInfo.phone || null
    const email = memberInfo.email || null

    // ========== RESOLVE PARENT ==========
    const parentTcaId = node.parentFolderId as number | string | null | undefined
    let parentUserId: number | null = null
    let parentSystemId: number | null = null

    console.log(`  parentFolderId: ${parentTcaId}`)

    if (parentTcaId && String(parentTcaId) !== 'root' && String(parentTcaId) !== '0') {
      const parentIdNum = Number(parentTcaId)
      
      // Thử lấy từ batch trước
      if (tcaIdToUserId.has(parentIdNum)) {
        parentUserId = tcaIdToUserId.get(parentIdNum)!
        parentSystemId = tcaIdToSystemId.get(parentIdNum) || null
        console.log(`  ✅ Parent found in BATCH: User ${parentUserId}`)
      } else {
        // Resolve từ DB
        console.log(`  ❌ Parent NOT in BATCH, checking DB...`)
        const parentTCAMember = await prisma.tCAMember?.findUnique({
          where: { tcaId: parentIdNum },
          include: { user: { select: { id: true } } }
        })
        if (parentTCAMember && parentTCAMember.userId) {
          parentUserId = parentTCAMember.userId
          console.log(`  ✅ Parent found in DB: User ${parentUserId}`)
          
          const parentSystem = await prisma.system.findFirst({
            where: { userId: parentTCAMember.userId, onSystem: 1 }
          })
          if (parentSystem) {
            parentSystemId = parentSystem.autoId
          }
        } else {
          console.log(`  ❌ Parent NOT found anywhere!`)
        }
      }
      
      console.log(`  → Final parentUserId: ${parentUserId}`)
    } else {
      console.log(`  → This is ROOT node, parentUserId = null`)
    }

    // ========== CREATE USER ==========
    // Check existing user
    let existingUser = null
    if (email) {
      existingUser = await prisma.user.findUnique({
        where: { email: email }
      })
    }

    let userId: number

    if (existingUser) {
      userId = (existingUser as any).id
      console.log(`  📝 User exists: ${userId}`)
    } else {
      // Create new user
      const hashedPassword = await bcrypt.hash('Brk#3773', 10)
      
      // Get next available ID
      const maxId = await prisma.user.findFirst({
        orderBy: { id: 'desc' },
        select: { id: true }
      })
      const newId = (maxId?.id || 0) + 1

      console.log(`  → Creating user with id=${newId}, referrerId=${parentUserId}`)

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
      console.log(`  ✅ Created user: ${userId} with referrerId=${newUser.referrerId}`)

      // Verify immediately
      const verifyUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, referrerId: true }
      })
      console.log(`  🔍 Verified: referrerId=${verifyUser?.referrerId}`)
    }

    tcaIdToUserId.set(node.id, userId)

    // Create System
    let existingSystem = await prisma.system.findFirst({
      where: { userId: userId, onSystem: 1 }
    })

    let systemId: number

    if (!existingSystem) {
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

      systemId = newSystem.autoId
      console.log(`  ✅ Created system: ${systemId} with refSysId=${parentSystemId || 0}`)
    } else {
      systemId = existingSystem.autoId
      console.log(`  📝 System exists: ${systemId}`)
    }

    tcaIdToSystemId.set(node.id, systemId)

    // Create TCAMember
    let existingMember = await prisma.tCAMember?.findUnique({
      where: { tcaId: node.id }
    })

    if (!existingMember) {
      await prisma.tCAMember.create({
        data: {
          tcaId: node.id,
          userId: userId,
          type: node.type || 'item',
          groupName: node.groupName || null,
          name: node.name || '',
          phone: phone,
          email: email,
          address: memberInfo.address || null,
          parentTcaId: parentTcaId ? Number(parentTcaId) : null,
          parentName: null,
          teamSize: 0
        }
      })
      console.log(`  ✅ Created TCAMember`)
    }
  }

  // Final verification
  console.log('\n\n==========================================')
  console.log('FINAL VERIFICATION')
  console.log('==========================================\n')

  for (const node of mockNodes) {
    const member = await prisma.tCAMember.findUnique({
      where: { tcaId: node.id },
      include: { user: { select: { id: true, name: true, referrerId: true } } }
    })

    if (member && member.user) {
      const expectedReferrer = node.parentFolderId 
        ? tcaIdToUserId.get(Number(node.parentFolderId)) || null 
        : null

      console.log(`\nTCA ${node.id} (${node.name}):`)
      console.log(`  User ID: ${member.user.id}`)
      console.log(`  User Name: ${member.user.name}`)
      console.log(`  parentFolderId: ${node.parentFolderId}`)
      console.log(`  Expected referrerId: ${expectedReferrer}`)
      console.log(`  Actual referrerId: ${member.user.referrerId}`)
      
      if (member.user.referrerId === expectedReferrer) {
        console.log(`  ✅ referrerId ĐÚNG!`)
      } else {
        console.log(`  ❌ referrerId SAI!`)
      }
    }
  }

  // Cleanup
  console.log('\n\n==========================================')
  console.log('CLEANUP: Xóa test data...')
  console.log('==========================================')

  for (const node of mockNodes) {
    await prisma.tCAMember.delete({ where: { tcaId: node.id } }).catch(() => {})
    const member = await prisma.tCAMember.findUnique({ where: { tcaId: node.id } })
    if (member) {
      await prisma.system.deleteMany({ where: { userId: member.userId, onSystem: 1 } })
      await prisma.user.delete({ where: { id: member.userId } }).catch(() => {})
    }
  }

  console.log('✅ Cleanup done!')

  await prisma.$disconnect()
}

testSyncWithMockData().catch(console.error)
