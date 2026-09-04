import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { toTitleCase } from "@/lib/utils/text-format"
import { getCourseAuthContext } from "@/lib/course/permissions"
import { resolveCourseCategoryName } from "@/lib/course/category"
import { canPinAnotherCourse, PIN_LIMIT_ERROR } from "@/lib/course/pin-limit"
import { formatCourseSaveError } from "@/lib/course/errors"
import { resolveImageUrl } from "@/lib/image-utils"

/**
 * POST /api/courses - Tạo khóa học mới (ADMIN + TEACHER)
 */
export async function POST(request: NextRequest) {
    let body: any
    try {
        const ctx = await getCourseAuthContext()
        if (!ctx) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }
        if (!ctx.isAdmin && !ctx.isTeacher) {
            return NextResponse.json({ error: "Forbidden: Cần quyền ADMIN hoặc TEACHER" }, { status: 403 })
        }

        body = await request.json()

        // Validate required fields
        if (!body.id_khoa || !body.name_lop) {
            return NextResponse.json({ error: "Thiếu trường bắt buộc: id_khoa, name_lop" }, { status: 400 })
        }

        // TEACHER chỉ được tạo course với teacherId = chính mình
        const teacherIdValue: number | undefined = ctx.isTeacher
            ? ctx.userId
            : (body.teacherId ? Number(body.teacherId) : undefined)

        const categoryId = body.categoryId ? Number(body.categoryId) : null
        const categoryName = await resolveCourseCategoryName(categoryId)

        const pin = Number(body.pin) || 0
        if (pin > 0 && !(await canPinAnotherCourse())) {
            return NextResponse.json({ error: PIN_LIMIT_ERROR }, { status: 409 })
        }

        const courseData: any = {
            id_khoa: body.id_khoa.toUpperCase(),
            name_lop: toTitleCase(body.name_lop),
            name_khoa: body.name_khoa ? toTitleCase(body.name_khoa) : null,
            category: categoryName,
            categoryId,
            type: body.type || 'NORMAL',
            status: body.status !== undefined ? body.status : true,
            pin,
            date_join: body.date_join || null,
            mo_ta_ngan: body.mo_ta_ngan || null,
            mo_ta_dai: body.mo_ta_dai || null,
            link_anh_bia: await resolveImageUrl(body.link_anh_bia, 'courses'),
            phi_coc: Number(body.phi_coc) || 0,
            feeType: body.feeType || 'MIEN_PHI',
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

        // Create accepted voucher records
        const acceptedVoucherIds: number[] = body.acceptedVoucherIds || []
        if (acceptedVoucherIds.length > 0) {
            await prisma.courseAcceptedVoucher.createMany({
                data: acceptedVoucherIds.map((voucherId: number) => ({
                    courseId: course.id,
                    voucherId
                }))
            })
        }

        // Create award voucher records
        const awardVoucherIds: number[] = body.awardVoucherIds || []
        if (awardVoucherIds.length > 0) {
            await prisma.courseVoucherAward.createMany({
                data: awardVoucherIds.map((voucherId: number) => ({
                    courseId: course.id,
                    voucherId
                }))
            })
        }

        revalidatePath('/tools/courses')
        return NextResponse.json({ success: true, course })
    } catch (error: any) {
        console.error('POST /api/courses error:', error)
        const status = error?.code === 'P2002' ? 409 : 500
        return NextResponse.json({ error: formatCourseSaveError(error, body?.id_khoa) }, { status })
    }
}

/**
 * GET /api/courses - Lấy danh sách khóa học (phân quyền ADMIN/TEACHER)
 */
export async function GET(request: NextRequest) {
    try {
        const ctx = await getCourseAuthContext()
        if (!ctx) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }
        if (!ctx.isAdmin && !ctx.isTeacher) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const courses = await prisma.course.findMany({
            where: ctx.isAdmin ? {} : { teacherId: ctx.userId },
            orderBy: { id: 'desc' },
            include: { teacher: { select: { id: true, name: true, email: true } } }
        })

        return NextResponse.json({ courses })
    } catch (error: any) {
        console.error('GET /api/courses error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
