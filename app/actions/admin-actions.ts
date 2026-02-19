'use server'

import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { Role } from "@prisma/client"
import { revalidatePath } from "next/cache"

// Helper to check admin permission
async function checkAdmin() {
    const session = await auth()
    if (session?.user?.role !== Role.ADMIN) {
        throw new Error("Unauthorized: You must be an Admin.")
    }
}

export async function addReservedIdAction(prevState: any, formData: FormData) {
    await checkAdmin()

    const id = parseInt(formData.get("id") as string)
    const note = formData.get("note") as string || "Admin Added"

    if (isNaN(id)) return { message: "Error: ID phải là số." }

    try {
        const existing = await prisma.reservedId.findUnique({ where: { id } })
        if (existing) return { message: `Error: ID ${id} đã có trong danh sách.` }

        await prisma.reservedId.create({
            data: { id, note }
        })
        revalidatePath("/admin/reserved-ids")
        return { message: `Success: Đã thêm ID ${id} vào danh sách dự trữ.` }
    } catch (_e) {
        console.error(_e)
        return { message: "Error: Lỗi Server khi thêm ID." }
    }
}

export async function deleteReservedIdAction(id: number) {
    await checkAdmin()
    try {
        await prisma.reservedId.delete({ where: { id } })
        revalidatePath("/admin/reserved-ids")
        return { message: `Success: Đã xóa ID ${id}.` }
    } catch (_e) {
        return { message: "Error: Lỗi khi xóa ID." }
    }
}

export async function changeUserIdAction(prevState: any, formData: FormData) {
    await checkAdmin()

    const currentId = parseInt(formData.get("currentId") as string)
    const newId = parseInt(formData.get("newId") as string)

    if (isNaN(currentId) || isNaN(newId)) {
        return { message: "Error: Vui lòng nhập đúng định dạng số ID." }
    }

    try {
        // 1. Check user cũ
        const user = await prisma.user.findUnique({ where: { id: currentId } })
        if (!user) return { message: `Error: Không tìm thấy User với ID ${currentId}` }

        // 2. Check user mới (target)
        const targetUser = await prisma.user.findUnique({ where: { id: newId } })
        if (targetUser) return { message: `Error: ID ${newId} đã có người sử dụng: ${targetUser.email}` }

        // 3. Thực hiện đổi
        // Tận dụng ON UPDATE CASCADE của PostgreSQL
        await prisma.$executeRawUnsafe(`UPDATE "User" SET id = ${newId} WHERE id = ${currentId}`)

        // 4. Reset Sequence
        await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"User"', 'id'), coalesce(max(id)+1, 1), false) FROM "User";`)

        revalidatePath("/admin/reserved-ids")
        return { message: `Success: Thành công! Đã đổi ${user.email} (ID: ${currentId}) -> ID Mới: ${newId}` }

    } catch (e) {
        console.error(e)
        return { message: "Error: Lỗi hệ thống khi đổi ID." }
    }
}

export async function getReservedIds() {
    await checkAdmin()
    return await prisma.reservedId.findMany({
        orderBy: { id: 'asc' }
    })
}
