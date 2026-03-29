
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('--- BUILDING TREE FOR UserID: 0 (System 1) ---')
    
    // Lấy tất cả records của System 1
    const allSystems = await prisma.system.findMany({
        where: { onSystem: 1 }
    })

    // Tạo Map để truy xuất nhanh
    const userMap = new Map()
    allSystems.forEach(s => {
        userMap.set(s.userId, { ...s, children: [] })
    })

    // Xây dựng cấu trúc cây
    let root = null
    allSystems.forEach(s => {
        const currentUser = userMap.get(s.userId)
        if (s.userId === 0) {
            root = currentUser
        } else {
            const parent = userMap.get(s.refSysId)
            if (parent) {
                parent.children.push(currentUser)
            }
        }
    })

    // Hàm in cây (đệ quy)
    function printTree(node: any, level: number = 0) {
        const indent = '  '.repeat(level)
        console.log(`${indent}└─ UserID: ${node.userId} (autoId: ${node.autoId})`)
        node.children.forEach((child: any) => printTree(child, level + 1))
    }

    if (root) {
        printTree(root)
    } else {
        console.log('Root UserID: 0 not found.')
    }
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect())
