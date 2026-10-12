import { Prisma } from '@prisma/client'
import prisma from './prisma'

type Db = Prisma.TransactionClient
export const NORMAL_USER_ID_CURSOR_KEY = 'user-id-allocation:normal-cursor'

/** Bộ đếm mã thông thường độc lập với số đẹp và sequence mặc định của User. */
async function normalCursor(db: Db): Promise<number> {
    const rows = await db.$queryRaw<{ value: Prisma.JsonValue }[]>(Prisma.sql`
        SELECT value FROM public."SystemConfig" WHERE key=${NORMAL_USER_ID_CURSOR_KEY}`)
    if (rows.length) {
        const value = rows[0].value
        if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value >= 2147483647) {
            throw new Error('Bộ đếm mã thành viên không hợp lệ; cần kiểm tra cấu hình.')
        }
        return value
    }
    // Tương thích database cũ: loại số giữ chỗ và đích đổi ID đã ghi nhận.
    // Dãy đã bị nhảy cần đặt cursor qua quy trình kiểm tra dữ liệu, không tự đoán.
    const legacy = await db.$queryRaw<{ id: number }[]>(Prisma.sql`
        SELECT COALESCE(max(u.id),0)::int AS id FROM public."User" u
        WHERE NOT EXISTS (SELECT 1 FROM public."ReservedId" r WHERE r.id=u.id)
          AND NOT EXISTS (SELECT 1 FROM public."SystemConfig" c
              WHERE c.key LIKE 'user-id-change:retired:%' AND c.value->>'newId'=u.id::text
                AND COALESCE(c.value->>'reason','')<>'normal-id-recovery')`)
    return legacy[0].id
}

/** Chỉ gọi trong giao dịch đã khóa User; khởi tạo trước khi đổi sang số đẹp. */
export async function ensureNormalUserIdCursor(db: Db): Promise<void> {
    const cursor = await normalCursor(db)
    await db.$executeRaw(Prisma.sql`
        INSERT INTO public."SystemConfig" (key,value) VALUES (${NORMAL_USER_ID_CURSOR_KEY},${JSON.stringify(cursor)}::jsonb)
        ON CONFLICT (key) DO NOTHING`)
}

/** Xem trước các mã khả dụng; không ghi dữ liệu và không tiêu thụ mã. */
export async function getAvailableUserIds(count: number, db: Db = prisma): Promise<number[]> {
    if (!Number.isInteger(count) || count < 0 || count > 10000) throw new Error('Số lượng mã cần cấp không hợp lệ.')
    if (count === 0) return []
    const cursor = await normalCursor(db)
    // Số phần tử bị chặn là giới hạn trên: cửa sổ này luôn đủ mã trống.
    const blocked = await db.$queryRaw<{ n: bigint }[]>(Prisma.sql`
        SELECT (SELECT count(*) FROM public."User") + (SELECT count(*) FROM public."ReservedId")
          + (SELECT count(*) FROM public."SystemConfig" WHERE key LIKE 'user-id-change:retired:%') AS n`)
    const end = Math.min(2147483647, cursor + count + Number(blocked[0].n))
    const rows = await db.$queryRaw<{ id: number }[]>(Prisma.sql`
        SELECT s.id FROM generate_series(${cursor + 1}::int,${end}::int) s(id)
        WHERE NOT EXISTS (SELECT 1 FROM public."User" u WHERE u.id=s.id)
          AND NOT EXISTS (SELECT 1 FROM public."ReservedId" r WHERE r.id=s.id)
          AND NOT EXISTS (SELECT 1 FROM public."SystemConfig" c WHERE c.key='user-id-change:retired:' || s.id)
        ORDER BY s.id LIMIT ${count}`)
    if (rows.length !== count) throw new Error('Đã hết mã thành viên khả dụng.')
    return rows.map(row => row.id)
}

export async function getNextAvailableId(db: Db = prisma): Promise<number> {
    return (await getAvailableUserIds(1, db))[0]
}

/** Cấp mã và tạo tài khoản cùng giao dịch; lỗi tạo tài khoản không làm tăng cursor. */
export async function createUserWithAvailableIdInTransaction(db: Db, data: Omit<Prisma.UserUncheckedCreateInput, 'id'>) {
    // Chung khóa với đổi ID; mọi INSERT/UPDATE User khác cũng phải chờ khóa này.
    await db.$executeRaw(Prisma.sql`LOCK TABLE public."User" IN SHARE ROW EXCLUSIVE MODE`)
    await ensureNormalUserIdCursor(db)
    const id = await getNextAvailableId(db)
    const user = await db.user.create({ data: { ...data, id } })
    await db.$executeRaw(Prisma.sql`UPDATE public."SystemConfig" SET value=${JSON.stringify(id)}::jsonb WHERE key=${NORMAL_USER_ID_CURSOR_KEY}`)
    return user
}

export async function createUserWithAvailableId(data: Omit<Prisma.UserUncheckedCreateInput, 'id'>) {
    return prisma.$transaction(tx => createUserWithAvailableIdInTransaction(tx, data), { isolationLevel: 'ReadCommitted', timeout: 15000 })
}
