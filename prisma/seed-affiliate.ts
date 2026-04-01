import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL
})

async function main() {
    console.log('Starting Affiliate seed...')
    
    try {
        // Tạo campaign mặc định
        const campaign = await prisma.affiliateCampaign.upsert({
            where: { slug: 'default' },
            update: {},
            create: {
                name: 'Chương trình Affiliate mặc định',
                slug: 'default',
                description: 'Chương trình affiliate mặc định cho Học Viện BRK',
                isActive: true,
                maxLevels: 3,
                pendingDays: 30,
                minPayout: 200000,
                taxRate: 0,
                feeAmount: 3300,
                pointsPerRegistration: 1.0,
                pointsRequired: 10.0,
                pointRedemptionValue: 386868,
                autoRedeem: false,
            },
        })
        console.log('Campaign created:', campaign.name)

        // Tạo cấu hình tầng hoa hồng
        const levels = [
            { level: 1, percentage: 10, minOrder: null },  // F1: 10%
            { level: 2, percentage: 5, minOrder: null },   // F2: 5%
            { level: 3, percentage: 2, minOrder: null },    // F3: 2%
        ]

        for (const levelData of levels) {
            await prisma.affiliateLevel.upsert({
                where: {
                    campaignId_level: {
                        campaignId: campaign.id,
                        level: levelData.level
                    }
                },
                update: {},
                create: {
                    campaignId: campaign.id,
                    level: levelData.level,
                    percentage: levelData.percentage,
                    minOrder: levelData.minOrder,
                },
            })
        }
        console.log('Commission levels created:', levels)

        console.log('Affiliate seed completed successfully!')
    } catch (error) {
        console.error('Affiliate seed failed:', error)
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
