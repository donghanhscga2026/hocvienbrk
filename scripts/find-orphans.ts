
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('--- PHÂN TÍCH NGƯỜI DÙNG MỒ CÔI ---')
    const allUsers = await prisma.user.findMany({
        select: { id: true, name: true, referrerId: true }
    })
    console.log(`Tổng số User: ${allUsers.length}`)

    const userMap = new Map<number, any>()
    for (const u of allUsers) userMap.set(u.id, u)

    const connectedToRoot = new Set<number>()
    
    function checkConnection(userId: number): boolean {
        if (userId === 0) return true
        if (connectedToRoot.has(userId)) return true
        
        let current = userMap.get(userId)
        const path = new Set<number>()
        
        while (current && current.referrerId !== null) {
            if (path.has(current.id)) break // Vòng lặp
            path.add(current.id)
            
            if (current.referrerId === 0 || connectedToRoot.has(current.referrerId)) {
                path.forEach(id => connectedToRoot.add(id))
                return true
            }
            current = userMap.get(current.referrerId)
        }
        return false
    }

    const orphans: any[] = []
    for (const u of allUsers) {
        if (!checkConnection(u.id)) {
            orphans.push(u)
        }
    }

    console.log(`Số lượng người mồ côi (không nối về Root ID 0): ${orphans.length}`)
    console.log('\nDanh sách 10 người mồ côi đầu tiên:')
    orphans.slice(0, 10).forEach(o => {
        console.log(`- ID: ${o.id}, Name: ${o.name}, ReferrerID: ${o.referrerId}`)
    })

    const noReferrer = orphans.filter(o => o.referrerId === null)
    console.log(`\nTrong đó có ${noReferrer.length} người không có ReferrerId (NULL).`)
}

main().finally(() => prisma.$disconnect())
