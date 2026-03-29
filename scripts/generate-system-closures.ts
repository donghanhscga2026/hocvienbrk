
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function generateClosures(systemId: number) {
    console.log(`🔗 Bắt đầu generate closures cho System #${systemId} (Iterative Mode)...`)
    
    const allSystems = await prisma.system.findMany({ where: { onSystem: systemId } })
    console.log(`📊 Có ${allSystems.length} records trong System`)

    const closureRecords: any[] = []
    const userToSystem = new Map<number, any>()
    for (const s of allSystems) userToSystem.set(s.userId, s)

    for (const s of allSystems) {
        // 1. Bản ghi cho chính mình (depth 0)
        closureRecords.push({ ancestorId: s.autoId, descendantId: s.autoId, depth: 0, systemId })

        // 2. Đi ngược lên trên (Ancestor)
        let currentParentUserId = s.refSysId
        let currentDepth = 1

        // Chạy vòng lặp cho đến khi không còn upline nào nữa
        while (true) {
            const parentSystem = userToSystem.get(currentParentUserId)
            if (!parentSystem) break

            closureRecords.push({
                ancestorId: parentSystem.autoId,
                descendantId: s.autoId,
                depth: currentDepth,
                systemId
            })

            // Nếu người này có upline là 0 (hoặc chính họ là 0), chúng ta cần kiểm tra tiếp
            if (currentParentUserId === 0) break // Đã tới root thực sự

            currentParentUserId = parentSystem.refSysId
            currentDepth++
            if (currentDepth > 500) break 
        }
    }

    console.log(`🗑️ Bulk Creating ${closureRecords.length} records...`)
    await prisma.$transaction([
        prisma.systemClosure.deleteMany({ where: { systemId } }),
        prisma.systemClosure.createMany({ data: closureRecords, skipDuplicates: true })
    ])

    console.log(`✅ Hoàn tất System #${systemId}! Đã tạo ${closureRecords.length} closures.`)
}

async function main() {
    try {
        await generateClosures(1) // TCA
        await generateClosures(2) // KTC
    } catch (error) {
        console.error('❌ Lỗi:', error)
    } finally {
        await prisma.$disconnect()
    }
}
main()
