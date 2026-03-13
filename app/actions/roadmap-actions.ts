'use server'

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"

const ROADMAP_FLOW_KEY = 'ZERO_TO_HERO_FLOW'

/**
 * Lấy sơ đồ lộ trình từ Database
 */
export async function getRoadmapFlow() {
    try {
        const config = await prisma.systemConfig.findUnique({
            where: { key: ROADMAP_FLOW_KEY }
        })
        
        if (!config || !config.value) {
            return null
        }
        
        return config.value as any
    } catch (error) {
        console.error('Error fetching roadmap flow:', error)
        return null
    }
}

/**
 * Lưu sơ đồ lộ trình mới vào Database
 */
export async function saveRoadmapFlow(flow: any) {
    try {
        await prisma.systemConfig.upsert({
            where: { key: ROADMAP_FLOW_KEY },
            update: { value: flow },
            create: {
                key: ROADMAP_FLOW_KEY,
                value: flow
            }
        })
        
        revalidatePath('/admin/roadmap')
        return { success: true }
    } catch (error) {
        console.error('Error saving roadmap flow:', error)
        return { success: false, error: 'Không thể lưu sơ đồ. Vui lòng thử lại.' }
    }
}

/**
 * Lấy danh sách khóa học để Admin chọn đưa vào sơ đồ
 */
export async function getCoursesForBuilder() {
    try {
        const courses = await prisma.course.findMany({
            where: { status: true },
            select: {
                id: true,
                id_khoa: true,
                name_lop: true
            },
            orderBy: { id: 'asc' }
        })
        return courses
    } catch (error) {
        console.error('Error fetching courses:', error)
        return []
    }
}
