const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function check() {
    try {
        const user = await prisma.user.findUnique({
            where: { id: 0 },
            select: { id: true, image: true }
        })
        if (user) {
            console.log("User 0 Image Length:", user.image ? user.image.length : 0)
            if (user.image && user.image.length > 500) {
                console.log("User 0 Image starts with:", user.image.substring(0, 50))
            } else {
                console.log("User 0 Image:", user.image)
            }
        } else {
            console.log("User 0 not found")
        }
    } catch (err) {
        console.error(err)
    } finally {
        await prisma.$disconnect()
    }
}

check()
