
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function generateClosures(systemId: number) {
    console.log(`🔗 Bắt đầu tạo closures cho Hệ thống #${systemId}...`)
    
    const allSystems = await prisma.system.findMany({ where: { onSystem: systemId } })
    console.log(`📊 Tổng số bản ghi System: ${allSystems.length}`)

    const closureRecords: any[] = []
    const userToSystem = new Map<number, any>()
    for (const s of allSystems) userToSystem.set(s.userId, s)

    for (const s of allSystems) {
        // 1. Bản ghi cho chính mình (depth 0)
        closureRecords.push({ ancestorId: s.autoId, descendantId: s.autoId, depth: 0, systemId })

        // 2. Đi ngược lên trên tìm tổ tiên
        let currentParentUserId = s.refSysId
        let currentDepth = 1
        let visited = new Set<number>([s.userId]) // Chống vòng lặp vô hạn

        while (true) {
            // Nếu refSysId trỏ vào chính mình hoặc đã đi qua rồi thì dừng
            if (visited.has(currentParentUserId)) break
            
            const parentSystem = userToSystem.get(currentParentUserId)
            if (!parentSystem) break

            closureRecords.push({
                ancestorId: parentSystem.autoId,
                descendantId: s.autoId,
                depth: currentDepth,
                systemId
            })

            visited.add(currentParentUserId)
            
            // Nếu người này là Root (refSysId = userId), dừng lại
            if (parentSystem.refSysId === parentSystem.userId) break
            
            // Tiếp tục leo lên trên
            currentParentUserId = parentSystem.refSysId
            currentDepth++
            
            if (currentDepth > 100) break // Giới hạn an toàn
        }
    }

    console.log(`🗑️ Đang cập nhật ${closureRecords.length} quan hệ vào Database...`)
    await prisma.$transaction([
        prisma.systemClosure.deleteMany({ where: { systemId } }),
        prisma.systemClosure.createMany({ data: closureRecords, skipDuplicates: true })
    ])

    console.log(`✅ Hoàn tất Hệ thống #${systemId}! Đã tạo ${closureRecords.length} closures.`)
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
