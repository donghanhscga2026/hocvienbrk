
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('--- FETCHING SYSTEM DATA (TCA - onSystem: 1) ---')
    const systems = await prisma.system.findMany({
        where: { onSystem: 1, refSysId: { gt: 0 } },
        take: 3,
        orderBy: { autoId: 'asc' }
    })

    console.log(JSON.stringify(systems, null, 2))
    
    if (systems.length > 0) {
        const firstSystem = systems[0]
        console.log('\n--- ANALYZING HIERARCHY FOR FIRST RECORD ---')
        console.log(`User ID: ${firstSystem.userId} (autoId: ${firstSystem.autoId})`)
        console.log(`Upline User ID (refSysId): ${firstSystem.refSysId}`)
        
        if (firstSystem.refSysId > 0) {
            const upline = await prisma.system.findFirst({
                where: { userId: firstSystem.refSysId, onSystem: 1 }
            })
            if (upline) {
                console.log(`Found Upline: autoId: ${upline.autoId} (userId: ${upline.userId})`)
            } else {
                console.log('Upline record not found in System table (might be root or data mismatch).')
            }
        } else {
            console.log('This is a Root record (refSysId: 0).')
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect())
