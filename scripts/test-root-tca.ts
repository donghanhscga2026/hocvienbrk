import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    // Kiểm tra root của TCA (refSysId = 0)
    const rootSystems = await prisma.system.findMany({
        where: { onSystem: 1, refSysId: 0 },
        include: { user: { select: { id: true, name: true } } }
    })
    console.log('TCA Root (refSysId=0):', rootSystems)

    // Kiểm tra root của cây - thường là refSysId = 0 hoặc không có ai là root
    // Nhưng TCAMember root có parentTcaId = null
    const tcaRoots = await prisma.tCAMember.findMany({ where: { parentTcaId: null } })
    console.log('\nTCAMembers có parentTcaId=null (TCA roots):', tcaRoots.length)
    for (const t of tcaRoots) {
        const sys = await prisma.system.findFirst({ where: { userId: t.userId, onSystem: 1 } })
        console.log(`  TCA ${t.tcaId}: userId=${t.userId}, name=${t.name}, parentTcaId=${t.parentTcaId}, system autoId=${sys?.autoId}, refSysId=${sys?.refSysId}`)
    }

    // Xem #861 trong system table
    const sys861 = await prisma.system.findFirst({ where: { userId: 861, onSystem: 1 } })
    console.log('\n#861 trong system:', sys861)

    // Xem closure của root TCA
    if (sys861) {
        const rootClosures = await prisma.systemClosure.findMany({
            where: { descendantId: sys861.autoId, systemId: 1 },
            orderBy: { depth: 'asc' }
        })
        console.log('\nClosures của #861 (autoId', sys861.autoId, '):')
        for (const c of rootClosures) {
            console.log(`  depth=${c.depth}: ancestor=${c.ancestorId}`)
        }
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())