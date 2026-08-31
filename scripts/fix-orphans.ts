
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('--- CẬP NHẬT NGƯỜI DÙNG MỒ CÔI ---')
    
    // Tìm và cập nhật tất cả user có referrerId là null (ngoại trừ root 0)
    const result = await prisma.user.updateMany({
        where: {
            referrerId: null,
            id: { not: 0 }
        },
        data: {
            referrerId: 0
        }
    })

    console.log(`✅ Đã cập nhật thành công ${result.count} người dùng về Root (ID 0).`)
}

main()
    .catch(e => console.error('❌ Lỗi:', e))
    .finally(() => prisma.$disconnect())
