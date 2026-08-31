
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('--- PHÂN TÍCH CHUYÊN SÂU KẾT NỐI HỆ THỐNG ---')
    const allUsers = await prisma.user.findMany({
        select: { id: true, name: true, referrerId: true }
    })
    const totalUsers = allUsers.length
    console.log(`Tổng số User trong bảng: ${totalUsers}`)

    const userMap = new Map<number, any>()
    for (const u of allUsers) userMap.set(u.id, u)

    const reachableFromRoot = new Set<number>()
    reachableFromRoot.add(0)

    // Thuật toán tìm tất cả người có thể nối về Root 0
    let changed = true
    while (changed) {
        changed = false
        for (const u of allUsers) {
            if (!reachableFromRoot.has(u.id) && u.referrerId !== null && reachableFromRoot.has(u.referrerId)) {
                reachableFromRoot.add(u.id)
                changed = true
            }
        }
    }

    const closureCount = await prisma.userClosure.count({ where: { ancestorId: 0 } })
    console.log(`Bảng UserClosure ghi nhận TS cho Root 0 là: ${closureCount}`)
    
    if (closureCount !== reachableFromRoot.size) {
        console.log(`‼️ CẢNH BÁO: Dữ liệu bảng user_closure (${closureCount}) KHÔNG KHỚP với thực tế tính toán (${reachableFromRoot.size})!`)
    }
    
    const disconnected = allUsers.filter(u => !reachableFromRoot.has(u.id))
    console.log(`Số người ĐANG BỊ ĐỨT ĐOẠN: ${disconnected.length}`)

    if (disconnected.length > 0) {
        console.log('\n--- PHÂN TÍCH NHÁNH ĐỨT ĐOẠN ---')
        // Tìm những người là "Gốc" của các nhánh đứt đoạn (referrerId không tồn tại hoặc nối vòng quanh)
        const disconnectedRoots = disconnected.filter(u => {
            return u.referrerId === null || !userMap.has(u.referrerId)
        })

        console.log(`Tìm thấy ${disconnectedRoots.length} 'gốc phụ' đang gây đứt đoạn:`)
        disconnectedRoots.forEach(r => {
            console.log(`- Gốc phụ ID: ${r.id}, Name: ${r.name}, ReferrerID: ${r.referrerId} (đang chỉ vào hư không hoặc NULL)`)
        })

        // Kiểm tra vòng lặp trong nhóm đứt đoạn
        console.log('\nKiểm tra vòng lặp (Circular References):')
        const visited = new Set<number>()
        for (const u of disconnected) {
            if (visited.has(u.id)) continue
            let current: any = u
            const path = []
            const localVisited = new Set()
            while (current && current.referrerId !== null && !reachableFromRoot.has(current.referrerId)) {
                if (localVisited.has(current.id)) {
                    console.log(`‼️ PHÁT HIỆN VÒNG LẶP: ${path.join(' -> ')} -> ${current.id}`)
                    break
                }
                localVisited.add(current.id)
                visited.add(current.id)
                path.push(current.id)
                current = userMap.get(current.referrerId)
            }
        }
    }
}

main().finally(() => prisma.$disconnect())
