import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { auth } from '@/auth'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const isAdmin = session.user.role === 'ADMIN'
        const userId = parseInt(session.user.id)
        const courseId = parseInt((await params).id)

        // ✅ Check course exists + permission
        const course = await prisma.course.findUnique({
            where: { id: courseId },
            select: { teacherId: true }
        })

        if (!course) {
            return NextResponse.json({ error: "Không tìm thấy khóa học" }, { status: 404 })
        }

        // ✅ TEACHER only can add lesson to own course
        if (!isAdmin && course.teacherId !== userId) {
            return NextResponse.json({ error: "Bạn không có quyền" }, { status: 403 })
        }

        const body = await request.json()
        const { title, videoUrl, order, type, content } = body

        if (!title?.trim()) {
            return NextResponse.json({ error: "Tiêu đề là bắt buộc" }, { status: 400 })
        }

        // ✅ Check unique order in this course
        const existingLesson = await prisma.lesson.findFirst({
            where: { courseId, order: parseInt(order) }
        })

        if (existingLesson) {
            return NextResponse.json({ error: `Bài học thứ tự ${order} đã tồn tại` }, { status: 400 })
        }

        const lesson = await prisma.lesson.create({
            data: {
                courseId,
                title,
                videoUrl: videoUrl || null,
                order: parseInt(order) || 1,
                type: type as any || 'VIDEO',
                content: content || null
            }
        })

        return NextResponse.json({ success: true, lesson })
    } catch (error: any) {
        console.error('Create lesson error:', error)
        return NextResponse.json({ error: error.message || 'Lỗi khi tạo bài học' }, { status: 500 })
    }
}
