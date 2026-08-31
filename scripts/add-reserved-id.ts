
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const args = process.argv.slice(2)
    if (args.length < 1) {
        console.error('Usage: npm run add-reserved <id> [note]')
        process.exit(1)
    }

    const id = parseInt(args[0])
    const note = args[1] || 'Reserved by Admin'

    if (isNaN(id)) {
        console.error('Error: ID must be a number')
        process.exit(1)
    }

    try {
        const existing = await prisma.reservedId.findUnique({ where: { id } })
        if (existing) {
            console.log(`⚠️  ID ${id} is already reserved: "${existing.note}"`)
            return
        }

        await prisma.reservedId.create({
            data: {
                id,
                note
            }
        })
        console.log(`✅ Successfully reserved ID ${id} (${note}). New users will skip this ID.`)

    } catch (error) {
        console.error('❌ Error:', error)
    } finally {
        await prisma.$disconnect()
    }
}

main()
