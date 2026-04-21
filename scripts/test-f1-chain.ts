import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('=== KIỂM TRA CHI TIẾT CHAIN #861 → #862 → #863 → #876 → #877 ===\n')

    // Lấy system records
    const users = [861, 862, 863, 876, 877]
    for (const uid of users) {
        const sys = await prisma.system.findFirst({ where: { userId: uid, onSystem: 1 } })
        console.log(`#${uid}: autoId=${sys?.autoId}, refSysId=${sys?.refSysId}`)
    }

    // Xem #862 có F1 nào trong system không (refSysId = 862)
    console.log('\n=== F1 CỦA #862 (refSysId=862) ===')
    const f1Of862 = await prisma.system.findMany({
        where: { refSysId: 862, onSystem: 1 }
    })
    console.log('F1s của #862:', f1Of862.length)
    for (const f of f1Of862) {
        const u = await prisma.user.findUnique({ where: { id: f.userId } })
        console.log(`  - #${f.userId} ${u?.name}`)
    }

    // Xem #863 có F1 nào trong system không (refSysId = 863)
    console.log('\n=== F1 CỦA #863 (refSysId=863) ===')
    const f1Of863 = await prisma.system.findMany({
        where: { refSysId: 863, onSystem: 1 }
    })
    console.log('F1s của #863:', f1Of863.length)
    for (const f of f1Of863) {
        const u = await prisma.user.findUnique({ where: { id: f.userId } })
        console.log(`  - #${f.userId} ${u?.name}`)
    }

    // Xem #876 có F1 nào trong system không (refSysId = 876)
    console.log('\n=== F1 CỦA #876 (refSysId=876) ===')
    const f1Of876 = await prisma.system.findMany({
        where: { refSysId: 876, onSystem: 1 }
    })
    console.log('F1s của #876:', f1Of876.length)
    for (const f of f1Of876) {
        const u = await prisma.user.findUnique({ where: { id: f.userId } })
        console.log(`  - #${f.userId} ${u?.name}`)
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())