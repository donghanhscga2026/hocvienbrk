import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkUser7() {
    console.log('=== KIỂM TRA USER #7 ===\n')

    // 1. Check closure table
    const closures = await prisma.userClosure.findMany({
        where: { descendantId: 7 },
        include: { ancestor: { select: { id: true, name: true } } },
        orderBy: { depth: 'asc' }
    })

    console.log('1. Closure Table (Ancestors của #7):')
    console.log('   Count:', closures.length)
    for (const c of closures) {
        console.log(`   F${c.depth}: #${c.ancestor.id} - ${c.ancestor.name || 'N/A'}`)
    }

    // 2. Check direct referrals (referrerId = 7)
    const directReferrals = await prisma.user.findMany({
        where: { referrerId: 7 },
        select: { id: true, name: true, emailVerified: true }
    })

    console.log('\n2. Direct Referrals (referrerId = 7):')
    console.log('   Count:', directReferrals.length)
    directReferrals.forEach(u => {
        console.log(`   #${u.id} - ${u.name || 'N/A'} | Email Verified: ${!!u.emailVerified}`)
    })

    // 3. Check registration points cho #7
    const points = await prisma.registrationPoint.findMany({
        where: { referrerId: 7 }
    })

    console.log('\n3. Registration Points cho #7:')
    console.log('   Count:', points.length)

    // 4. Check tất cả descendants trong closure
    const allDescendants = await prisma.userClosure.findMany({
        where: { ancestorId: 7 },
        include: { descendant: { select: { id: true, name: true } } },
        orderBy: { depth: 'asc' }
    })

    console.log('\n4. Tất cả Descendants của #7 (trong closure):')
    console.log('   Count:', allDescendants.length)
    
    const byDepth = new Map<number, typeof allDescendants>()
    for (const d of allDescendants) {
        const existing = byDepth.get(d.depth) || []
        existing.push(d)
        byDepth.set(d.depth, existing)
    }
    
    for (const [depth, items] of byDepth) {
        console.log(`   F${depth}: ${items.length} users`)
    }

    // 5. Kiểm tra closure rows có bị thiếu không
    console.log('\n5. So sánh:')
    console.log('   Closure descendants:', allDescendants.length)
    console.log('   Direct referrals:', directReferrals.length)
    console.log('   Registration points:', points.length)

    await prisma.$disconnect()
}

checkUser7()
    .then(() => process.exit(0))
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
