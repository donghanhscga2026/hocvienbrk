
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('--- KIỂM TRA USER_CLOSURES ---')
    const totalUserClosures = await prisma.userClosure.count()
    console.log(`Tổng số bản ghi UserClosure: ${totalUserClosures}`)

    const firstUser = await prisma.user.findFirst({ orderBy: { id: 'asc' } })
    if (firstUser) {
        const count = await prisma.userClosure.count({ where: { ancestorId: firstUser.id } })
        console.log(`Người dùng đầu tiên (ID: ${firstUser.id}, Name: ${firstUser.name}) có TS (tính cả chính mình): ${count}`)
    }

    console.log('\n--- KIỂM TRA SYSTEM_CLOSURES (TCA - ID 1) ---')
    const totalSystemClosures = await prisma.systemClosure.count({ where: { systemId: 1 } })
    console.log(`Tổng số bản ghi SystemClosure (TCA): ${totalSystemClosures}`)

    const rootSystem = await prisma.system.findFirst({ where: { onSystem: 1, refSysId: 0 } })
    if (rootSystem) {
        const count = await prisma.systemClosure.count({ where: { ancestorId: rootSystem.autoId, systemId: 1 } })
        console.log(`Root TCA (userId: ${rootSystem.userId}, autoId: ${rootSystem.autoId}) có TS (tính cả chính mình): ${count}`)
    }
}

main().finally(() => prisma.$disconnect())
