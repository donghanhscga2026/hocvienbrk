/**
 * Test TCA Sync với Logic Đơn Giản
 * Tìm sibling và lấy referrerId trực tiếp
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient() as any

async function testSimpleLogic() {
  console.log('==========================================')
  console.log('TEST: Sync với Logic Đơn Giản')
  console.log('==========================================\n')

  // Test case 1: TCA 61789 với parentFolderId = 60073
  console.log('=== Test Case 1: TCA 61789 (parentFolderId = 60073) ===')
  
  const parentIdNum = 60073
  
  // Tìm sibling TCAMembers có cùng parentTcaId
  const siblingMembers = await prisma.tCAMember.findMany({
    where: { parentTcaId: parentIdNum },
    take: 5
  })
  
  console.log(`Sibling TCAMembers với parentTcaId = ${parentIdNum}:`)
  for (const s of siblingMembers) {
    console.log(`  TCA ${s.tcaId}: User ${s.userId}`)
  }
  
  if (siblingMembers.length > 0) {
    // Lấy User của sibling đầu tiên
    const siblingUser = await prisma.user.findUnique({
      where: { id: siblingMembers[0].userId },
      select: { id: true, name: true, referrerId: true }
    })
    
    console.log(`\nSibling User:`)
    console.log(`  ID: ${siblingUser?.id}`)
    console.log(`  Name: ${siblingUser?.name}`)
    console.log(`  referrerId: ${siblingUser?.referrerId}`)
    
    // Kết quả
    console.log(`\n✅ TCA 61789 nên có referrerId = ${siblingUser?.referrerId}`)
  }
  
  // Test case 2: Verify với DB thực tế
  console.log('\n\n=== Verify với DB thực tế ===')
  
  const user8291 = await prisma.user.findUnique({
    where: { id: 8291 },
    select: { id: true, name: true, referrerId: true }
  })
  
  console.log(`User 8291 (TRẦN THỊ HUYỀN TRANG):`)
  console.log(`  referrerId hiện tại: ${user8291?.referrerId}`)
  console.log(`  Kết quả mong đợi: 327 (PHẠM THỊ NHUNG)`)
  
  if (user8291?.referrerId === 327) {
    console.log('  ✅ ĐÚNG!')
  } else {
    console.log('  ❌ SAI!')
  }

  await prisma.$disconnect()
}

testSimpleLogic().catch(console.error)
