import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireCourseAccessApi } from '@/lib/course/permissions'
import { parseSegmentInput } from '@/lib/course/segments'
import { loadLessonForSegments } from '@/lib/course/segment-access'

// Thư viện bài giảng thông minh (GĐ1) — sửa/xóa 1 đoạn. Chỉ ADMIN/GV của khóa.
// PATCH nhận cả đổi trạng thái DRAFT/PUBLISHED và đổi thứ tự (order) để sắp xếp.

async function loadSegment(courseId: number, lessonId: string, segmentId: string) {
    const lesson = await loadLessonForSegments(courseId, lessonId)
    if (!lesson) return { lesson: null, segment: null }
    const segment = await prisma.lessonSegment.findUnique({ where: { id: segmentId } })
    if (!segment || segment.lessonId !== lessonId) return { lesson, segment: null }
    return { lesson, segment }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; lessonId: string; segmentId: string }> }) {
    try {
        const { id, lessonId, segmentId } = await params
        const courseId = parseInt(id)
        if (Number.isNaN(courseId)) return NextResponse.json({ error: 'Khóa học không hợp lệ' }, { status: 400 })

        const { lesson, segment } = await loadSegment(courseId, lessonId, segmentId)
        if (!lesson || !segment) return NextResponse.json({ error: 'Không tìm thấy đoạn' }, { status: 404 })

        const { denied } = await requireCourseAccessApi(lesson.course.teacherId)
        if (denied) return denied

        const body = await request.json()
        const parsed = parseSegmentInput(body, true)
        if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 })
        const data = parsed.data

        // Kiểm tra cặp mốc sau khi gộp với giá trị hiện tại
        const nextStart = data.startSec ?? segment.startSec
        const nextEnd = data.endSec ?? segment.endSec
        if (nextEnd <= nextStart) {
            return NextResponse.json({ error: 'Mốc kết thúc phải lớn hơn mốc bắt đầu' }, { status: 400 })
        }

        const updated = await prisma.lessonSegment.update({
            where: { id: segmentId },
            data: {
                ...(data.videoIndex !== undefined ? { videoIndex: data.videoIndex } : {}),
                ...(data.startSec !== undefined ? { startSec: data.startSec } : {}),
                ...(data.endSec !== undefined ? { endSec: data.endSec } : {}),
                ...(data.title !== undefined ? { title: data.title } : {}),
                ...(data.summary !== undefined ? { summary: data.summary } : {}),
                ...(data.keywords !== undefined ? { keywords: data.keywords } : {}),
                ...(data.order !== undefined && data.order !== null ? { order: data.order } : {}),
                ...(data.status !== undefined ? { status: data.status } : {}),
            },
        })

        return NextResponse.json({ success: true, segment: updated })
    } catch (error: any) {
        console.error('Update segment error:', error)
        return NextResponse.json({ error: error.message || 'Lỗi khi cập nhật đoạn' }, { status: 500 })
    }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string; lessonId: string; segmentId: string }> }) {
    try {
        const { id, lessonId, segmentId } = await params
        const courseId = parseInt(id)
        if (Number.isNaN(courseId)) return NextResponse.json({ error: 'Khóa học không hợp lệ' }, { status: 400 })

        const { lesson, segment } = await loadSegment(courseId, lessonId, segmentId)
        if (!lesson || !segment) return NextResponse.json({ error: 'Không tìm thấy đoạn' }, { status: 404 })

        const { denied } = await requireCourseAccessApi(lesson.course.teacherId)
        if (denied) return denied

        await prisma.lessonSegment.delete({ where: { id: segmentId } })
        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Delete segment error:', error)
        return NextResponse.json({ error: error.message || 'Lỗi khi xóa đoạn' }, { status: 500 })
    }
}
