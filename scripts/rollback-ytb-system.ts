import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🚨 Bắt đầu rollback Hệ thống YTB (onSystem=3)...')
    const SYSTEM_ID = 3

    // 1. Đếm số lượng bản ghi sẽ xóa
    const closureCount = await prisma.systemClosure.count({ where: { systemId: SYSTEM_ID } })
    const systemCount = await prisma.system.count({ where: { onSystem: SYSTEM_ID } })
    const treeCount = await prisma.systemTree.count({ where: { onSystem: SYSTEM_ID } })

    if (closureCount === 0 && systemCount === 0) {
        console.log('ℹ️ Không có dữ liệu YTB nào để rollback.')
        return
    }

    console.log(`📊 Sẽ xóa:`)
    console.log(`   - ${closureCount} SystemClosure records`)
    console.log(`   - ${systemCount} System records`)
    console.log(`ℹ️ Giữ lại SystemTree (onSystem=3: YTB) — không xóa`)

    // 2. Xóa theo thứ tự: SystemClosure → System (giữ SystemTree)
    console.log('🗑️ Đang xóa...')

    if (closureCount > 0) {
        await prisma.systemClosure.deleteMany({ where: { systemId: SYSTEM_ID } })
        console.log(`   ✅ Đã xóa ${closureCount} SystemClosure`)
    }

    if (systemCount > 0) {
        await prisma.system.deleteMany({ where: { onSystem: SYSTEM_ID } })
        console.log(`   ✅ Đã xóa ${systemCount} System`)
    }

    console.log('🎉 Rollback Hệ thống YTB hoàn tất!')
}

main()
    .catch((e) => {
        console.error('❌ Lỗi:', e)
        process.exit(1)
    })
    .finally(() => prisma.$disconnect())
