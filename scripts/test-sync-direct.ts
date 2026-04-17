/**
 * Test: Gọi trực tiếp API Sync và trace giá trị
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient() as any

async function testSync() {
  console.log('=== Test Sync API Direct ===\n')
  
  // Payload tương tự như Chrome Extension gửi
  const payload = {
    source: 'TEST_DIRECT',
    timestamp: Date.now(),
    allNodes: [
      {
        id: 99931,
        type: 'item',
        name: 'Test Huyền Trang 99931',
        parentFolderId: 60073, // Parent = folder của Nhung Phạm
        groupName: 'THÁI SƠN'
      }
    ],
    memberInfo: {
      99931: { phone: '099931001', email: 'test.99931@test.com', address: 'Test' }
    },
    stats: { total: 1, folders: 0, items: 1 }
  }
  
  console.log('Payload:', JSON.stringify(payload, null, 2))
  console.log('')
  
  // Gọi API Sync
  try {
    const response = await fetch('http://localhost:3000/api/sync-tca', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    
    const result = await response.json()
    console.log('Response:', JSON.stringify(result, null, 2))
    
    if (result.success) {
      // Kiểm tra database
      const member = await prisma.tCAMember.findUnique({ where: { tcaId: 99931 } })
      if (member) {
        const user = await prisma.user.findUnique({
          where: { id: member.userId },
          select: { id: true, name: true, referrerId: true }
        })
        
        console.log('\nDatabase Result:')
        console.log('  User ID:', user?.id)
        console.log('  User Name:', user?.name)
        console.log('  referrerId:', user?.referrerId)
        console.log('  Expected: 327')
        console.log('  Status:', user?.referrerId === 327 ? '✅ ĐÚNG' : '❌ SAI')
      }
      
      // Cleanup
      await prisma.tCAMember.delete({ where: { tcaId: 99931 } }).catch(() => {})
      const m = await prisma.tCAMember.findUnique({ where: { tcaId: 99931 } })
      if (m) {
        await prisma.system.deleteMany({ where: { userId: m.userId, onSystem: 1 } }).catch(() => {})
        await prisma.user.delete({ where: { id: m.userId } }).catch(() => {})
      }
      console.log('\nCleanup done!')
    }
  } catch (error) {
    console.error('Error:', error)
    console.log('\nServer có thể chưa chạy. Hãy chạy: npm run dev')
  }
  
  await prisma.$disconnect()
}

testSync()
