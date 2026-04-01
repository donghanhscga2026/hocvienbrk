import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkResults() {
    console.log('📊 KIỂM TRA KẾT QUẢ BACKFILL\n')
    
    const totalPoints = await prisma.registrationPoint.count()
    const totalWallets = await prisma.affiliateWallet.count()
    const walletsWithPoints = await prisma.affiliateWallet.count({
        where: { points: { gt: 0 } }
    })
    
    console.log('📈 Tổng quan:')
    console.log(`   Registration Points: ${totalPoints}`)
    console.log(`   Wallets: ${totalWallets}`)
    console.log(`   Wallets có điểm: ${walletsWithPoints}`)
    
    const topReferrers = await prisma.$queryRaw`
        SELECT "referrerId", COUNT(*) as count, SUM(points) as total
        FROM "RegistrationPoint"
        GROUP BY "referrerId"
        ORDER BY count DESC
        LIMIT 10
    `
    
    console.log('\n🏆 Top 10 Referrers:')
    for (const r of topReferrers as any[]) {
        console.log(`   #${r.referrerId}: ${r.count} referrals, ${r.total} points`)
    }
    
    await prisma.$disconnect()
}

checkResults()
    .then(() => process.exit(0))
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
