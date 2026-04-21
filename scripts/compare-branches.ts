import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    // Nhánh 1: #861 -> #327 -> #3773 -> #866
    console.log('=== NHÁNH 1: #861 -> #327 -> #3773 -> #866 ===')
    const sys327 = await prisma.system.findFirst({ where: { userId: 327, onSystem: 1 } })
    const sys3773 = await prisma.system.findFirst({ where: { userId: 3773, onSystem: 1 } })
    const sys866 = await prisma.system.findFirst({ where: { userId: 866, onSystem: 1 } })
    
    console.log('#327: autoId=' + sys327?.autoId + ', refSysId=' + sys327?.refSysId)
    console.log('#3773: autoId=' + sys3773?.autoId + ', refSysId=' + sys3773?.refSysId)  
    console.log('#866: autoId=' + sys866?.autoId + ', refSysId=' + sys866?.refSysId)

    // Xem closures của #3773
    if (sys3773) {
        const clos = await prisma.systemClosure.findMany({ where: { descendantId: sys3773.autoId, systemId: 1 }, orderBy: { depth: 'asc' } })
        console.log('Closures của #3773:')
        for (const c of clos) {
            const anc = await prisma.system.findUnique({ where: { autoId: c.ancestorId } })
            console.log('  depth=' + c.depth + ': anc autoId=' + c.ancestorId + ' -> userId=' + anc?.userId)
        }
    }

    // Nhánh 2: #861 -> #862 -> #863 -> #876 -> #877
    console.log('\n=== NHÁNH 2: #861 -> #862 -> #863 -> #876 -> #877 ===')
    const sys862 = await prisma.system.findFirst({ where: { userId: 862, onSystem: 1 } })
    const sys863 = await prisma.system.findFirst({ where: { userId: 863, onSystem: 1 } })
    const sys876 = await prisma.system.findFirst({ where: { userId: 876, onSystem: 1 } })
    const sys877 = await prisma.system.findFirst({ where: { userId: 877, onSystem: 1 } })
    
    console.log('#862: autoId=' + sys862?.autoId + ', refSysId=' + sys862?.refSysId)
    console.log('#863: autoId=' + sys863?.autoId + ', refSysId=' + sys863?.refSysId)
    console.log('#876: autoId=' + sys876?.autoId + ', refSysId=' + sys876?.refSysId)
    console.log('#877: autoId=' + sys877?.autoId + ', refSysId=' + sys877?.refSysId)

    // Xem closures của #863
    if (sys863) {
        const clos = await prisma.systemClosure.findMany({ where: { descendantId: sys863.autoId, systemId: 1 }, orderBy: { depth: 'asc' } })
        console.log('Closures của #863:')
        for (const c of clos) {
            const anc = await prisma.system.findUnique({ where: { autoId: c.ancestorId } })
            console.log('  depth=' + c.depth + ': anc autoId=' + c.ancestorId + ' -> userId=' + anc?.userId)
        }
    }

    // Xem closures của #876
    console.log('\n=== Closures của #876 ===')
    if (sys876) {
        const clos876 = await prisma.systemClosure.findMany({ where: { descendantId: sys876.autoId, systemId: 1 }, orderBy: { depth: 'asc' } })
        console.log('Closures của #876:', clos876.length)
        for (const c of clos876) {
            const anc = await prisma.system.findUnique({ where: { autoId: c.ancestorId } })
            console.log('  depth=' + c.depth + ': anc autoId=' + c.ancestorId + ' -> userId=' + anc?.userId)
        }
    }

    // Xem closures của #877
    console.log('\n=== Closures của #877 ===')
    if (sys877) {
        const clos877 = await prisma.systemClosure.findMany({ where: { descendantId: sys877.autoId, systemId: 1 }, orderBy: { depth: 'asc' } })
        console.log('Closures của #877:', clos877.length)
        for (const c of clos877) {
            const anc = await prisma.system.findUnique({ where: { autoId: c.ancestorId } })
            console.log('  depth=' + c.depth + ': anc autoId=' + c.ancestorId + ' -> userId=' + anc?.userId)
        }
    }

    // Xem F1 của #327 (bằng system refSysId)
    console.log('\n=== F1 (system refSysId) CỦA #327 ===')
    const f1of327 = await prisma.system.findMany({ where: { refSysId: 327, onSystem: 1 } })
    console.log('F1 của #327:', f1of327.length)
    for (const f of f1of327) {
        const u = await prisma.user.findUnique({ where: { id: f.userId } })
        console.log('  #' + f.userId + ' ' + u?.name)
    }

    // Xem F1 của #862 (bằng system refSysId)
    console.log('\n=== F1 (system refSysId) CỦA #862 ===')
    const f1of862 = await prisma.system.findMany({ where: { refSysId: 862, onSystem: 1 } })
    console.log('F1 của #862:', f1of862.length)
    for (const f of f1of862) {
        const u = await prisma.user.findUnique({ where: { id: f.userId } })
        console.log('  #' + f.userId + ' ' + u?.name)
    }

    // So sánh: root (#861) có F1 nào
    console.log('\n=== F1 (system refSysId) CỦA #861 (root) ===')
    const f1of861 = await prisma.system.findMany({ where: { refSysId: 861, onSystem: 1 } })
    console.log('F1 của #861:', f1of861.length)
    for (const f of f1of861) {
        const u = await prisma.user.findUnique({ where: { id: f.userId } })
        console.log('  #' + f.userId + ' ' + u?.name + ' (autoId=' + f.autoId + ')')
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())