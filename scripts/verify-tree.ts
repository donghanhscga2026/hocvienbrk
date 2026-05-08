import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const rootId = 861
    const systemId = 1

    const rootUser = await prisma.user.findUnique({ where: { id: rootId } })
    const rootSys = await prisma.system.findFirst({ where: { userId: rootId, onSystem: systemId } })
    
    console.log('Root: user #' + rootId + ' = ' + rootUser?.name + ', autoId=' + rootSys?.autoId)

    // Get F1s (refSysId = rootId)
    const f1Data = await prisma.system.findMany({
        where: { refSysId: rootId, onSystem: systemId, userId: { not: rootId } },
        include: { user: { select: { id: true, name: true } } }
    })
    
    console.log('F1s of root: ' + f1Data.length)
    const f1AutoIds = f1Data.map(f => f.autoId)

    // Get closures
    const allDescOfF1s = await prisma.systemClosure.findMany({
        where: { ancestorId: { in: f1AutoIds }, depth: { gte: 1 }, systemId }
    })
    const f2AutoIds = [...new Set(allDescOfF1s.map(c => c.descendantId))]

    const allClosures = await prisma.systemClosure.findMany({
        where: {
            systemId,
            OR: [
                { ancestorId: { in: [rootSys!.autoId, ...f1AutoIds, ...f2AutoIds] } },
                { descendantId: { in: f1AutoIds } }
            ],
            depth: { gte: 0 }
        },
        include: { descendant: { include: { user: { select: { id: true, name: true } } } } }
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

    // Build groups
    let groupA: any[] = [], groupB: any[] = [], groupC: any[] = []
    for (const f1 of f1Data) {
        const closures = closureByAncestor.get(f1.autoId) || []
        const hasF2 = closures.some(c => c.depth === 1)
        const hasF3 = closures.some(c => c.depth === 2)
        const f2s = closures.filter(c => c.depth === 1).map(c => ({ id: c.userId, name: c.name }))
        const fData = { id: f1.user.id, name: f1.user.name, children: f2s }

        if (!hasF2) groupA.push(fData)
        else if (!hasF3) groupB.push(fData)
        else groupC.push(fData)
    }

    console.log('\nGroup A: ' + groupA.length)
    console.log('Group B: ' + groupB.length)
    console.log('Group C: ' + groupC.length)

    // Find #862, #863, #876, #877
    const all = [...groupA, ...groupB, ...groupC]
    console.log('\n=== TÌM #862, #863 ===')
    for (const n of all) {
        console.log('#' + n.id + ' ' + n.name + ' -> children: ' + n.children.map((c: any) => c.id).join(', '))
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())