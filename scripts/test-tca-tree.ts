import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Copy logic từ getSystemRootUser
async function getSystemRootUser(systemId: number) {
    const rootSystem = await prisma.system.findFirst({
        where: { onSystem: systemId, refSysId: 0 }
    })
    if (!rootSystem) return null
    const user = await prisma.user.findUnique({
        where: { id: rootSystem.userId },
        select: { id: true, name: true }
    })
    return user
}

// Copy logic từ buildStandardTree
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
            refSysId: rootId,  // Tìm theo userId của parent
            onSystem: systemId,
            userId: { not: rootId }
        },
        include: { user: { select: { id: true, name: true } } }
    })

    console.log(`\n=== ROOT #${rootId} (${rootUser.name}) ===`)
    console.log(`F1s trực tiếp (refSysId = ${rootId}):`, f1Data.length)
    for (const f1 of f1Data) {
        console.log(`  - #${f1.userId} ${f1.user.name} (autoId=${f1.autoId}, refSysId=${f1.refSysId})`)
    }

    if (f1Data.length === 0) {
        return { id: rootUser.id, name: rootUser.name, children: [] }
    }

    const f1AutoIds = f1Data.map(f => f.autoId)

    // Lấy closures để tìm F2
    const allDescOfF1s = await prisma.systemClosure.findMany({
        where: { ancestorId: { in: f1AutoIds }, depth: { gte: 1 }, systemId },
        select: { descendantId: true }
    })
    const f2AutoIds = [...new Set(allDescOfF1s.map(c => c.descendantId))]

    const allClosures = await prisma.systemClosure.findMany({
        where: {
            systemId,
            OR: [
                { ancestorId: { in: [rootAutoId, ...f1AutoIds, ...f2AutoIds] } },
                { descendantId: { in: f1AutoIds } }
            ],
            depth: { gte: 0 }
        },
        include: { descendant: { include: { user: { select: { id: true, name: true } } } } }
    })

    // Build map
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

    // Build tree với F1s và F2s
    const f1Tree: any[] = []
    for (const f1 of f1Data) {
        const f1Closures = closureByAncestor.get(f1.autoId) || []
        const f2s = f1Closures.filter(c => c.depth === 1)
        
        console.log(`\n--- F1 #${f1.userId} ${f1.user.name} ---`)
        console.log(`  F2s (depth=1):`, f2s.length)
        for (const f2 of f2s) {
            console.log(`    - #${f2.userId} ${f2.name}`)
        }

        f1Tree.push({
            id: f1.userId,
            name: f1.user.name,
            autoId: f1.autoId,
            f2s: f2s
        })
    }

    return {
        root: { id: rootUser.id, name: rootUser.name },
        f1s: f1Tree
    }
}

async function main() {
    console.log('=== TEST GET SYSTEM TREE TCA (systemId=1) ===')

    // Tìm root của TCA (systemId=1)
    const root = await getSystemRootUser(1)
    console.log('TCA Root:', root)

    if (root) {
        // Build cây từ root
        const tree = await buildStandardTree(root.id, 1)
        
        // Tìm nhánh #863
        console.log('\n\n=== TÌM NHÁNH #863 ===')
        for (const f1 of tree.f1s) {
            if (f1.id === 863) {
                console.log('TÌM THẤY #863!')
                console.log('  F2s:', f1.f2s)
                for (const f2 of f1.f2s) {
                    if (f2.userId === 876) {
                        console.log('  TÌM THẤY #876!')
                    }
                    if (f2.userId === 877) {
                        console.log('  TÌM THẤY #877!')
                    }
                }
            }
            // Tìm xem #876 là F2 của ai
            for (const f2 of f1.f2s) {
                if (f2.userId === 876 || f2.userId === 877) {
                    console.log(`\n  #${f2.userId} ${f2.name} là F2 của #${f1.id} ${f1.name}`)
                }
            }
        }
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
