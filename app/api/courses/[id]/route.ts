import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';
import { Role } from '@prisma/client';

// ✅ GET - TEACHER chỉ thấy course có teacherId = userId
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = session.user.role === Role.ADMIN;
    const userId = parseInt(session.user.id);

    const { id } = await params;
    const course = await prisma.course.findUnique({
      where: { id: parseInt(id) },
      include: {
        lessons: {
          orderBy: { order: 'asc' }
        },
        teacher: true
      }
    });

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    // ✅ TEACHER chỉ được xem course có teacherId = userId
    if (!isAdmin && course.teacherId !== userId) {
      return NextResponse.json({ error: 'Forbidden: You can only view your own courses' }, { status: 403 });
    }

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
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = session.user.role === Role.ADMIN;
    const userId = parseInt(session.user.id);

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
    if (!isAdmin && course.teacherId !== userId) {
      return NextResponse.json({ error: 'Forbidden: You can only edit your own courses' }, { status: 403 });
    }

    // ✅ TEACHER không được thay đổi teacherId
    if (!isAdmin && body.teacherId != null) {
      delete body.teacherId;
    }

    const updatedCourse = await prisma.course.update({
      where: { id: parseInt(id) },
      data: body
    });

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
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = session.user.role === Role.ADMIN;
    const userId = parseInt(session.user.id);

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
    if (!isAdmin && course.teacherId !== userId) {
      return NextResponse.json({ error: 'Forbidden: You can only delete your own courses' }, { status: 403 });
    }

    await prisma.course.delete({
      where: { id: parseInt(id) }
    });

    return NextResponse.json({ success: true, message: `Đã xóa khóa học "${course.name_lop}"` });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
