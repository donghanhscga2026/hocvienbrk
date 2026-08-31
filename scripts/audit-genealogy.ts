import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function auditGenealogy() {
  console.log('=== STARTING GENEALOGY AUDIT (SYSTEM 1 - TCA) ===')
  
  const systemNodes = await prisma.system.findMany({
    where: { onSystem: 1 },
    include: { user: { select: { id: true, name: true } } }
  })
  
  const allUserIds = systemNodes.map(s => s.userId)
  
  const tcaMembers = await (prisma as any).tCAMember.findMany({
    where: { 
      OR: [
        { userId: { in: allUserIds } },
        { tcaId: { in: allUserIds } }
      ]
    },
    select: { userId: true, tcaId: true, level: true }
  })
  
  const tcaMap = new Map()
  for (const m of tcaMembers) {
    if (m.userId) tcaMap.set(m.userId, m.level)
    if (m.tcaId) tcaMap.set(m.tcaId, m.level)
  }

  const allIssues = []

  for (const node of systemNodes) {
    const dbLevel = tcaMap.get(node.userId)
    
    // Giả lập logic gán level trong buildStandardTree
    let willAssignLevel = false
    
    // 1. Is Root?
    if (node.refSysId === 0) willAssignLevel = true
    
    // 2. Is in Group C of its parent? (Meaning it has grandchildren)
    // Để node này thuộc Group C, nó phải có F1, và F1 đó phải có F1 (tổng cộng có cháu)
    const children = systemNodes.filter(s => s.refSysId === node.userId && s.userId !== node.userId)
    const hasGrandchildren = children.some(child => {
        return systemNodes.some(s => s.refSysId === child.userId && s.userId !== child.userId)
    })

    if (hasGrandchildren) willAssignLevel = true

    // Kết luận Audit cho node này
    if (dbLevel != null && !willAssignLevel) {
      allIssues.push({
        id: node.userId,
        name: node.user?.name,
        level: dbLevel,
        parentId: node.refSysId
      })
    }
  }
  
  console.log(`\nTổng số node trong hệ thống: ${systemNodes.length}`)
  console.log(`Số node bị lỗi hiển thị Level (Có trong DB nhưng mất trên sơ đồ): ${allIssues.length}`)
  
  if (allIssues.length > 0) {
    console.log('\nDANH SÁCH CHI TIẾT CÁC NODE BỊ LỖI:')
    allIssues.forEach(issue => {
      console.log(`- [#${issue.id}] ${issue.name}: Level ${issue.level} (Cha: #${issue.parentId})`)
    })
  } else {
    console.log('\nKhông tìm thấy lỗi hệ thống nào. Mọi node đều đang hiển thị đúng theo logic hiện tại.')
  }

  await prisma.$disconnect()
}

auditGenealogy().catch(console.error)
