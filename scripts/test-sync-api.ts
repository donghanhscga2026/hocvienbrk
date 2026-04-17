import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient() as any

async function testSyncAPI() {
  console.log('==========================================')
  console.log('TEST: Gọi trực tiếp Sync API')
  console.log('==========================================\n')

  // Mock data - giả lập dữ liệu từ Chrome Extension
  const mockPayload = {
    source: 'TEST_DIRECT',
    timestamp: Date.now(),
    allNodes: [
      {
        id: 88881,
        type: 'item',
        name: 'Test Root Direct',
        parentFolderId: null, // Root node
        groupName: 'Test Group'
      },
      {
        id: 88882,
        type: 'item',
        name: 'Test Child Direct',
        parentFolderId: 88881, // Parent là 88881
        groupName: 'Test Group'
      }
    ],
    memberInfo: {
      88881: { phone: '0888000001', email: 'test.root.direct@test.com', address: 'Test Address' },
      88882: { phone: '0888000002', email: 'test.child.direct@test.com', address: 'Test Address 2' }
    },
    stats: { total: 2, folders: 0, items: 2 }
  }

  console.log('Mock Payload:')
  console.log(JSON.stringify(mockPayload, null, 2))
  console.log('')

  // Gọi API Sync
  try {
    const response = await fetch('http://localhost:3000/api/sync-tca', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mockPayload)
    })

    const result = await response.json()
    console.log('\nAPI Response:')
    console.log(JSON.stringify(result, null, 2))

    if (result.success) {
      console.log('\n\nKiểm tra database...')
      
      for (const node of mockPayload.allNodes) {
        const member = await prisma.tCAMember.findUnique({
          where: { tcaId: node.id },
          include: { user: { select: { id: true, name: true, referrerId: true } } }
        })

        if (member && member.user) {
          const expectedReferrer = node.parentFolderId ? 88881 : null
          console.log(`\nTCA ${node.id} (${node.name}):`)
          console.log(`  User ID: ${member.user.id}`)
          console.log(`  Expected referrerId: ${expectedReferrer}`)
          console.log(`  Actual referrerId: ${member.user.referrerId}`)
          console.log(`  ${member.user.referrerId === expectedReferrer ? '✅ ĐÚNG' : '❌ SAI'}`)
        }
      }

      // Cleanup
      console.log('\n\nCleanup...')
      for (const node of mockPayload.allNodes) {
        await prisma.tCAMember.delete({ where: { tcaId: node.id } }).catch(() => {})
      }
      console.log('Done!')
    }
  } catch (error) {
    console.error('Error:', error)
  }

  await prisma.$disconnect()
}

testSyncAPI()
