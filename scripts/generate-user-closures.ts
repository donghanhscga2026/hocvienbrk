
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🔗 BẮT ĐẦU ĐỒNG BỘ USER_CLOSURES (BFS Mode)...')
    
    // 1. Lấy toàn bộ User
    const allUsers = await prisma.user.findMany({
        select: { id: true, referrerId: true }
    })
    console.log(`📊 Tổng số User: ${allUsers.length}`)

    // 2. Xây dựng cây trong bộ nhớ
    const childrenMap = new Map<number, number[]>()
    for (const u of allUsers) {
        if (u.referrerId !== null) {
            if (!childrenMap.has(u.referrerId)) childrenMap.set(u.referrerId, [])
            childrenMap.get(u.referrerId)!.push(u.id)
        }
    }

    const closureRecords: any[] = []

    // 3. BFS từ Root ID 0
    // queue lưu { id, ancestors: [{id, depth}] }
    const queue: { id: number, ancestors: { id: number, depth: number }[] }[] = []
    
    // Tìm các Root (không có referrerId hoặc referrerId không tồn tại - ở đây ta ưu tiên ID 0)
    const roots = allUsers.filter(u => u.id === 0 || u.referrerId === null || !allUsers.some(parent => parent.id === u.referrerId))
    
    for (const root of roots) {
        queue.push({ id: root.id, ancestors: [] })
    }

    while (queue.length > 0) {
        const { id, ancestors } = queue.shift()!

        // A. Bản ghi chính mình (depth 0)
        closureRecords.push({ ancestorId: id, descendantId: id, depth: 0 })

        // B. Bản ghi cho tất cả tổ tiên
        for (const anc of ancestors) {
            closureRecords.push({ ancestorId: anc.id, descendantId: id, depth: anc.depth + 1 })
        }

        // C. Thêm con vào queue
        const children = childrenMap.get(id) || []
        const currentAncestors = ancestors.map(a => ({ id: a.id, depth: a.depth + 1 }))
        currentAncestors.push({ id: id, depth: 0 })

        for (const childId of children) {
            queue.push({ id: childId, ancestors: currentAncestors })
        }
    }

    console.log(`🗑️ Đang xóa và tạo mới ${closureRecords.length} bản ghi closure...`)
    
    // Chia nhỏ dữ liệu để Bulk Create (Tránh lỗi giới hạn tham số của Postgres)
    const chunkSize = 5000
    await prisma.userClosure.deleteMany({})
    
    for (let i = 0; i < closureRecords.length; i += chunkSize) {
        const chunk = closureRecords.slice(i, i + chunkSize)
        await prisma.userClosure.createMany({ data: chunk, skipDuplicates: true })
        console.log(`   -> Đã đẩy ${i + chunk.length}/${closureRecords.length} bản ghi...`)
    }

    console.log('✅ HOÀN TẤT ĐỒNG BỘ!')
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect())
