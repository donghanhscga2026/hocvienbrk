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

export async function getStudentsAction(query?: string, role?: Role | 'ALL' | 'COURSE_86_DAYS') {
    await checkAdmin()

    try {
        let where: any = {};
        
        if (role === 'COURSE_86_DAYS') {
            where.enrollments = {
                some: { courseId: 1 }
            };
        } else if (role && role !== 'ALL') {
            where.role = role;
        }

        if (query) {
            const trimmedQuery = query.trim();
            
            // 1. Nếu bắt đầu bằng # -> Tìm ID chính xác
            if (trimmedQuery.startsWith('#')) {
                const id = parseInt(trimmedQuery.substring(1));
                if (!isNaN(id)) {
                    where.id = id;
                } else {
                    return { success: true, students: [] };
                }
            } 
            // 2. Nếu là số thuần túy
            else if (/^\d+$/.test(trimmedQuery)) {
                const id = parseInt(trimmedQuery);
                const searchFields = [
                    { id: id },
                    { name: { contains: trimmedQuery, mode: 'insensitive' } },
                    { email: { contains: trimmedQuery, mode: 'insensitive' } },
                ];
                
                if (trimmedQuery.length >= 6) {
                    searchFields.push({ phone: { contains: trimmedQuery, mode: 'insensitive' } } as any);
                }

                if (where.role) {
                    where = {
                        AND: [
                            { role: where.role },
                            { OR: searchFields }
                        ]
                    };
                } else {
                    where.OR = searchFields;
                }
            }
            // 3. Tìm kiếm chuỗi bình thường
            else {
                const searchFields = [
                    { name: { contains: trimmedQuery, mode: 'insensitive' } },
                    { email: { contains: trimmedQuery, mode: 'insensitive' } },
                    { phone: { contains: trimmedQuery, mode: 'insensitive' } },
                ];

                if (where.role) {
                    where = {
                        AND: [
                            { role: where.role },
                            { OR: searchFields }
                        ]
                    };
                } else {
                    where.OR = searchFields;
                }
            }
        }

        const students = await prisma.user.findMany({
            where,
            include: {
                enrollments: {
                    include: {
                        course: { select: { name_lop: true } },
                        _count: {
                            select: { lessonProgress: { where: { status: 'COMPLETED' } } }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        return { success: true, students }
    } catch (error: any) {
        console.error("Get Students Error:", error)
        return { success: false, error: error.message }
    }
}

export async function getStudentDetailsAction(userId: number) {
    await checkAdmin()

    try {
        const student = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                enrollments: {
                    include: {
                        course: {
                            include: {
                                lessons: {
                                    orderBy: { order: 'asc' }
                                }
                            }
                        },
                        lessonProgress: {
                            include: {
                                lesson: { select: { title: true, order: true } }
                            }
                        }
                    },
                    orderBy: { createdAt: 'desc' }
                }
            }
        })

        if (!student) return { success: false, error: "Không tìm thấy học viên." }

        return { success: true, student }
    } catch (error: any) {
        console.error("Get Student Details Error:", error)
        return { success: false, error: error.message }
    }
}

export async function getAdminCoursesAction() {
    await checkAdmin()

    try {
        const courses = await prisma.course.findMany({
            include: {
                _count: {
                    select: { 
                        lessons: true,
                        enrollments: true
                    }
                }
            },
            orderBy: { id: 'asc' }
        })

        return { success: true, courses }
    } catch (error: any) {
        console.error("Get Admin Courses Error:", error)
        return { success: false, error: error.message }
    }
}

export async function updateCourseAction(courseId: number, data: {
    name_lop?: string,
    phi_coc?: number,
    id_khoa?: string,
    noidung_email?: string | null,
    stk?: string | null,
    name_stk?: string | null,
    bank_stk?: string | null
}) {
    await checkAdmin()

    try {
        const updatedCourse = await prisma.course.update({
            where: { id: courseId },
            data
        })

        revalidatePath('/admin/courses')
        revalidatePath('/') // Revalidate trang chủ nếu có đổi tên/giá
        
        return { success: true, course: updatedCourse }
    } catch (error: any) {
        console.error("Update Course Error:", error)
        return { success: false, error: error.message }
    }
}

export async function updateLessonAction(lessonId: string, data: {
    title?: string,
    content?: string | null,
    videoUrl?: string | null,
    order?: number
}) {
    await checkAdmin()

    try {
        const updatedLesson = await prisma.lesson.update({
            where: { id: lessonId },
            data
        })

        // Revalidate các trang liên quan
        const lesson = await prisma.lesson.findUnique({
            where: { id: lessonId },
            select: { course: { select: { id_khoa: true } } }
        })
        
        if (lesson?.course?.id_khoa) {
            revalidatePath(`/courses/${lesson.course.id_khoa}/learn`)
        }

        return { success: true, lesson: updatedLesson }
    } catch (error: any) {
        console.error("Update Lesson Error:", error)
        return { success: false, error: error.message }
    }
}
