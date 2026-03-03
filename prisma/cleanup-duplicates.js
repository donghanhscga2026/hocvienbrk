const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    console.log('Bắt đầu xóa bản ghi trùng lặp trong bảng LessonProgress...')

    // Tìm tất cả các nhóm (enrollmentId, lessonId) bị trùng
    const duplicates = await prisma.lessonProgress.groupBy({
        by: ['enrollmentId', 'lessonId'],
        _count: {
            id: true
        },
        having: {
            id: {
                _count: {
                    gt: 1
                }
            }
        }
    })

    console.log(`Tìm thấy ${duplicates.length} nhóm trùng lặp. Đang xử lý...`)

    let deletedCount = 0

    // Xử lý từng nhóm bị trùng
    for (const group of duplicates) {
        // Lấy tất cả các bản ghi của nhóm này, sắp xếp ID để tìm bản nháp (rác) giữ lại bản mới nhất
        const records = await prisma.lessonProgress.findMany({
            where: {
                enrollmentId: group.enrollmentId,
                lessonId: group.lessonId
            },
            orderBy: [
                { status: 'asc' }, // Ưu tiên 'COMPLETED' (C) hoặc 'IN_PROGRESS' (I) lên trước 'RESET' (R)
                { updatedAt: 'desc' }, // Trong cùng status, ưu tiên cái mới cập nhật nhất
            ]
        })

        // Bản ghi đầu tiên là bản ghi cần giữ lại
        const [keepRecord, ...deleteRecords] = records

        if (deleteRecords.length > 0) {
            const deleteIds = deleteRecords.map(r => r.id)

            await prisma.lessonProgress.deleteMany({
                where: {
                    id: { in: deleteIds }
                }
            })

            deletedCount += deleteIds.length
            console.log(`- Đã giữ lại ID ${keepRecord.id}, xóa ${deleteIds.length} bản ghi rác [${deleteIds.join(', ')}] cho Enrollment ${group.enrollmentId}, Lesson ${group.lessonId}`)
        }
    }

    console.log(`✅ Hoàn tất! Đã xóa tổng cộng ${deletedCount} bản ghi thừa.`)
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
