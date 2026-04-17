/**
 * Test TCA Sync với Logic Mới
 * Sử dụng sibling closure để tìm parent
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient() as any

async function testSyncNewLogic() {
  console.log('==========================================')
  console.log('TEST: Sync với Logic Mới (sibling closure)')
  console.log('==========================================\n')

  // Mock nodes
  const mockNodes = [
    {
      id: 99921,
      type: 'item',
      name: 'Test Root 99921',
      parentFolderId: null,
    },
    {
      id: 99922,
      type: 'item',
      name: 'Test Child 99922',
      parentFolderId: 99921,
    },
    {
      id: 99923,
      type: 'item',
      name: 'Test Child 99923',
      parentFolderId: 60073, // Parent là folder TCA
    }
  ]

  const mockMemberInfo = {
    99921: { phone: '099921001', email: 'test.99921@test.com' },
    99922: { phone: '099921002', email: 'test.99922@test.com' },
    99923: { phone: '099921003', email: 'test.99923@test.com' }
  }

  const tcaIdToUserId = new Map<number, number>()
  const tcaIdToSystemId = new Map<number, number>()

  for (const node of mockNodes) {
    console.log(`\n${'='.repeat(50)}`)
    console.log(`Processing: ${node.name} (TCA ${node.id})`)
    
    const memberInfo = mockMemberInfo[node.id] || {}
    const phone = memberInfo.phone || null
    const email = memberInfo.email || null

    // ========== RESOLVE PARENT (Logic Mới) ==========
    const parentTcaId = node.parentFolderId
    let parentUserId: number | null = null
    let parentSystemId: number | null = null

    console.log(`  DEBUG: parentFolderId = ${parentTcaId}`)

    if (parentTcaId && String(parentTcaId) !== 'root' && String(parentTcaId) !== '0') {
      const parentIdNum = Number(parentTcaId)
      
      // Thử lấy từ batch trước
      if (tcaIdToUserId.has(parentIdNum)) {
        parentUserId = tcaIdToUserId.get(parentIdNum)!
        parentSystemId = tcaIdToSystemId.get(parentIdNum) || null
        console.log(`  DEBUG: Parent found in BATCH, parentUserId=${parentUserId}`)
      } else {
        // Resolve từ DB
        console.log(`  DEBUG: Parent NOT in batch, checking DB...`)
        
        // Thử 1: Tìm TCAMember với tcaId = parentFolderId
        let parentTCAMember = await prisma.tCAMember.findUnique({
          where: { tcaId: parentIdNum },
          include: { user: { select: { id: true } } }
        })
        
        if (parentTCAMember && parentTCAMember.userId) {
          parentUserId = parentTCAMember.userId
          console.log(`  DEBUG: Parent found via TCAMember.tcaId, parentUserId=${parentUserId}`)
          
          const parentSystem = await prisma.system.findFirst({
            where: { userId: parentTCAMember.userId, onSystem: 1 }
          })
          if (parentSystem) {
            parentSystemId = parentSystem.autoId
          }
        } else {
          // Thử 2: TCA parent là FOLDER - tìm sibling TCA Members
          console.log(`  DEBUG: TCA ${parentIdNum} not found (might be folder), trying siblings...`)
          
          const siblingMembers = await prisma.tCAMember.findMany({
            where: { parentTcaId: parentIdNum }
          })
          
          console.log(`  DEBUG: Found ${siblingMembers.length} siblings in folder ${parentIdNum}`)
          
          if (siblingMembers.length > 0) {
            // Tìm parent User dựa trên SystemClosure của sibling
            for (const sibling of siblingMembers) {
              // Tìm System của sibling
              const siblingSystem = await prisma.system.findFirst({
                where: { userId: sibling.userId, onSystem: 1 }
              })
              
              if (!siblingSystem) continue
              
              const siblingSystemId = siblingSystem.autoId
              
              // Tìm SystemClosure để xác định F1
              const closure = await prisma.systemClosure.findFirst({
                where: { 
                  descendantId: siblingSystemId,
                  depth: 1,
                  systemId: 1
                }
              })
              
              if (closure && closure.depth > 0) {
                const ancestorSystem = await prisma.system.findUnique({
                  where: { autoId: closure.ancestorId }
                })
                
                if (ancestorSystem) {
                  parentUserId = ancestorSystem.userId
                  parentSystemId = ancestorSystem.autoId
                  console.log(`  DEBUG: Parent found via sibling closure, parentUserId=${parentUserId}`)
                  break
                }
              } else if (siblingSystem.refSysId === 0) {
                // Sibling là F1 (root), folder parent tương ứng với F1
                // Tìm System có refSysId = siblingSystemId (vì F1 có refSysId = root.autoId)
                // Ví dụ: 13809 có refSysId = 13807 (F1 của 13807)
                // Vậy 13880 có refSysId = 0, cần tìm System có refSysId = 13880
                
                const parentSystem = await prisma.system.findFirst({
                  where: { 
                    refSysId: siblingSystemId,
                    onSystem: 1
                  }
                })
                
                if (parentSystem) {
                  parentUserId = parentSystem.userId
                  parentSystemId = parentSystem.autoId
                  console.log(`  DEBUG: Parent found (sibling is F1), parentUserId=${parentUserId}`)
                  break
                } else {
                  // Không tìm được, thử tìm System có autoId = siblingSystemId - 1
                  const fallbackSystem = await prisma.system.findFirst({
                    where: { 
                      autoId: siblingSystemId - 1,
                      onSystem: 1
                    }
                  })
                  
                  if (fallbackSystem && fallbackSystem.refSysId !== 0) {
                    parentUserId = fallbackSystem.userId
                    parentSystemId = fallbackSystem.autoId
                    console.log(`  DEBUG: Parent found (fallback), parentUserId=${parentUserId}`)
                    break
                  }
                }
              } else {
                // Sibling có refSysId khác 0, tìm System đó
                const parentSystem = await prisma.system.findFirst({
                  where: { 
                    autoId: siblingSystem.refSysId,
                    onSystem: 1
                  }
                })
                
                if (parentSystem) {
                  parentUserId = parentSystem.userId
                  parentSystemId = parentSystem.autoId
                  console.log(`  DEBUG: Parent found via sibling.refSysId, parentUserId=${parentUserId}`)
                  break
                }
              }
            }
          }
          
          if (!parentUserId) {
            console.log(`  DEBUG: Parent NOT found anywhere!`)
          }
        }
      }
    } else {
      console.log(`  DEBUG: Root node (no parent)`)
    }

    console.log(`  FINAL: parentUserId = ${parentUserId}`)

    // ========== Tạo User ==========
    let existingUser = await prisma.user.findUnique({
      where: { email: email! }
    })

    if (existingUser) {
      console.log(`  User exists: ${existingUser.id}`)
    } else {
      const bcrypt = await import('bcryptjs')
      const hashedPassword = await bcrypt.hash('Brk#3773', 10)
      
      const { getNextAvailableId } = await import('@/lib/id-helper')
      const newId = await getNextAvailableId()

      console.log(`  Creating user: id=${newId}, referrerId=${parentUserId}`)

      const newUser = await prisma.user.create({
        data: {
          id: newId,
          name: node.name,
          email: email || `tca_${node.id}@placeholder.local`,
          phone: phone,
          password: hashedPassword,
          role: 'STUDENT',
          referrerId: parentUserId
        }
      })

      console.log(`  ✅ Created user: ${newUser.id}, referrerId=${newUser.referrerId}`)
      
      tcaIdToUserId.set(node.id, newUser.id)

      // Create System
      const newSystem = await prisma.system.create({
        data: {
          userId: newUser.id,
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
          userId: newUser.id,
          type: node.type || 'item',
          name: node.name,
          phone: phone,
          email: email,
          parentTcaId: parentTcaId ? Number(parentTcaId) : null
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
  
  for (const email of Object.values(mockMemberInfo).map(m => m.email)) {
    await prisma.user.delete({ where: { email } }).catch(() => {})
  }
  
  console.log('Done!')
  await prisma.$disconnect()
}

testSyncNewLogic().catch(console.error)
