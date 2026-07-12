import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { Role } from "@prisma/client"
import { revalidatePath } from "next/cache"

/**
 * POST /api/courses - Tạo khóa học mới (ADMIN + TEACHER)
 */
export async function POST(request: NextRequest) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const userRole = session.user.role as Role
        if (userRole !== Role.ADMIN && userRole !== Role.TEACHER) {
            return NextResponse.json({ error: "Forbidden: Cần quyền ADMIN hoặc TEACHER" }, { status: 403 })
        }

        const body = await request.json()
        
        // Validate required fields
        if (!body.id_khoa || !body.name_lop) {
            return NextResponse.json({ error: "Thiếu trường bắt buộc: id_khoa, name_lop" }, { status: 400 })
        }

        // TEACHER chỉ được tạo course với teacherId = chính mình
        const teacherIdValue: number | undefined = userRole === Role.TEACHER 
            ? Number(session.user.id) 
            : (body.teacherId ? Number(body.teacherId) : undefined)

        let categoryName = body.category || 'Khác'
        const categoryId = body.categoryId ? Number(body.categoryId) : null
        if (categoryId) {
            const cat = await prisma.courseCategory.findUnique({ where: { id: categoryId } })
            if (cat) categoryName = cat.name
        }

        const courseData: any = {
            id_khoa: body.id_khoa.toUpperCase(),
            name_lop: body.name_lop,
            name_khoa: body.name_khoa || null,
            category: categoryName,
            categoryId,
            type: body.type || 'NORMAL',
            status: body.status !== undefined ? body.status : true,
            pin: Number(body.pin) || 0,
            date_join: body.date_join || null,
            mo_ta_ngan: body.mo_ta_ngan || null,
            mo_ta_dai: body.mo_ta_dai || null,
            link_anh_bia: body.link_anh_bia || null,
            phi_coc: Number(body.phi_coc) || 0,
            feeType: body.feeType || 'MIEN_PHI',
            vipExempt: body.vipExempt === true,
            noidung_stk: body.noidung_stk || null,
            link_zalo: body.link_zalo || null,
            file_email: body.file_email || null,
            noidung_email: body.noidung_email || null,
        }
        
        if (teacherIdValue !== undefined) {
            courseData.teacherId = teacherIdValue
        }

        const teacherBankAccountId = body.teacherBankAccountId ? Number(body.teacherBankAccountId) : null
        if (teacherBankAccountId) {
            courseData.teacherBankAccountId = teacherBankAccountId
        }

        const course = await prisma.course.create({
            data: courseData
        })

        revalidatePath('/tools/courses')
        return NextResponse.json({ success: true, course })
    } catch (error: any) {
        console.error('POST /api/courses error:', error)
        return NextResponse.json({ error: error.message || "Lỗi tạo khóa học" }, { status: 500 })
    }
}

/**
 * GET /api/courses - Lấy danh sách khóa học (phân quyền ADMIN/TEACHER)
 */
export async function GET(request: NextRequest) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const userRole = session.user.role as Role
        const userId = Number(session.user.id)

        let courses
        if (userRole === Role.ADMIN) {
            courses = await prisma.course.findMany({
                orderBy: { id: 'desc' },
                include: { teacher: { select: { id: true, name: true, email: true } } }
            })
        } else if (userRole === Role.TEACHER) {
            courses = await prisma.course.findMany({
                where: { teacherId: userId },
                orderBy: { id: 'desc' },
                include: { teacher: { select: { id: true, name: true, email: true } } }
            })
        } else {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        return NextResponse.json({ courses })
    } catch (error: any) {
        console.error('GET /api/courses error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
