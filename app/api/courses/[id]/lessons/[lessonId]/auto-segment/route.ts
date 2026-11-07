import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireCourseAccessApi } from '@/lib/course/permissions'
import { loadLessonForSegments } from '@/lib/course/segment-access'
import { normalizeVietnamese } from '@/lib/course/segments'
import { listVideoParts } from '@/lib/course/video-parts'
import { fetchTranscriptCues, transcriptProviderConfigured } from '@/lib/course/transcript-provider'
import { aiSegmentConfigured, segmentTranscriptWithGemini } from '@/lib/course/ai-segment'
import type { RawCue } from '@/lib/course/transcript-provider'

// Thư viện bài giảng thông minh — TỰ ĐỘNG CHIA ĐOẠN cho 1 học phần video YouTube.
// Luồng: lấy lời giảng (cue đã có trong DB hoặc qua dịch vụ phụ đề) → Gemini đề
// xuất đoạn → ghi DRAFT (thay các DRAFT cũ của cùng video), KHÔNG đụng PUBLISHED.
// Chỉ ADMIN/GV của khóa. Kết quả luôn là bản nháp chờ GV duyệt ở trang segments.

export const maxDuration = 60

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string; lessonId: string }> }) {
    try {
        const { id, lessonId } = await params
        const courseId = parseInt(id)
        if (Number.isNaN(courseId)) return NextResponse.json({ error: 'Khóa học không hợp lệ' }, { status: 400 })

        const lesson = await loadLessonForSegments(courseId, lessonId)
        if (!lesson) return NextResponse.json({ error: 'Không tìm thấy bài học' }, { status: 404 })

        const { denied } = await requireCourseAccessApi(lesson.course.teacherId)
        if (denied) return denied

        const body = await request.json().catch(() => ({}))
        const videoIndex = Number.isInteger(body?.videoIndex) ? body.videoIndex : 0

        const part = listVideoParts(lesson).find(p => p.index === videoIndex)
        if (!part) return NextResponse.json({ error: 'Học phần đã chọn không phải là video' }, { status: 400 })
        if (!part.youtubeId) return NextResponse.json({ error: 'Tự động chia đoạn hiện chỉ hỗ trợ video YouTube' }, { status: 400 })

        if (!aiSegmentConfigured()) {
            return NextResponse.json({ error: 'Chưa cấu hình khóa AI (GEMINI_API_KEY) — báo quản trị viên hệ thống.' }, { status: 503 })
        }

        const publishedCount = await prisma.lessonSegment.count({
            where: { lessonId, videoIndex, status: 'PUBLISHED' },
        })
        if (publishedCount > 0) {
            return NextResponse.json({ error: 'Video này đã có đoạn ĐÃ XUẤT BẢN nên không chạy tự động ghi đè. Hãy sửa tay hoặc gỡ xuất bản trước.' }, { status: 409 })
        }

        // 1) Lời giảng: ưu tiên cue đã có sẵn trong DB, thiếu mới gọi dịch vụ phụ đề.
        let cues: RawCue[] = []
        let cueSource: 'existing' | 'provider' = 'existing'
        const existing = await prisma.transcriptCue.findMany({
            where: { lessonId, videoIndex },
            orderBy: { startSec: 'asc' },
            select: { startSec: true, endSec: true, text: true },
        })
        if (existing.length >= 10) {
            cues = existing.map(c => ({ startSec: Math.floor(c.startSec), endSec: Math.round(c.endSec), text: c.text }))
        } else {
            if (!transcriptProviderConfigured()) {
                return NextResponse.json({ error: 'Bài này chưa có lời giảng trong hệ thống và dịch vụ lấy phụ đề chưa được cấu hình (SUPADATA_API_KEY).' }, { status: 422 })
            }
            const fetched = await fetchTranscriptCues(part.youtubeId)
            if (!fetched || fetched.length < 10) {
                return NextResponse.json({ error: 'Không lấy được phụ đề của video này (video có thể chưa có phụ đề hoặc phụ đề bị tắt).' }, { status: 422 })
            }
            cues = fetched
            cueSource = 'provider'
            await prisma.$transaction([
                prisma.transcriptCue.deleteMany({ where: { lessonId, videoIndex } }),
                prisma.transcriptCue.createMany({
                    data: cues.map(c => ({
                        lessonId,
                        videoIndex,
                        startSec: c.startSec,
                        endSec: c.endSec,
                        text: c.text,
                        textNorm: normalizeVietnamese(c.text),
                    })),
                }),
            ])
        }

        // 2) AI chia đoạn → ghi DRAFT, thay toàn bộ DRAFT cũ của video này.
        let drafts
        try {
            drafts = await segmentTranscriptWithGemini(lesson.title, cues)
        } catch (e: any) {
            if (e?.message === 'GEMINI_NOT_CONFIGURED') {
                return NextResponse.json({ error: 'Chưa cấu hình khóa AI (GEMINI_API_KEY) — báo quản trị viên hệ thống.' }, { status: 503 })
            }
            return NextResponse.json({ error: e?.message || 'AI chia đoạn thất bại — thử lại sau.' }, { status: 502 })
        }

        await prisma.$transaction([
            prisma.lessonSegment.deleteMany({ where: { lessonId, videoIndex, status: 'DRAFT' } }),
            prisma.lessonSegment.createMany({
                data: drafts.map((d, i) => ({
                    lessonId,
                    videoIndex,
                    startSec: d.startSec,
                    endSec: d.endSec,
                    title: d.title,
                    summary: d.summary,
                    keywords: d.keywords,
                    order: i + 1,
                    status: 'DRAFT',
                })),
            }),
        ])
        const segments = await prisma.lessonSegment.findMany({
            where: { lessonId, videoIndex },
            orderBy: { order: 'asc' },
        })
        return NextResponse.json({ success: true, cueSource, cueCount: cues.length, segmentCount: drafts.length, segments })
    } catch (error: any) {
        console.error('Auto-segment error:', error)
        return NextResponse.json({ error: error.message || 'Lỗi khi tự động chia đoạn' }, { status: 500 })
    }
}
