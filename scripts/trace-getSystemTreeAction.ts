import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    // Check if userId=0 exists in TCA
    const sys0 = await prisma.system.findFirst({ where: { userId: 0, onSystem: 1 } })
    console.log('User 0 in TCA (system 1):', sys0)

    // Check root of TCA
    const rootSys = await prisma.system.findFirst({ where: { onSystem: 1, refSysId: 0 } })
    console.log('TCA Root:', rootSys)

    // Trace getSystemTreeAction logic
    console.log('\n=== SIMULATE getSystemTreeAction(1) for admin id=0 ===')
    
    // Step 1: getUserSystemInfo(0)
    const systemInfo = await prisma.system.findFirst({ where: { userId: 0, onSystem: 1 } })
    console.log('systemInfo for userId=0:', systemInfo)

    // If systemInfo is null and isRootAdmin=true, getSystemRootUser
    if (!systemInfo) {
        const root = await prisma.system.findFirst({ where: { onSystem: 1, refSysId: 0 } })
        console.log('getSystemRootUser(1):', root ? { id: root.userId } : null)
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())