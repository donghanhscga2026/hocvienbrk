import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Simulate chính xác buildStandardTree
async function build(rootId: number, systemId: number) {
    // Step 1: Get root user
    const rootUser = await prisma.user.findUnique({ where: { id: rootId } })
    console.log('Root user:', rootUser?.id, rootUser?.name)

    // Step 2: Get root system
    const rootSys = await prisma.system.findFirst({ where: { userId: rootId, onSystem: systemId } })
    console.log('Root system autoId:', rootSys?.autoId)

    // Step 3: Get F1s - refSysId = rootId
    const f1Data = await prisma.system.findMany({
        where: { refSysId: rootId, onSystem: systemId, userId: { not: rootId } },
    })
    console.log('\nF1s (refSysId=' + rootId + '):', f1Data.length)
    for (const f of f1Data) {
        const u = await prisma.user.findUnique({ where: { id: f.userId } })
        console.log('  - #' + f.userId + ' ' + u?.name + ' (autoId=' + f.autoId + ')')
    }

    // Step 4: Get closures cho F1s
    const f1AutoIds = f1Data.map(f => f.autoId)
    const allClosures = await prisma.systemClosure.findMany({
        where: { systemId, ancestorId: { in: f1AutoIds } }
    })
    console.log('\nTotal closures for F1s:', allClosures.length)

    // For each F1, show children
    for (const f1 of f1Data) {
        const f1Closures = allClosures.filter(c => c.ancestorId === f1.autoId)
        const children = f1Closures.filter(c => c.depth === 1)
        console.log('\nF1 #' + f1.userId + ' (#' + f1.refSysId + '): ' + children.length + ' children')
        for (const c of children) {
            const childSys = await prisma.system.findUnique({ where: { autoId: c.descendantId } })
            const childUser = childSys ? await prisma.user.findUnique({ where: { id: childSys.userId } }) : null
            console.log('  - depth=' + c.depth + ': autoId=' + c.descendantId + ' -> user #' + childSys?.userId + ' ' + childUser?.name)
        }
    }

    // Tìm cụ thể: #862 -> #863 -> #876 -> #877
    console.log('\n\n=== TRACE #862 ===')
    const f862 = f1Data.find(f => f.userId === 862)
    if (f862) {
        const f862Closures = allClosures.filter(c => c.ancestorId === f862.autoId)
        console.log('#862 có ' + f862Closures.length + ' closures:')
        for (const c of f862Closures) {
            const childSys = await prisma.system.findUnique({ where: { autoId: c.descendantId } })
            const childUser = childSys ? await prisma.user.findUnique({ where: { id: childSys.userId } }) : null
            console.log('  depth=' + c.depth + ': user #' + childSys?.userId + ' ' + childUser?.name)
        }
    }
}

async function main() {
    console.log('=== BUILD STANDARD TREE FOR TCA (rootId=861) ===')
    await build(861, 1)
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())