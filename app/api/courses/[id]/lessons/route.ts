import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import prisma from '@/lib/prisma'
import { requireCourseAccessApi } from '@/lib/course/permissions'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
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
        const { denied } = await requireCourseAccessApi(course.teacherId)
        if (denied) return denied

        const body = await request.json()
        const { title, videoUrl, order, type, content, isDailyChallenge } = body

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
                content: content || null,
                isDailyChallenge: isDailyChallenge ?? false
            }
        })

        await prisma.course.update({
            where: { id: courseId },
            data: { updatedAt: new Date() }
        })

        revalidatePath('/')

        return NextResponse.json({ success: true, lesson })
    } catch (error: any) {
        console.error('Create lesson error:', error)
        return NextResponse.json({ error: error.message || 'Lỗi khi tạo bài học' }, { status: 500 })
    }
}
