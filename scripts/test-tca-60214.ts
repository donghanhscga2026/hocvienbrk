import prisma from '../lib/prisma'

async function main() {
    const phone = '0849496886'
    const email = 'lequangle75@gmail.com'
    
    // 1. Kiểm tra user với phone 0849496886
    const phoneUsers = await prisma.user.findMany({
        where: { phone: { not: null }}
    })
    const phoneMatch = phoneUsers.filter(u => u.phone?.replace(/\D/g, '') === phone)
    console.log('Phone match:', phoneMatch.map(u => ({ id: u.id, name: u.name, phone: u.phone })))
    
    // 2. Kiểm tra user với email lequangle75@gmail.com
    const emailMatch = await prisma.user.findFirst({
        where: { email: { equals: email, mode: 'insensitive' }}
    })
    console.log('Email match:', emailMatch ? { id: emailMatch.id, name: emailMatch.name } : 'null')
    
    // 3. Kiểm tra TCAMember với tcaId 60214
    const tcaMember = await (prisma as any).tCAMember?.findUnique({ where: { tcaId: 60214 }})
    console.log('TCAMember 60214:', tcaMember)
    
    // 4. Kiểm tra reserved ID 874
    const reserved = await prisma.reservedId.findUnique({ where: { id: 874 }})
    console.log('Reserved 874:', reserved)
    
    // 5. Kiểm tra user ID 874 có tồn tại không
    const user874 = await prisma.user.findUnique({ where: { id: 874 }})
    console.log('User 874 tồn tại:', user874 ? 'YES' : 'NO')
    
    await prisma.$disconnect()
}

main()