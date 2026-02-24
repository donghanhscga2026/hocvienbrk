
'use server'

import prisma from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

export async function getEnrollmentStatus(courseId: number) {
    const session = await auth()
    if (!session?.user?.id) return null

    const enrollment = await (prisma as any).enrollment.findUnique({
        where: {
            userId_courseId: {
                userId: parseInt(session.user.id),
                courseId: courseId
            }
        }
    })

    return enrollment?.status || null
}

export async function enrollInCourseAction(courseId: number) {
    const session = await auth()
    if (!session?.user?.id) {
        throw new Error("Bạn cần đăng nhập để đăng ký khóa học.")
    }

    const userId = parseInt(session.user.id)

    // Lấy thông tin khóa học để check phí
    const course = await (prisma as any).course.findUnique({
        where: { id: courseId }
    })

    if (!course) throw new Error("Không tìm thấy khóa học.")

    // Nếu phí = 0 -> Active luôn
    // Nếu phí > 0 -> Status = PENDING
    const initialStatus = course.phi_coc === 0 ? 'ACTIVE' : 'PENDING'

    const enrollment = await (prisma as any).enrollment.upsert({
        where: {
            userId_courseId: {
                userId,
                courseId
            }
        },
        update: {}, // Không đổi nếu đã tồn tại (hoặc có thể cập nhật nếu cần)
        create: {
            userId,
            courseId,
            status: initialStatus
        }
    })

    revalidatePath("/")
    revalidatePath(`/courses/${course.id_khoa}`)

    return {
        success: true,
        status: enrollment.status,
        courseId: course.id_khoa
    }
}
