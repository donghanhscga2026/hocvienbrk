import { PrismaClient, CommissionStatus, ConversionStatus } from '@prisma/client'

const prisma = new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL
})

async function generateBackfillCommissions() {
    console.log('🔄 Bắt đầu backfill commissions...\n')

    try {
        // 1. Lấy campaign mặc định
        const campaign = await prisma.affiliateCampaign.findFirst({
            where: { slug: 'default', isActive: true },
            include: { levels: true }
        })

        if (!campaign) {
            console.log('❌ Không tìm thấy campaign active')
            return
        }

        console.log(`📋 Campaign: ${campaign.name}`)
        console.log(`   Levels: ${campaign.levels.map(l => `F${l.level}=${l.percentage}%`).join(', ')}\n`)

        // 2. Tìm tất cả user có referrer (đã giới thiệu ít nhất 1 người)
        const usersWithReferrals = await prisma.user.findMany({
            where: {
                referrerId: { not: null }
            },
            select: {
                id: true,
                referrerId: true,
                email: true,
                name: true,
                referrer: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        })

        console.log(`👥 Tìm thấy ${usersWithReferrals.length} user có referrer\n`)

        // 3. Với mỗi user có referrer, tạo commission cho các upline
        let createdConversions = 0
        let createdCommissions = 0
        const errors: string[] = []

        // Lấy tất cả closure records để trace upline nhanh
        const allClosures = await prisma.userClosure.findMany({
            include: {
                ancestor: { select: { id: true, name: true } },
                descendant: { select: { id: true } }
            }
        })

        // Group closures by descendant
        const closureMap = new Map<number, typeof allClosures>()
        for (const closure of allClosures) {
            const existing = closureMap.get(closure.descendantId) || []
            existing.push(closure)
            closureMap.set(closure.descendantId, existing)
        }

        for (const user of usersWithReferrals) {
            try {
                // Tìm referrer (F1) của user này
                const referrer = user.referrer
                if (!referrer) continue

                // Trace upline từ closure table
                const userClosures = closureMap.get(user.id) || []
                const ancestors = userClosures
                    .filter(c => c.depth > 0 && c.depth <= campaign.maxLevels)
                    .sort((a, b) => a.depth - b.depth)

                if (ancestors.length === 0) continue

                // Tạo hoặc lấy affiliate link cho F1
                let link = await prisma.affiliateLink.findFirst({
                    where: { userId: referrer.id, campaignId: campaign.id }
                })

                if (!link) {
                    link = await prisma.affiliateLink.create({
                        data: {
                            userId: referrer.id,
                            campaignId: campaign.id,
                            code: `REF${referrer.id}`,
                            name: 'Auto-generated (backfill)',
                            source: 'system'
                        }
                    })
                }

                // Kiểm tra xem đã có conversion cho user này chưa
                const existingConversion = await prisma.affiliateConversion.findFirst({
                    where: {
                        customerId: user.id,
                        campaignId: campaign.id
                    }
                })

                if (existingConversion) {
                    console.log(`   ⏭️ User #${user.id} đã có conversion, bỏ qua`)
                    continue
                }

                // Tạo conversion (không có enrollment, chỉ là registration)
                const conversion = await prisma.affiliateConversion.create({
                    data: {
                        linkId: link.id,
                        campaignId: campaign.id,
                        customerId: user.id,
                        orderId: `REG-BACKFILL-${user.id}`,
                        orderAmount: 0, // Không có đơn hàng, chỉ là registration
                        productType: 'COURSE',
                        status: ConversionStatus.PENDING,
                        pendingUntil: new Date() // Available ngay
                    }
                })

                createdConversions++

                // Tạo commission cho từng upline
                for (const ancestor of ancestors) {
                    const levelConfig = campaign.levels.find(l => l.level === ancestor.depth)
                    if (!levelConfig) continue

                    // Mặc định 10% của 0 = 0, nhưng vẫn tạo record
                    const grossAmount = 0
                    const netAmount = 0

                    await prisma.affiliateCommission.create({
                        data: {
                            conversionId: conversion.id,
                            affiliateId: ancestor.ancestor.id,
                            level: ancestor.depth,
                            percentage: levelConfig.percentage,
                            grossAmount,
                            netAmount,
                            status: CommissionStatus.AVAILABLE,
                            availableAt: new Date()
                        }
                    })

                    createdCommissions++

                    console.log(
                        `   ✅ User #${user.id} → F${ancestor.depth} (#${ancestor.ancestor.id} ${ancestor.ancestor.name || ''})`
                    )
                }

            } catch (error) {
                errors.push(`User #${user.id}: ${String(error)}`)
            }
        }

        console.log('\n📊 Kết quả:')
        console.log(`   Conversions tạo: ${createdConversions}`)
        console.log(`   Commissions tạo: ${createdCommissions}`)
        console.log(`   Errors: ${errors.length}`)

        if (errors.length > 0) {
            console.log('\n❌ Chi tiết lỗi:')
            errors.forEach(e => console.log(`   - ${e}`))
        }

    } catch (error) {
        console.error('❌ Lỗi:', error)
        throw error
    }
}

// Chạy với thêm điểm cho referrer
async function backfillRegistrationPoints() {
    console.log('\n🔄 Bắt đầu backfill Registration Points...\n')

    try {
        const campaign = await prisma.affiliateCampaign.findFirst({
            where: { slug: 'default', isActive: true }
        })

        if (!campaign) {
            console.log('❌ Không tìm thấy campaign')
            return
        }

        const pointsPerReg = campaign.pointsPerRegistration

        // Tìm tất cả user có referrerId (bỏ qua referrerId = 0)
        const usersWithReferrals = await prisma.user.findMany({
            where: {
                referrerId: { not: null, gt: 0 }
            },
            select: {
                id: true,
                referrerId: true,
                email: true
            }
        })

        console.log(`👥 Tìm thấy ${usersWithReferrals.length} user có referrer hợp lệ (referrerId > 0)\n`)

        let createdPoints = 0

        for (const user of usersWithReferrals) {
            // Kiểm tra đã có point record chưa
            const existing = await prisma.registrationPoint.findFirst({
                where: {
                    refereeId: user.id,
                    campaignId: campaign.id
                }
            })

            if (existing) {
                continue
            }

            // Tạo registration point
            await prisma.registrationPoint.create({
                data: {
                    referrerId: user.referrerId!,
                    refereeId: user.id,
                    campaignId: campaign.id,
                    points: pointsPerReg,
                    status: 'CONFIRMED',
                    confirmedAt: new Date()
                }
            })

            // Cập nhật wallet
            const wallet = await prisma.affiliateWallet.findUnique({
                where: { userId: user.referrerId! }
            })

            if (wallet) {
                await prisma.affiliateWallet.update({
                    where: { userId: user.referrerId! },
                    data: { points: { increment: pointsPerReg } }
                })
            } else {
                await prisma.affiliateWallet.create({
                    data: {
                        userId: user.referrerId!,
                        points: pointsPerReg
                    }
                })
            }

            // Ghi transaction
            if (wallet) {
                await prisma.affiliateTransaction.create({
                    data: {
                        walletId: wallet.id,
                        amount: pointsPerReg,
                        type: 'POINT_EARNED',
                        description: `Backfill: Nhận ${pointsPerReg} điểm từ đăng ký của user #${user.id}`,
                        balanceBefore: wallet.points,
                        balanceAfter: wallet.points + pointsPerReg
                    }
                })
            }

            createdPoints++
            console.log(`   ✅ User #${user.id} → Referrer #${user.referrerId}: +${pointsPerReg} điểm`)
        }

        console.log(`\n📊 Đã tạo ${createdPoints} registration points`)

    } catch (error) {
        console.error('❌ Lỗi:', error)
        throw error
    }
}

// Main
async function main() {
    console.log('========================================')
    console.log('  BACKFILL AFFILIATE DATA')
    console.log('========================================\n')

    await backfillRegistrationPoints()
    await generateBackfillCommissions()

    console.log('\n✅ Hoàn tất backfill!')
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
