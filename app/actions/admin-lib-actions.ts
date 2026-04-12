'use server'

import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"

// Validate admin helper
async function checkAdmin() {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")
    
    const user = await prisma.user.findUnique({
        where: { id: Number(session.user.id) },
        select: { role: true }
    })
    
    if (user?.role !== 'ADMIN') throw new Error("Forbidden")
}

export async function getLibAccessEmails(courseId: number) {
    await checkAdmin()
    
    const accessList = await prisma.courseLibAccess.findMany({
        where: { courseId },
        orderBy: { createdAt: 'desc' },
        select: { id: true, email: true, createdAt: true }
    })
    
    return accessList
}

export async function addLibAccessEmail(courseId: number, email: string) {
    await checkAdmin()
    
    if (!email || !email.includes('@')) {
        return { success: false, message: "Email không hợp lệ" }
    }
    
    const cleanEmail = email.trim().toLowerCase()
    
    try {
        await prisma.courseLibAccess.create({
            data: { courseId, email: cleanEmail }
        })
        revalidatePath(`/admin/courses/${courseId}/lib-access`)
        return { success: true }
    } catch (error: any) {
        if (error.code === 'P2002') {
            return { success: false, message: "Email đã tồn tại trong danh sách" }
        }
        return { success: false, message: "Lỗi thêm email" }
    }
}

export async function removeLibAccessEmail(courseId: number, email: string) {
    await checkAdmin()
    
    try {
        await prisma.courseLibAccess.delete({
            where: {
                courseId_email: {
                    courseId,
                    email: email.trim().toLowerCase()
                }
            }
        })
        revalidatePath(`/admin/courses/${courseId}/lib-access`)
        return { success: true }
    } catch (error) {
        return { success: false, message: "Lỗi xoá email" }
    }
}

export async function importLibAccessCsvAction(courseId: number, emails: string[]) {
    await checkAdmin()
    
    if (!emails || !emails.length) return { success: false, message: "Danh sách email rỗng" }
    
    let addedCount = 0
    const skippedEmails: string[] = []
    
    // Process unique and valid
    const cleanEmails = [...new Set(emails.map(e => e.trim().toLowerCase()).filter(e => e.includes('@')))]
    
    for (const em of cleanEmails) {
        try {
            await prisma.courseLibAccess.create({
                data: { courseId, email: em }
            })
            addedCount++
        } catch (error: any) {
            skippedEmails.push(em)
        }
    }
    
    revalidatePath(`/admin/courses/${courseId}/lib-access`)
    return { success: true, addedCount, skippedCount: skippedEmails.length, skippedEmails }
}
