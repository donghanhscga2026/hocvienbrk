import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function check() {
    const user = await prisma.user.findUnique({
        where: { id: 0 },
        select: { id: true, image: true }
    })
    if (user) {
        console.log("User 0 Image Length:", user.image?.length || 0)
        if (user.image && user.image.length > 1000) {
            console.log("User 0 Image starts with:", user.image.substring(0, 50))
        } else {
            console.log("User 0 Image:", user.image)
        }
    } else {
        console.log("User 0 not found")
    }
}

check().catch(console.error).finally(() => prisma.$disconnect())
