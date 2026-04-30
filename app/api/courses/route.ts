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

        const courseData: any = {
            id_khoa: body.id_khoa,
            name_lop: body.name_lop,
            nam_bat_dau: body.nam_bat_dau ? Number(body.nam_bat_dau) : null,
            nam_ket_thuc: body.nam_ket_thuc ? Number(body.nam_ket_thuc) : null,
            hoc_phi: body.hoc_phi ? Number(body.hoc_phi) : null,
            phi_coc: body.phi_coc ? Number(body.phi_coc) : null,
            giam_hoc_phi: body.giam_hoc_phi ? Number(body.giam_hoc_phi) : null,
            type: body.type || null,
            stickers: body.stickers || null,
            mo_ta: body.mo_ta || null,
            image: body.image || null,
            lich_hoc: body.lich_hoc || null,
            link_zoom: body.link_zoom || null,
            link_telegram: body.link_telegram || null,
            link_meet: body.link_meet || null,
            stk: body.stk || null,
            name_stk: body.name_stk || null,
            bank_stk: body.bank_stk || null,
            noidung_email: body.noidung_email || null,
            template_zalo: body.template_zalo || null,
            template_email: body.template_email || null,
        }
        
        if (teacherIdValue !== undefined) {
            courseData.teacherId = teacherIdValue
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
