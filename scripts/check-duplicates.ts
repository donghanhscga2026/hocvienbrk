
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('--- KIỂM TRA DỮ LIỆU SYSTEM ---')
    const systems = await prisma.system.findMany({ where: { onSystem: 1 } })
    console.log(`📊 Tổng số bản ghi: ${systems.length}`)

    const tree = new Map<number, number>()
    systems.forEach(s => tree.set(s.userId, s.refSysId))

    const loops: any[] = []
    for (const s of systems) {
        let current = s.userId
        const path = new Set<number>()
        let isLoop = false
        
        while (current !== 0) {
            if (path.has(current)) {
                isLoop = true
                loops.push(Array.from(path).concat(current))
                break
            }
            path.add(current)
            const next = tree.get(current)
            if (next === undefined) break
            current = next
        }
    }

    if (loops.length > 0) {
        console.log('❌ PHÁT HIỆN VÒNG LẶP DỮ LIỆU:')
        loops.forEach(l => console.log(`   -> ${l.join(' -> ')}`))
    } else {
        console.log('✅ Không có vòng lặp dữ liệu.')
    }
}

main().finally(() => prisma.$disconnect())
