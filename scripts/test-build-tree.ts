import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Copy exact logic từ buildStandardTree
async function buildStandardTree(rootId: number, systemId: number) {
    const rootUser = await prisma.user.findUnique({
        where: { id: rootId },
        select: { id: true, name: true, referrerId: true }
    })
    if (!rootUser) return null

    const rootSys = await prisma.system.findFirst({ where: { userId: rootId, onSystem: systemId } })
    if (!rootSys) return null
    const rootAutoId = rootSys.autoId

    // Lấy F1s trực tiếp (refSysId = userId của parent)
    const f1Data = await prisma.system.findMany({
        where: { 
            refSysId: rootId,
            onSystem: systemId,
            userId: { not: rootId }
        },
        include: { user: { select: { id: true, name: true } } }
    })

    console.log(`\n=== buildStandardTree(rootId=${rootId}, systemId=${systemId}) ===`)
    console.log('Root autoId:', rootAutoId)
    console.log('F1s found (refSysId = ' + rootId + '):', f1Data.length)
    for (const f1 of f1Data) {
        console.log('  - #' + f1.userId + ' ' + f1.user.name + ' (autoId=' + f1.autoId + ')')
    }
    
    if (f1Data.length === 0) return null

    const f1AutoIds = f1Data.map(f => f.autoId)

    // Lấy closures
    const allDescOfF1s = await prisma.systemClosure.findMany({
        where: { ancestorId: { in: f1AutoIds }, depth: { gte: 1 }, systemId },
        select: { descendantId: true }
    })
    const f2AutoIdsSet = new Set(allDescOfF1s.map((c: any) => c.descendantId))
    const f2AutoIds = [...f2AutoIdsSet]

    const allClosures = await prisma.systemClosure.findMany({
        where: {
            systemId,
            OR: [
                { ancestorId: { in: [rootAutoId, ...f1AutoIds, ...f2AutoIds] } },
                { descendantId: { in: f1AutoIds } }
            ],
            depth: { gte: 0 }
        },
        include: { descendant: { include: { user: { select: { id: true, name: true } } } } } }
    })

    const closureByAncestor = new Map<number, any[]>()
    for (const c of allClosures) {
        if (!closureByAncestor.has(c.ancestorId)) closureByAncestor.set(c.ancestorId, [])
        closureByAncestor.get(c.ancestorId)!.push({
            depth: c.depth,
            userId: c.descendant.user.id,
            name: c.descendant.user.name,
            autoId: c.descendantId
        })
    }

    // Build tree
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

    console.log('\nGroup A (không có F2):', groupA.length)
    console.log('Group B (có F2, không F3):', groupB.length)
    console.log('Group C (có F3):', groupC.length)

    console.log('\n=== GROUP A ===')
    for (const n of groupA) console.log('  #' + n.id + ' ' + n.name + ' (children=' + n.children.length + ')')

    console.log('\n=== GROUP B ===')
    for (const n of groupB) console.log('  #' + n.id + ' ' + n.name + ' (children=' + n.children.length + ')')

    console.log('\n=== GROUP C ===')
    for (const n of groupC) console.log('  #' + n.id + ' ' + n.name + ' (children=' + n.children.length + ')')

    return { groupA, groupB, groupC }
}

async function main() {
    // Test với root = #861 (TCA root)
    const result = await buildStandardTree(861, 1)

    // Tìm #862 và #863 trong kết quả
    console.log('\n\n=== TÌM KIẾM #862, #863, #876, #877 TRONG KẾT QUẢ ===')
    const all = [...(result?.groupA || []), ...(result?.groupB || []), ...(result?.groupC || [])]
    for (const n of all) {
        if ([862, 863, 876, 877].includes(n.id)) {
            console.log('TÌM THẤY #' + n.id + ' ' + n.name + ' trong group, children:', n.children.length)
            for (const c of n.children) {
                console.log('  - child: #' + c.id + ' ' + c.name)
            }
        }
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())