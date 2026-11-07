import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { loadLessonForSegments, resolveSegmentAccess } from '@/lib/course/segment-access'

// Thư viện bài giảng thông minh (GĐ1) — lưu tiến độ xem theo đoạn.
// Chỉ học viên có Enrollment ACTIVE (tiến độ gắn với enrollment của chính họ).
// watchedSec chỉ tăng (lấy max), completed một khi đã đạt thì giữ nguyên.

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string; lessonId: string }> }) {
    try {
        const { id, lessonId } = await params
        const courseId = parseInt(id)
        if (Number.isNaN(courseId)) return NextResponse.json({ error: 'Khóa học không hợp lệ' }, { status: 400 })

        const lesson = await loadLessonForSegments(courseId, lessonId)
        if (!lesson) return NextResponse.json({ error: 'Không tìm thấy bài học' }, { status: 404 })

        const access = await resolveSegmentAccess(courseId, lesson.course.teacherId)
        if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        if (access.enrollmentId == null) {
            // GV/admin xem thử trang học không có enrollment — bỏ qua lặng lẽ để
            // giao diện không báo lỗi, tiến độ chỉ có ý nghĩa với học viên thật.
            return NextResponse.json({ success: true, skipped: true })
        }

        const body = await request.json()
        const segmentId = typeof body.segmentId === 'string' ? body.segmentId : ''
        const watchedSec = Number(body.watchedSec)
        const completed = body.completed === true
        if (!segmentId || !Number.isFinite(watchedSec) || watchedSec < 0) {
            return NextResponse.json({ error: 'Dữ liệu tiến độ không hợp lệ' }, { status: 400 })
        }

        const segment = await prisma.lessonSegment.findUnique({
            where: { id: segmentId },
            select: { id: true, lessonId: true, startSec: true, endSec: true },
        })
        if (!segment || segment.lessonId !== lessonId) {
            return NextResponse.json({ error: 'Không tìm thấy đoạn' }, { status: 404 })
        }

        const segmentLength = Math.max(1, segment.endSec - segment.startSec)
        const clampedWatched = Math.min(watchedSec, segmentLength)

        const existing = await prisma.segmentProgress.findUnique({
            where: { enrollmentId_segmentId: { enrollmentId: access.enrollmentId, segmentId } },
            select: { watchedSec: true, completed: true },
        })

        const progress = await prisma.segmentProgress.upsert({
            where: { enrollmentId_segmentId: { enrollmentId: access.enrollmentId, segmentId } },
            create: {
                enrollmentId: access.enrollmentId,
                segmentId,
                watchedSec: clampedWatched,
                completed,
            },
            update: {
                watchedSec: Math.max(existing?.watchedSec ?? 0, clampedWatched),
                completed: (existing?.completed ?? false) || completed,
            },
        })

        return NextResponse.json({ success: true, progress })
    } catch (error: any) {
        console.error('Save segment progress error:', error)
        return NextResponse.json({ error: error.message || 'Lỗi khi lưu tiến độ đoạn' }, { status: 500 })
    }
}
