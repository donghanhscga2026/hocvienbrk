'use server'

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"

/**
 * Lấy danh sách tất cả các bài khảo sát (CHỈ lấy id, name, isActive - KHÔNG lấy flow)
 * [OPTIMIZE] Tránh tải cả MB dữ liệu JSON flow khi chỉ cần list tên
 */
export async function getAllSurveys() {
    try {
        return await prisma.survey.findMany({
            select: {
                id: true,
                name: true,
                isActive: true,
                createdAt: true
            },
            orderBy: { createdAt: 'desc' }
        })
    } catch (error) {
        console.error('Error fetching surveys:', error)
        return []
    }
}

/**
 * Lấy flow của một bài khảo sát (CHỈ gọi khi cần thiết kế sơ đồ)
 * [OPTIMIZE] Tách riêng để tránh tải flow khi chỉ cần list
 */
export async function getSurveyFlow(id: number) {
    try {
        return await prisma.survey.findUnique({
            where: { id },
            select: { flow: true, name: true }
        })
    } catch (error) {
        console.error('Error fetching survey flow:', error)
        return null
    }
}

/**
 * Lấy bài khảo sát đang được kích hoạt (Cho học viên)
 */
export async function getActiveSurvey() {
    try {
        const active = await prisma.survey.findFirst({
            where: { isActive: true }
        })
        return active ? active.flow : null
    } catch (error) {
        console.error('Error fetching active survey:', error)
        return null
    }
}

/**
 * Lấy chi tiết một bài khảo sát
 */
export async function getSurveyById(id: number) {
    try {
        return await prisma.survey.findUnique({
            where: { id }
        })
    } catch (error) {
        return null
    }
}

/**
 * Tạo mới một bài khảo sát
 */
export async function createSurvey(name: string, description: string = '') {
    try {
        const newSurvey = await prisma.survey.create({
            data: {
                name,
                description,
                flow: { nodes: [], edges: [] }
            }
        })
        revalidatePath('/admin/roadmap')
        return { success: true, survey: newSurvey }
    } catch (error) {
        return { success: false, error: 'Lỗi khi tạo mới.' }
    }
}

/**
 * Lưu sơ đồ của bài khảo sát
 */
export async function saveSurveyFlow(id: number, flow: any) {
    try {
        await prisma.survey.update({
            where: { id },
            data: { flow }
        })
        revalidatePath('/admin/roadmap')
        return { success: true }
    } catch (error) {
        return { success: false, error: 'Lỗi khi lưu sơ đồ.' }
    }
}

/**
 * Kích hoạt bài khảo sát này và hủy kích hoạt tất cả các bài khác
 */
export async function activateSurvey(id: number) {
    try {
        // Sử dụng transaction để đảm bảo tính toàn vẹn (chỉ 1 bài được active)
        await prisma.$transaction([
            prisma.survey.updateMany({
                where: { isActive: true },
                data: { isActive: false }
            }),
            prisma.survey.update({
                where: { id },
                data: { isActive: true }
            })
        ])
        revalidatePath('/admin/roadmap')
        revalidatePath('/')
        return { success: true }
    } catch (error) {
        return { success: false, error: 'Lỗi khi kích hoạt.' }
    }
}

/**
 * Xóa một bài khảo sát
 */
export async function deleteSurvey(id: number) {
    try {
        await prisma.survey.delete({ where: { id } })
        revalidatePath('/admin/roadmap')
        return { success: true }
    } catch (error) {
        return { success: false, error: 'Không thể xóa bài này.' }
    }
}

/**
 * Lấy danh sách khóa học cho builder
 */
export async function getCoursesForBuilder() {
    try {
        return await prisma.course.findMany({
            where: { status: true },
            select: { id: true, id_khoa: true, name_lop: true },
            orderBy: { id: 'asc' }
        })
    } catch (error) {
        return []
    }
}
