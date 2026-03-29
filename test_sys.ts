import prisma from './lib/prisma'

async function buildStandardTree(
    rootId: number, 
    type: 'USER' | 'SYSTEM',
    systemId?: number
): Promise<any | null> {
    const isSystem = type === 'SYSTEM'
    
    // 1. Lấy thông tin Root
    const rootUser = await prisma.user.findUnique({
        where: { id: rootId },
        select: { id: true, name: true, referrerId: true }
    })
    if (!rootUser) return null

    let rootAutoId = rootId
    if (isSystem) {
        const rootSys = await prisma.system.findUnique({ where: { userId: rootId, onSystem: systemId } })
        if (!rootSys) return null
        rootAutoId = rootSys.autoId
    }

    // 2. Lấy F1s trực tiếp
    let f1Data: any[] = []
    if (isSystem) {
        f1Data = await prisma.system.findMany({
            where: { refSysId: rootId, onSystem: systemId },
            include: { user: { select: { id: true, name: true } } }
        })
    } else {
        const users = await prisma.user.findMany({
            where: { referrerId: rootId },
            select: { id: true, name: true }
        })
        f1Data = users.map(u => ({ ...u, autoId: u.id, user: u }))
    }

    if (f1Data.length === 0) {
        return {
            id: rootUser.id, name: rootUser.name, referrerId: rootUser.referrerId,
            totalSubCount: 1, f1aCount: 0, f1bCount: 0, f1cCount: 0,
            groupA: [], groupB: [], children: [], isRoot: true
        }
    }

    const f1AutoIds = f1Data.map(f => f.autoId)

    // 3. Lấy Closures (Lấy descendants của F1s để tìm F2s)
    const closureModel = isSystem ? prisma.systemClosure : prisma.userClosure
    const whereBase = isSystem ? { systemId } : {}

    const allDescOfF1s = await (closureModel as any).findMany({
        where: { ...whereBase, ancestorId: { in: f1AutoIds }, depth: { gte: 1 } },
        select: { descendantId: true }
    })
    const f2AutoIds = [...new Set(allDescOfF1s.map((c: any) => c.descendantId))]

    const [allClosures, totalCount] = await Promise.all([
        (closureModel as any).findMany({
            where: {
                ...whereBase,
                OR: [
                    { ancestorId: { in: [rootAutoId, ...f1AutoIds, ...f2AutoIds] } },
                    { descendantId: { in: f1AutoIds } }
                ],
                depth: { gte: 0 }
            },
            include: { descendant: isSystem ? { include: { user: { select: { id: true, name: true } } } } : { select: { id: true, name: true } } }
        }),
        (closureModel as any).count({
            where: { ...whereBase, ancestorId: rootAutoId }
        })
    ])

    // 4. Build map
    const closureByAncestor = new Map<number, any[]>()
    for (const c of allClosures) {
        if (!closureByAncestor.has(c.ancestorId)) closureByAncestor.set(c.ancestorId, [])
        const desc = isSystem ? c.descendant.user : c.descendant
        closureByAncestor.get(c.ancestorId)!.push({
            depth: c.depth,
            userId: desc.id,
            name: desc.name,
            autoId: isSystem ? c.descendantId : desc.id
        })
    }

    // 5. Phân nhóm F1
    let groupA: any[] = [], groupB: any[] = [], groupC: any[] = []
    for (const f1 of f1Data) {
        const closures = closureByAncestor.get(f1.autoId) || []
        const hasF2 = closures.some(c => c.depth === 1)
        const hasF3 = closures.some(c => c.depth === 2)
        const f2s = closures.filter(c => c.depth === 1).map(c => ({ id: c.userId, name: c.name }))
        const fData = { id: f1.user.id, name: f1.user.name, totalSubCount: closures.length, children: f2s }

        if (!hasF2) groupA.push(fData)
        else if (!hasF3) groupB.push(fData)
        else groupC.push(fData)
    }

    // 6. Build Children (Group C)
    const children: any[] = groupC.map(f1Info => {
        const f1Record = f1Data.find(f => f.user.id === f1Info.id)
        const f1Closures = closureByAncestor.get(f1Record.autoId) || []
        const grandF1s = f1Closures.filter(c => c.depth === 1)
        let gA: any[] = [], gB: any[] = [], gC: any[] = []

        for (const gf1 of grandF1s) {
            const gf1Closures = closureByAncestor.get(gf1.autoId) || []
            const gHasF2 = gf1Closures.some(c => c.depth === 1)
            const gHasF3 = gf1Closures.some(c => c.depth === 2)
            const gf2s = gf1Closures.filter(c => c.depth === 1).map(c => ({ id: c.userId, name: c.name }))
            const gfData = { id: gf1.userId, name: gf1.name, totalSubCount: gf1Closures.length, children: gf2s }

            if (!gHasF2) gA.push(gfData)
            else if (!gHasF3) gB.push(gfData)
            else gC.push(gfData)
        }

        return {
            id: f1Info.id, name: f1Info.name, referrerId: null,
            totalSubCount: f1Closures.length, f1aCount: gA.length, f1bCount: gB.length, f1cCount: gC.length,
            groupA: gA, groupB: gB,
            children: gC.map(cf => ({
                id: cf.id, name: cf.name, referrerId: null, totalSubCount: cf.totalSubCount,
                f1aCount: 0, f1bCount: 0, f1cCount: 0, groupA: [], groupB: [], children: []
            }))
        }
    })

    return {
        id: rootUser.id, name: rootUser.name, referrerId: rootUser.referrerId || null,
        totalSubCount: totalCount,
        f1aCount: groupA.length,
        f1bCount: groupB.length,
        f1cCount: groupC.length,
        groupA,
        groupB,
        children,
        isRoot: true
    }
}

async function test() {
  const rootParams = 1;
  const rootSys = await prisma.system.findFirst({
        where: { onSystem: rootParams, refSysId: 0 }
  })
  
  console.log("Root system:", rootSys);
  if (rootSys) {
      const treeData = await buildStandardTree(rootSys.userId, 'SYSTEM', rootParams);
      console.log(JSON.stringify(treeData, null, 2));
  }
}

test().catch(console.error).finally(() => prisma.$disconnect());
