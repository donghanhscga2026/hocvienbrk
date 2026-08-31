
import { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    const missingIds = [208, 228, 304, 641]
    const defaultHash = await bcrypt.hash('Brk@3773', 10)

    console.log('Filling missing IDs...')

    for (const id of missingIds) {
        try {
            const idSuffix = id.toString().padStart(3, '0')
            await prisma.user.create({
                data: {
                    id: id,
                    name: `Học viên ${id}`, // Tên placeholder
                    email: `noemail${id}@gmail.com`,
                    phone: `3773986${idSuffix}`,
                    password: defaultHash,
                    role: Role.STUDENT,
                    referrerId: null,
                    createdAt: new Date(), // Thời gian hiện tại
                }
            })
            console.log(`✅ Created placeholder user for ID: ${id}`)
        } catch (error) {
            console.error(`❌ Failed to create ID ${id}:`, error)
        }
    }

    // Reset sequence lần nữa cho chắc
    await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"User"', 'id'), coalesce(max(id)+1, 1), false) FROM "User";`)

    console.log('Done.')
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
