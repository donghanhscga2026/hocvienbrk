import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    // Lấy autoId của 876 và 877
    const sys876 = await prisma.system.findFirst({ where: { userId: 876, onSystem: 1 } })
    const sys877 = await prisma.system.findFirst({ where: { userId: 877, onSystem: 1 } })
    
    console.log('#876 autoId =', sys876?.autoId)
    console.log('#877 autoId =', sys877?.autoId)

    // Closures của #876
    console.log('\n=== Closures của #876 (autoId', sys876?.autoId, ') ===')
    const clos876 = await prisma.systemClosure.findMany({
        where: { descendantId: sys876?.autoId, systemId: 1 },
        orderBy: { depth: 'asc' }
    })
    for (const c of clos876) {
        const anc = await prisma.system.findUnique({ where: { autoId: c.ancestorId } })
        const ancUser = anc ? await prisma.user.findUnique({ where: { id: anc.userId } }) : null
        console.log(`  depth=${c.depth}: ancestor autoId=${c.ancestorId} -> user #${anc?.userId} ${ancUser?.name || ''}`)
    }

    // Closures của #877
    console.log('\n=== Closures của #877 (autoId', sys877?.autoId, ') ===')
    const clos877 = await prisma.systemClosure.findMany({
        where: { descendantId: sys877?.autoId, systemId: 1 },
        orderBy: { depth: 'asc' }
    })
    for (const c of clos877) {
        const anc = await prisma.system.findUnique({ where: { autoId: c.ancestorId } })
        const ancUser = anc ? await prisma.user.findUnique({ where: { id: anc.userId } }) : null
        console.log(`  depth=${c.depth}: ancestor autoId=${c.ancestorId} -> user #${anc?.userId} ${ancUser?.name || ''}`)
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())