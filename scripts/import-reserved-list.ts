
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const reservedList = [
    8286,
    8386,
    8668,
    8686,
    3773,
    2689,
    9139,
    1102,
    1568,
    9319
]

async function main() {
    console.log(`Start importing ${reservedList.length} reserved IDs...`)
    let count = 0

    for (const id of reservedList) {
        try {
            const existing = await prisma.reservedId.findUnique({ where: { id } })
            if (existing) {
                console.log(`- ID ${id}: Already reserved`)
            } else {
                await prisma.reservedId.create({
                    data: {
                        id,
                        note: 'VIP List (Batch Import)'
                    }
                })
                console.log(`+ ID ${id}: Success`)
                count++
            }
        } catch (error) {
            console.error(`x ID ${id}: Failed`, error)
        }
    }

    console.log(`\nImport completed! Added ${count} new reserved IDs.`)
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
