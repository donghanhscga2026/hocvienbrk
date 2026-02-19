
import { PrismaClient, Role } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const args = process.argv.slice(2)
    const email = args[0] || 'cuongchupanh001@gmail.com' // Email mặc định hoặc lấy từ tham số dòng lệnh

    console.log(`Checking email: ${email}...`)

    try {
        const user = await prisma.user.findUnique({ where: { email } })

        if (!user) {
            console.error(`❌ User with email '${email}' not found.`)
            return
        }

        const updatedUser = await prisma.user.update({
            where: { email },
            data: { role: Role.ADMIN },
        })
        console.log(`✅ Success! Updated user ${updatedUser.email} (ID: ${updatedUser.id}) to ADMIN role.`)
    } catch (e) {
        console.error('Error updating user:', e)
    } finally {
        await prisma.$disconnect()
    }
}

main()
