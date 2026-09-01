import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { toTitleCase } from '@/lib/utils/text-format';
import { requireCourseAccessApi } from '@/lib/course/permissions';
import { resolveCourseCategoryName } from '@/lib/course/category';

// ✅ GET - TEACHER chỉ thấy course có teacherId = userId
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const course = await prisma.course.findUnique({
      where: { id: parseInt(id) },
      include: {
        lessons: {
          orderBy: { order: 'asc' }
        },
        teacher: true,
        acceptedVouchers: {
          include: { voucher: true }
        },
        voucherAwards: {
          include: { voucher: true }
        },
      }
    });

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    // ✅ TEACHER chỉ được xem course có teacherId = userId
    const { denied } = await requireCourseAccessApi(course.teacherId);
    if (denied) return denied;

    return NextResponse.json(course);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ✅ PUT - Cập nhật khóa học (TEACHER chỉ sửa course của mình)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    // ✅ Check course tồn tại + quyền sửa
    const course = await prisma.course.findUnique({
      where: { id: parseInt(id) },
      select: { teacherId: true }
    });

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    // ✅ TEACHER chỉ được sửa course có teacherId = userId
    const { denied, ctx } = await requireCourseAccessApi(course.teacherId);
    if (denied) return denied;
    const isAdmin = ctx!.isAdmin;

    // Extract non-scalar fields BEFORE any deletions
    const acceptedVoucherIds = body.acceptedVoucherIds
    const awardVoucherIds = body.awardVoucherIds
    const categoryId = body.categoryId ?? null
    const rawTeacherId = body.teacherId ?? null
    const bankAccountId = body.teacherBankAccountId ?? null

    // ✅ TEACHER không được thay đổi teacherId (chỉ ADMIN mới được đổi GV phụ trách)
    delete body.teacherId

    delete body.acceptedVoucherIds
    delete body.awardVoucherIds
    delete body.categoryId
    delete body.teacherBankAccountId
    // Không cho phép client tự set các trường hệ thống qua spread body
    delete body.id
    delete body.createdAt
    delete body.updatedAt

    if (body.name_lop) body.name_lop = toTitleCase(body.name_lop)
    if ('name_khoa' in body) body.name_khoa = body.name_khoa ? toTitleCase(body.name_khoa) : null

    // ✅ Đồng bộ cột category (string, denormalized) theo categoryId — dùng
    // chung 1 nguồn tính toán với server actions để tránh lệch dữ liệu
    body.category = await resolveCourseCategoryName(categoryId)

    const updatedCourse = await prisma.course.update({
      where: { id: parseInt(id) },
      data: {
        ...body,
        courseCategory: categoryId
          ? { connect: { id: categoryId } }
          : { disconnect: true },
        ...(isAdmin ? {
          teacher: rawTeacherId
            ? { connect: { id: rawTeacherId } }
            : { disconnect: true }
        } : {}),
        teacherBankAccount: bankAccountId
          ? { connect: { id: bankAccountId } }
          : { disconnect: true }
      }
    });

    // Update accepted vouchers
    if (acceptedVoucherIds !== undefined) {
      const courseId = parseInt(id)
      await prisma.courseAcceptedVoucher.deleteMany({ where: { courseId } })
      if (acceptedVoucherIds.length > 0) {
        await prisma.courseAcceptedVoucher.createMany({
          data: acceptedVoucherIds.map((voucherId: number) => ({ courseId, voucherId }))
        })
      }
    }

    // Update award vouchers
    if (awardVoucherIds !== undefined) {
      const courseId = parseInt(id)
      await prisma.courseVoucherAward.deleteMany({ where: { courseId } })
      if (awardVoucherIds.length > 0) {
        await prisma.courseVoucherAward.createMany({
          data: awardVoucherIds.map((voucherId: number) => ({ courseId, voucherId }))
        })
      }
    }

    return NextResponse.json({ success: true, course: updatedCourse });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ✅ DELETE - Xóa khóa học (TEACHER chỉ xóa course của mình)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // ✅ Check course tồn tại + quyền xóa
    const course = await prisma.course.findUnique({
      where: { id: parseInt(id) },
      select: { teacherId: true, name_lop: true }
    });

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    // ✅ TEACHER chỉ được xóa course có teacherId = userId
    const { denied } = await requireCourseAccessApi(course.teacherId);
    if (denied) return denied;

    await prisma.course.delete({
      where: { id: parseInt(id) }
    });

    return NextResponse.json({ success: true, message: `Đã xóa khóa học "${course.name_lop}"` });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
