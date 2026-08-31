
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const args = process.argv.slice(2)
    if (args.length !== 2) {
        console.error('Usage: npm run change-id <current_id> <new_id>')
        process.exit(1)
    }

    const currentId = parseInt(args[0])
    const newId = parseInt(args[1])

    if (isNaN(currentId) || isNaN(newId)) {
        console.error('Error: IDs must be numbers')
        process.exit(1)
    }

    console.log(`🔄 Attempting to change User ID from ${currentId} to ${newId}...`)

    try {
        // 1. Kiểm tra User cũ có tồn tại không
        const user = await prisma.user.findUnique({ where: { id: currentId } })
        if (!user) {
            console.error(`❌ User with ID ${currentId} not found.`)
            process.exit(1)
        }

        // 2. Kiểm tra User mới có bị trùng không
        const existingNewUser = await prisma.user.findUnique({ where: { id: newId } })
        if (existingNewUser) {
            console.error(`❌ Target ID ${newId} is already taken by user: ${existingNewUser.name} (${existingNewUser.email})`)
            process.exit(1)
        }

        // 3. Kiểm tra xem ID mới có phải Reserved ID không (Để thông báo thôi, Admin thì quyền lực tối cao)
        const reserved = await prisma.reservedId.findUnique({ where: { id: newId } })
        if (reserved) {
            console.log(`💎 Target ID ${newId} is a RESERVED ID ("${reserved.note}"). allowing change because you are Admin.`)
        }

        // 4. Thực hiện đổi ID
        // Vì ta đã set ON UPDATE CASCADE trong Schema, nên chỉ cần update User là xong.
        // Tuy nhiên, Prisma Client không cho update Primary Key trực tiếp trong phương thức update().
        // Ta phải dùng executeRaw hoặc delete/create (rủi ro mất data).
        // Tốt nhất là dùng executeRaw để tận dụng tính năng CASCADE của SQL.

        console.log('⚡ Updating ID in database...')

        // Cập nhật bảng User (Các bảng con Account, Session, User(referrer) sẽ tự động nhảy theo đv Postgres Cascade)
        const result = await prisma.$executeRawUnsafe(`UPDATE "User" SET id = ${newId} WHERE id = ${currentId}`)

        if (result > 0) {
            console.log(`✅ Success! User ${user.email} now has ID: ${newId}`)
        } else {
            console.error('❌ Failed to update ID. No rows affected.')
        }

        // 5. Reset Sequence (Quan trọng để các user sau không bị lỗi)
        console.log('🔄 Resetting Sequence...')
        await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"User"', 'id'), coalesce(max(id)+1, 1), false) FROM "User";`)

    } catch (error) {
        console.error('❌ Error:', error)
    } finally {
        await prisma.$disconnect()
    }
}

main()
