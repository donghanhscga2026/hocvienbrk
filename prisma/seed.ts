import { PrismaClient, Role } from '@prisma/client'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })
dotenv.config()

const options: any = {
    datasourceUrl: process.env.DATABASE_URL
}

const prisma = new PrismaClient(options)

async function main() {
    console.log('Starting seed...')
    try {
        const admin = await prisma.user.upsert({
            where: { id: 0 },
            update: {},
            create: {
                id: 0,
                email: 'admin@brk.com',
                name: 'BRK Admin',
                role: Role.ADMIN,
                phone: '0909000000', // Example phone
                // password: admin123
                password: '$2b$10$EpRnTzVlqHNP0.fMdQbL.e/KA/1h.q9s525aw.z8M.CI6k.v1Giv2',
            },
        })
        console.log('Seed successful:', { admin })
    } catch (error) {
        console.error('Seed failed:', error)
        throw error
    }
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
