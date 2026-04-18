import prisma from '../lib/prisma'

async function getNextAvailableId() {
    const reservedIds = await prisma.reservedId.findMany({ select: { id: true }})
    const reservedIdList = reservedIds.map((r: any) => r.id)
    
    const maxNormalUser = await prisma.user.findFirst({
        where: { id: { notIn: reservedIdList }},
        orderBy: { id: 'desc' },
        select: { id: true }
    })
    
    let nextId = (maxNormalUser?.id || 0) + 1
    
    while (true) {
        const isReserved = await prisma.reservedId.findUnique({ where: { id: nextId }})
        if (!isReserved) {
            const existingUser = await prisma.user.findUnique({ where: { id: nextId }})
            if (!existingUser) return nextId
        }
        nextId++
    }
}

async function main() {
    const maxUser = await prisma.user.findFirst({
        orderBy: { id: 'desc' },
        select: { id: true }
    })
    console.log('Max User ID:', maxUser?.id)
    
    const nextId = await getNextAvailableId()
    console.log('Next Available ID:', nextId)
    
    await prisma.$disconnect()
}

main()