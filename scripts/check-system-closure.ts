import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('=== KIỂM TRA SYSTEM VÀ SYSTEM_CLOSURE ===\n')

  // Lấy tất cả TCA Members với thông tin User và System
  const tcaMembers = await prisma.tCAMember.findMany({
    orderBy: { tcaId: 'asc' },
    include: {
      user: true
    }
  })

  console.log(`Tổng số TCAMembers: ${tcaMembers.length}\n`)

  // Lấy Systems của các TCA members
  const userIds = tcaMembers.map(t => t.userId).filter(id => id != null)
  const systems = await prisma.system.findMany({
    where: { 
      userId: { in: userIds },
      onSystem: 1
    }
  })
  
  const systemMap = new Map(systems.map(s => [s.userId, s]))

  console.log('=== BẢNG SYSTEM (chỉ TCA members) ===')
  console.log('TcaId | UserId | UserName           | SystemId | RefSysId')
  console.log('-'.repeat(70))

  for (const tca of tcaMembers) {
    const sys = systemMap.get(tca.userId)
    if (sys) {
      const name = tca.name.substring(0, 18).padEnd(18)
      console.log(`${tca.tcaId} | ${String(tca.userId).padStart(5)} | ${name} | ${String(sys.autoId).padStart(8)} | ${sys.refSysId || '-'}`)
    } else {
      const name = tca.name.substring(0, 18).padEnd(18)
      console.log(`${tca.tcaId} | ${String(tca.userId).padStart(5)} | ${name} | KHÔNG CÓ SYSTEM |`)
    }
  }

  // Kiểm tra SystemClosure
  console.log('\n=== KIỂM TRA SYSTEM_CLOSURE ===\n')

  const allClosures = await prisma.systemClosure.findMany({
    orderBy: [{ descendantId: 'asc' }, { depth: 'asc' }]
  })

  console.log(`Tổng số closures: ${allClosures.length}\n`)

  // Build closure map theo descendant
  const closureByDescendant = new Map<number, any[]>()
  for (const c of allClosures) {
    if (!closureByDescendant.has(c.descendantId)) {
      closureByDescendant.set(c.descendantId, [])
    }
    closureByDescendant.get(c.descendantId)!.push(c)
  }

  // System map để tra cứu
  const systemByAutoId = new Map(systems.map(s => [s.autoId, s]))

  // Kiểm tra từng TCA member
  console.log('TcaId | Name               | System | Closures | MaxDepth | HasRoot | Status')
  console.log('-'.repeat(85))

  let missingClosure = 0
  for (const tca of tcaMembers) {
    const sys = systemMap.get(tca.userId)
    if (!sys) {
      console.log(`${tca.tcaId} | ${tca.name.substring(0, 18).padEnd(18)} |    -    |    -     |    -     |    -     | ❌ KHÔNG CÓ SYSTEM`)
      continue
    }

    const closures = closureByDescendant.get(sys.autoId) || []
    
    if (closures.length === 0) {
      missingClosure++
      console.log(`${tca.tcaId} | ${tca.name.substring(0, 18).padEnd(18)} | ${String(sys.autoId).padStart(5)} |    0     |    -     |    -     | ❌ KHÔNG CÓ CLOSURE!`)
    } else {
      const hasRootClosure = closures.some(c => c.ancestorId === 1)
      const depth = Math.max(...closures.map(c => c.depth))
      
      let status = '✅ OK'
      if (!hasRootClosure && tca.tcaId !== 60073) {
        status = '⚠️ Không có đường đến root'
      }
      
      console.log(`${tca.tcaId} | ${tca.name.substring(0, 18).padEnd(18)} | ${String(sys.autoId).padStart(5)} | ${String(closures.length).padStart(8)} | ${String(depth).padStart(8)} | ${hasRootClosure ? 'YES' : 'NO'}     | ${status}`)
    }
  }

  console.log(`\n⚠️ Tổng cộng ${missingClosure} members không có closure`)

  // Kiểm tra mối quan hệ parent-child
  console.log('\n=== KIỂM TRA MỐI QUAN HỆ PARENT-CHILD ===\n')

  let wrongRefSys = 0
  let missingClosureParentChild = 0

  for (const tca of tcaMembers) {
    if (!tca.parentTcaId) continue // Root

    const parentTCA = tcaMembers.find(t => t.tcaId === tca.parentTcaId)
    if (!parentTCA) continue

    const childSys = systemMap.get(tca.userId)
    const parentSys = systemMap.get(parentTCA.userId)

    if (!childSys || !parentSys) continue

    // Kiểm tra refSysId
    if (childSys.refSysId !== parentSys.autoId) {
      wrongRefSys++
      console.log(`❌ ${tca.tcaId} ${tca.name}: refSysId=${childSys.refSysId} SAI (đúng: ${parentSys.autoId})`)
    }

    // Kiểm tra closure từ parent đến child
    const closure = await prisma.systemClosure.findFirst({
      where: {
        ancestorId: parentSys.autoId,
        descendantId: childSys.autoId
      }
    })

    if (!closure) {
      missingClosureParentChild++
      console.log(`❌ ${tca.tcaId} ${tca.name}: KHÔNG CÓ CLOSURE từ parent ${parentSys.autoId}`)
    }
  }

  console.log(`\n❌ ${wrongRefSys} members có refSysId sai`)
  console.log(`❌ ${missingClosureParentChild} members thiếu closure từ parent`)

  // Kiểm tra cụ thể Nhung Phạm (60073) và các con
  console.log('\n=== KIỂM TRA NHUNG PHẠM (60073) VÀ CÁC CON ===\n')

  const nhungTCA = tcaMembers.find(t => t.tcaId === 60073)
  const nhungSystem = nhungTCA ? systemMap.get(nhungTCA.userId) : null

  if (nhungSystem) {
    console.log(`✅ Nhung Phạm: User ${nhungTCA?.userId}, System ${nhungSystem.autoId}, refSysId ${nhungSystem.refSysId}`)

    // Lấy tất cả children
    const nhungChildren = tcaMembers.filter(t => t.parentTcaId === 60073)
    console.log(`\nNhung có ${nhungChildren.length} con trong TCA:`)

    for (const child of nhungChildren) {
      const childSys = systemMap.get(child.userId)
      if (childSys) {
        const closure = await prisma.systemClosure.findFirst({
          where: {
            ancestorId: nhungSystem.autoId,
            descendantId: childSys.autoId
          }
        })
        
        let status = closure ? `✅ Closure depth ${closure.depth}` : '❌ KHÔNG CÓ CLOSURE'
        console.log(`  - ${child.tcaId} ${child.name}: System ${childSys.autoId}, refSysId=${childSys.refSysId} | ${status}`)
      } else {
        console.log(`  - ${child.tcaId} ${child.name}: ❌ KHÔNG CÓ SYSTEM!`)
      }
    }

    // Kiểm tra F1 (level 1)
    const f1Closures = await prisma.systemClosure.findMany({
      where: {
        ancestorId: nhungSystem.autoId,
        depth: 1
      }
    })
    console.log(`\n📊 Nhung có ${f1Closures.length} F1 trong system_closure`)

    // Lấy F1 từ database
    console.log('\nF1 (từ closure):')
    for (const c of f1Closures) {
      const f1Sys = systemByAutoId.get(c.descendantId)
      if (f1Sys) {
        const f1TCA = tcaMembers.find(t => t.userId === f1Sys.userId)
        console.log(`  - ${f1TCA?.tcaId} ${f1TCA?.name}: System ${f1Sys.autoId}`)
      }
    }
  } else {
    console.log('❌ Không tìm thấy Nhung Phạm trong TCA')
  }

  // Tổng kết
  console.log('\n=== TỔNG KẾT ===')
  console.log(`TCA Members: ${tcaMembers.length}`)
  console.log(`Systems: ${systems.length}`)
  console.log(`Closures: ${allClosures.length}`)
  console.log(`⚠️ Missing Closure: ${missingClosure}`)
  console.log(`❌ Wrong refSysId: ${wrongRefSys}`)
  console.log(`❌ Missing Parent Closure: ${missingClosureParentChild}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
