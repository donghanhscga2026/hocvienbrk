/**
 * Test TCA Sync API trực tiếp
 * Gọi API và xem logs chi tiết
 */

async function testSyncAPI() {
  console.log('==========================================')
  console.log('TEST: Gọi trực tiếp Sync API')
  console.log('==========================================\n')

  // Mock data - test với parent TCA có trong DB
  // TCA 60073 -> User 327 (PHẠM THỊ NHUNG) - đã tồn tại trong DB
  const mockPayload = {
    source: 'TEST_DIRECT_API',
    timestamp: Date.now(),
    allNodes: [
      {
        id: 99901,
        type: 'item',
        name: 'Test User New 1',
        parentFolderId: 60073, // Parent TCA đã có trong DB
        groupName: 'Test Group'
      },
      {
        id: 99902,
        type: 'item',
        name: 'Test User New 2',
        parentFolderId: 99901, // Parent là user mới tạo ở trên
        groupName: 'Test Group'
      }
    ],
    memberInfo: {
      99901: { phone: '099900001', email: 'test.new1@test.com', address: 'Test' },
      99902: { phone: '099900002', email: 'test.new2@test.com', address: 'Test' }
    },
    stats: { total: 2, folders: 0, items: 2 }
  }

  console.log('Payload gửi lên:')
  console.log(JSON.stringify(mockPayload, null, 2))
  console.log('')

  try {
    // Gọi API Sync
    const response = await fetch('http://localhost:3000/api/sync-tca', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mockPayload)
    })

    console.log('Response status:', response.status)
    
    const result = await response.json()
    console.log('\nAPI Response:')
    console.log(JSON.stringify(result, null, 2))

    if (result.success) {
      console.log('\n\n✅ Sync thành công!')
      console.log('Kiểm tra database...')
      
      // Import prisma để verify
      const { PrismaClient } = await import('@prisma/client')
      const prisma = new PrismaClient() as any
      
      for (const node of mockPayload.allNodes) {
        const member = await prisma.tCAMember.findUnique({
          where: { tcaId: node.id }
        })

        if (member) {
          const user = await prisma.user.findUnique({
            where: { id: member.userId },
            select: { id: true, name: true, referrerId: true }
          })

          if (user) {
            console.log(`\nTCA ${node.id} (${node.name}):`)
            console.log(`  User ID: ${user.id}`)
            console.log(`  referrerId: ${user.referrerId}`)
          }
        }
      }

      // Cleanup
      console.log('\n\nCleanup...')
      for (const node of mockPayload.allNodes) {
        await prisma.tCAMember.delete({ where: { tcaId: node.id } }).catch(() => {})
        const member = await prisma.tCAMember.findUnique({ where: { tcaId: node.id } })
        if (member) {
          await prisma.system.deleteMany({ where: { userId: member.userId, onSystem: 1 } }).catch(() => {})
          await prisma.user.delete({ where: { id: member.userId } }).catch(() => {})
        }
      }
      console.log('Done!')
      
      await prisma.$disconnect()
    } else {
      console.log('\n\n❌ Sync thất bại:', result.error)
    }
  } catch (error) {
    console.error('Error calling API:', error)
    console.log('\n\nCó thể server chưa chạy. Hãy start dev server trước:')
    console.log('npm run dev')
  }
}

testSyncAPI()
