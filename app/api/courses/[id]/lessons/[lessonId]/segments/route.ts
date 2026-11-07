import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireCourseAccessApi } from '@/lib/course/permissions'
import { parseSegmentInput } from '@/lib/course/segments'
import { loadLessonForSegments, resolveSegmentAccess } from '@/lib/course/segment-access'

// Thư viện bài giảng thông minh (GĐ1)
// GET: học viên (Enrollment ACTIVE) chỉ thấy đoạn PUBLISHED + tiến độ của mình;
//      ADMIN/GV của khóa thấy mọi trạng thái để duyệt.
// POST: chỉ ADMIN/GV của khóa — tạo đoạn (mặc định DRAFT).

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string; lessonId: string }> }) {
    try {
        const { id, lessonId } = await params
        const courseId = parseInt(id)
        if (Number.isNaN(courseId)) return NextResponse.json({ error: 'Khóa học không hợp lệ' }, { status: 400 })

        const lesson = await loadLessonForSegments(courseId, lessonId)
        if (!lesson) return NextResponse.json({ error: 'Không tìm thấy bài học' }, { status: 404 })

        const access = await resolveSegmentAccess(courseId, lesson.course.teacherId)
        if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const segments = await prisma.lessonSegment.findMany({
            where: {
                lessonId,
                ...(access.isManager ? {} : { status: 'PUBLISHED' }),
            },
            orderBy: [{ videoIndex: 'asc' }, { order: 'asc' }],
        })

        let segmentProgress: { segmentId: string; watchedSec: number; completed: boolean }[] = []
        if (access.enrollmentId != null) {
            segmentProgress = await prisma.segmentProgress.findMany({
                where: { enrollmentId: access.enrollmentId, segment: { lessonId } },
                select: { segmentId: true, watchedSec: true, completed: true },
            })
        }

        return NextResponse.json({ success: true, canManage: access.isManager, segments, segmentProgress })
    } catch (error: any) {
        console.error('Get segments error:', error)
        return NextResponse.json({ error: error.message || 'Lỗi khi tải danh sách đoạn' }, { status: 500 })
    }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string; lessonId: string }> }) {
    try {
        const { id, lessonId } = await params
        const courseId = parseInt(id)
        if (Number.isNaN(courseId)) return NextResponse.json({ error: 'Khóa học không hợp lệ' }, { status: 400 })

        const lesson = await loadLessonForSegments(courseId, lessonId)
        if (!lesson) return NextResponse.json({ error: 'Không tìm thấy bài học' }, { status: 404 })

        const { denied } = await requireCourseAccessApi(lesson.course.teacherId)
        if (denied) return denied

        const body = await request.json()
        const parsed = parseSegmentInput(body, false)
        if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 })
        const data = parsed.data

        // Chốt chặn riêng cho cặp mốc khi tạo mới (đã có đủ cả 2 mốc)
        if (data.endSec! <= data.startSec!) {
            return NextResponse.json({ error: 'Mốc kết thúc phải lớn hơn mốc bắt đầu' }, { status: 400 })
        }

        let order = data.order ?? null
        if (order === null) {
            const last = await prisma.lessonSegment.findFirst({
                where: { lessonId, videoIndex: data.videoIndex! },
                orderBy: { order: 'desc' },
                select: { order: true },
            })
            order = (last?.order ?? 0) + 1
        }

        const segment = await prisma.lessonSegment.create({
            data: {
                lessonId,
                videoIndex: data.videoIndex!,
                startSec: data.startSec!,
                endSec: data.endSec!,
                title: data.title!,
                summary: data.summary ?? null,
                keywords: data.keywords ?? [],
                order,
                status: data.status ?? 'DRAFT',
            },
        })

        return NextResponse.json({ success: true, segment })
    } catch (error: any) {
        console.error('Create segment error:', error)
        return NextResponse.json({ error: error.message || 'Lỗi khi tạo đoạn' }, { status: 500 })
    }
}
