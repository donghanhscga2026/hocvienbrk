import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function generateClosures(systemId: number) {
    console.log(`  🔗 Đang tạo closures cho Hệ thống #${systemId}...`)
    const allSystems = await prisma.system.findMany({ where: { onSystem: systemId } })

    const closureRecords: any[] = []
    const userToSystem = new Map<number, any>()
    for (const s of allSystems) userToSystem.set(s.userId, s)

    for (const s of allSystems) {
        closureRecords.push({ ancestorId: s.autoId, descendantId: s.autoId, depth: 0, systemId })

        let currentParentUserId = s.refSysId
        let currentDepth = 1
        let visited = new Set<number>([s.userId])

        while (true) {
            if (visited.has(currentParentUserId)) break
            // Phát hiện cycle: nếu refSysId=0 trỏ ngược về chính user đang xử lý
            if (currentParentUserId === 0 && userToSystem.has(0) && userToSystem.get(0).refSysId === s.userId) break
            const parentSystem = userToSystem.get(currentParentUserId)
            if (!parentSystem) break

            closureRecords.push({
                ancestorId: parentSystem.autoId,
                descendantId: s.autoId,
                depth: currentDepth,
                systemId
            })
            visited.add(currentParentUserId)
            if (parentSystem.refSysId === parentSystem.userId) break
            currentParentUserId = parentSystem.refSysId
            currentDepth++
            if (currentDepth > 100) break
        }
    }

    console.log(`  🗑️ Đang cập nhật ${closureRecords.length} closures...`)
    await prisma.$transaction([
        prisma.systemClosure.deleteMany({ where: { systemId } }),
        prisma.systemClosure.createMany({ data: closureRecords, skipDuplicates: true })
    ])
    console.log(`  ✅ Hoàn tất! ${closureRecords.length} closures.`)
}

async function resolveSystemReferrer(userId: number, systemId: number, defaultRoot: number): Promise<number> {
    let currentId = userId
    let depth = 0

    while (currentId && depth < 50) {
        const existing = await prisma.system.findFirst({
            where: { userId: currentId, onSystem: systemId }
        })
        if (existing && currentId !== defaultRoot) return currentId

        const user = await prisma.user.findUnique({
            where: { id: currentId },
            select: { referrerId: true }
        })
        if (!user || !user.referrerId) break

        currentId = user.referrerId
        depth++
    }

    return 0
}

async function upsertSystemRecord(userId: number, refSysId: number, systemId: number) {
    const existing = await prisma.system.findFirst({
        where: { userId, onSystem: systemId }
    })
    if (existing) {
        await prisma.system.update({
            where: { autoId: existing.autoId },
            data: { refSysId }
        })
    } else {
        await prisma.system.create({
            data: { userId, onSystem: systemId, refSysId }
        })
    }
}

async function main() {
    console.log('🚀 Bắt đầu seed Hệ thống YTB (onSystem=3)...')
    const SYSTEM_ID = 3
    const ROOT_USER_ID = 922
    const ADMIN_0 = 0
    const TEACHER_327 = 327
    const TEACHER_330 = 330

    // 1. SystemTree
    console.log('📁 Đảm bảo SystemTree entry...')
    await prisma.systemTree.upsert({
        where: { onSystem: SYSTEM_ID },
        update: {},
        create: { onSystem: SYSTEM_ID, nameSystem: 'YTB' }
    })
    console.log('✅ SystemTree OK')

    // 2. Create root 922 (refSysId=0)
    console.log('👑 Đảm bảo Root 922...')
    await upsertSystemRecord(ROOT_USER_ID, 0, SYSTEM_ID)
    console.log('✅ Root 922 OK')

    // 3. Create 327 và 330 dưới root 922
    console.log('👤 Đảm bảo 327 và 330 dưới Root 922...')
    await upsertSystemRecord(TEACHER_327, ROOT_USER_ID, SYSTEM_ID)
    await upsertSystemRecord(TEACHER_330, ROOT_USER_ID, SYSTEM_ID)
    console.log('✅ 327 và 330 OK')

    // 4. Create admin 0 dưới root 922 (học viên không thuộc 327/330 sẽ về đây)
    console.log('👤 Đảm bảo Admin 0 dưới Root 922...')
    await upsertSystemRecord(ADMIN_0, ROOT_USER_ID, SYSTEM_ID)
    console.log('✅ Admin 0 OK')

    // 4. Collect students from enrollments (ACTIVE + PENDING) in courses where teacherId=327
    console.log('👥 Đang thu thập học viên...')
    const enrollments = await prisma.enrollment.findMany({
        where: {
            course: { teacherId: TEACHER_327 },
            status: { in: ['ACTIVE', 'PENDING'] }
        },
        select: { userId: true }
    })
    const rawUserIds = [...new Set(enrollments.map(e => e.userId))]
    const students = await prisma.user.findMany({
        where: { id: { in: rawUserIds }, role: 'STUDENT' },
        select: { id: true }
    })
    const studentUserIds = students.map(s => s.id)
    console.log(`📊 Tìm thấy ${studentUserIds.length} học viên (bỏ qua ${rawUserIds.length - studentUserIds.length} user không phải STUDENT)`)

    if (studentUserIds.length === 0) {
        console.log('⚠️ Không có học viên nào. Kết thúc.')
        return
    }

    // 5. Với mỗi student: resolve referrer chain → tạo System record
    console.log('🔗 Đang resolve referrer chain cho từng học viên...')
    let createdCount = 0
    for (const userId of studentUserIds) {
        const refSysId = await resolveSystemReferrer(userId, SYSTEM_ID, ROOT_USER_ID)
        const existing = await prisma.system.findFirst({
            where: { userId, onSystem: SYSTEM_ID }
        })
        if (!existing) {
            await prisma.system.create({
                data: { userId, onSystem: SYSTEM_ID, refSysId }
            })
            createdCount++
            console.log(`   ➕ #${userId} → refSysId=${refSysId}`)
        } else {
            // Cập nhật refSysId nếu đã tồn tại
            await prisma.system.update({
                where: { autoId: existing.autoId },
                data: { refSysId }
            })
            console.log(`   🔄 #${userId} → refSysId=${refSysId} (đã tồn tại, cập nhật)`)
        }
    }
    console.log(`✅ Đã tạo ${createdCount} System records mới cho học viên`)

    // 6. Generate closures (xóa cũ + tạo mới)
    console.log('🏗️ Đang xây dựng closures...')
    await generateClosures(SYSTEM_ID)

    // 7. Thống kê
    const totalSystems = await prisma.system.count({ where: { onSystem: SYSTEM_ID } })
    const totalClosures = await prisma.systemClosure.count({ where: { systemId: SYSTEM_ID } })
    console.log(`📊 Thống kê: ${totalSystems} System records, ${totalClosures} closures`)

    console.log('🎉 Seed Hệ thống YTB hoàn tất!')
    console.log('')
    console.log('⚠️ Để rollback nếu có lỗi, chạy lệnh:')
    console.log('   npx tsx scripts/rollback-ytb-system.ts')
}

main()
    .catch((e) => {
        console.error('❌ Lỗi:', e)
        process.exit(1)
    })
    .finally(() => prisma.$disconnect())
