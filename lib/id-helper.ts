
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Lấy ID tiếp theo khả dụng cho User mới.
 * Logic:
 * 1. Lấy Max ID hiện tại.
 * 2. Tăng dần (+1).
 * 3. Kiểm tra xem ID đó có nằm trong bảng ReservedId không.
 * 4. Nếu có -> +1 tiếp. Nếu không -> Trả về.
 */
export async function getNextAvailableId(): Promise<number> {
    // Lấy User có ID lớn nhất
    const maxUser = await prisma.user.findFirst({
        orderBy: { id: 'desc' },
        select: { id: true }
    })

    let nextId = (maxUser?.id || 0) + 1

    while (true) {
        // Kiểm tra xem nextId có bị reserve không
        const isReserved = await prisma.reservedId.findUnique({
            where: { id: nextId }
        })

        if (!isReserved) {
            // Nếu không bị reserve -> Kiểm tra lại trong bảng User cho chắc chắn (Double check)
            const existingUser = await prisma.user.findUnique({ where: { id: nextId } })
            if (!existingUser) {
                return nextId
            }
        }

        // Nếu bị reserve hoặc đã tồn tại -> Thử số tiếp theo
        nextId++
    }
}
