import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function check() {
    console.log("Fetching root systems:")
    const roots = await prisma.system.findMany({
        where: { onSystem: 1, refSysId: 0 }
    })
    console.log(roots)
    
    console.log("Fetching F1s for root=0 (COACH CUONG) using Prisma:")
    const allF1s = await prisma.system.findMany({
        where: { refSysId: 0, onSystem: 1 },
        include: { user: { select: { id: true, name: true } } }
    })
    console.log("Without NOT condition (count):", allF1s.length)
    console.log(allF1s.map(f => f.user?.name).slice(0, 10))

    const filteredF1s = await prisma.system.findMany({
        where: { 
            refSysId: 0, 
            onSystem: 1,
            userId: { not: 0 } 
        },
        include: { user: { select: { id: true, name: true } } }
    })
    console.log("With NOT condition (count):", filteredF1s.length)
    console.log(filteredF1s.map(f => f.user?.name).slice(0, 10))
}

check().catch(console.error).finally(() => prisma.$disconnect())
