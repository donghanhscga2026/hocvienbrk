import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { getCourseBrain, searchIndex } from '@/lib/care/brain'
import { aiConfigured, CARE_AI_MONTHLY_CAP_VND, generateCareText, monthlyCareAiSpendVnd } from '@/lib/care/ai'

export const dynamic = 'force-dynamic'

const qaSchema = z.object({
  courseId: z.number().int().positive(),
  lessonId: z.string().min(1).max(100).optional(),
  question: z.string().trim().min(3).max(1000),
}).strict()

/**
 * Care Engine GĐ3 — hỏi đáp phía học viên ngay trong trang học.
 * Bắt buộc đăng nhập + enrollment ACTIVE. Trả lời chỉ bám tri thức khóa
 * (BM25) kèm trích dẫn đúng bài/phút; ngoài phạm vi thì nói rõ và gợi ý
 * gửi yêu cầu hỗ trợ. Thiếu khóa AI → vẫn trả nguồn liên quan, không lỗi.
 */
export async function POST(request: Request) {
  try {
    const session = await auth()
    const userId = session?.user?.id == null ? null : Number(session.user.id)
    if (userId == null || !Number.isInteger(userId) || userId < 0) {
      return NextResponse.json({ error: 'Vui lòng đăng nhập để hỏi trợ lý khóa học.' }, { status: 401 })
    }
    const { courseId, lessonId, question } = qaSchema.parse(await request.json())
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
      select: { status: true },
    })
    if (!enrollment || enrollment.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Bạn cần đang học khóa này để dùng trợ lý hỏi đáp.' }, { status: 403 })
    }
    if (lessonId) {
      const lesson = await prisma.lesson.findFirst({ where: { id: lessonId, courseId }, select: { id: true } })
      if (!lesson) return NextResponse.json({ error: 'Bài học không thuộc khóa này.' }, { status: 400 })
    }

    const brain = await getCourseBrain(courseId)
    let hits = searchIndex(brain.index, question, 5)
    if (lessonId && hits.length > 1) {
      // Ưu tiên đoạn thuộc đúng bài đang học lên trước, giữ nguyên thứ tự điểm trong từng nhóm.
      hits = [...hits.filter(h => h.chunk.lessonId === lessonId), ...hits.filter(h => h.chunk.lessonId !== lessonId)]
    }
    const sources = hits.map(h => h.citation)

    if (!hits.length) {
      return NextResponse.json({
        answer: '',
        outOfScope: true,
        sources: [],
        aiConfigured: aiConfigured(),
        message: 'Câu hỏi này chưa có trong nội dung khóa học. Bạn có thể gửi yêu cầu hỗ trợ để giảng viên trả lời trực tiếp.',
      })
    }
    if (!aiConfigured()) {
      return NextResponse.json({
        answer: '',
        outOfScope: false,
        sources,
        aiConfigured: false,
        message: 'Trợ lý AI chưa được cấu hình trên hệ thống. Dưới đây là các đoạn bài học liên quan nhất — bạn mở đúng bài/phút đó để xem, hoặc gửi yêu cầu hỗ trợ.',
      })
    }
    const spent = await monthlyCareAiSpendVnd(courseId)
    if (spent >= CARE_AI_MONTHLY_CAP_VND) {
      return NextResponse.json({
        answer: '',
        outOfScope: false,
        sources,
        aiConfigured: true,
        capExceeded: true,
        message: 'Trợ lý AI của khóa đã chạm trần chi phí tháng này. Bạn xem các đoạn liên quan bên dưới hoặc gửi yêu cầu hỗ trợ để giảng viên trả lời.',
      })
    }

    const knowledge = hits.map((hit, i) => `[Nguồn ${i + 1}: ${hit.citation.label}]\n${hit.chunk.text}`).join('\n\n')
    const result = await generateCareText({
      system:
        'Bạn là trợ lý học tập của khóa học. Chỉ trả lời dựa trên tri thức được cung cấp, tuyệt đối không bịa. ' +
        'Trả lời tiếng Việt ngắn gọn, dễ hiểu, thân thiện. Cuối câu trả lời ghi dòng "Nguồn: " kèm nhãn nguồn đã dùng để học viên mở đúng bài/phút kiểm chứng.',
      user: `Câu hỏi của học viên: ${question}\n\nTri thức của khóa:\n${knowledge}`,
      maxOutputTokens: 600,
    })
    await prisma.activityLog.create({
      data: {
        userId,
        action: 'CARE_AI_QA',
        detail: `care-ai-qa:${courseId}`,
        metadata: { courseId, estCostVnd: result.estCostVnd, provider: result.provider, model: result.model },
      },
    })
    return NextResponse.json({ answer: result.text, outOfScope: false, sources, aiConfigured: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Câu hỏi chưa hợp lệ (3–1000 ký tự).' }, { status: 400 })
    }
    console.error('[care-qa]', error instanceof Error ? error.name : 'Unknown error')
    return NextResponse.json({ error: 'Trợ lý đang bận. Bạn thử lại sau ít phút hoặc gửi yêu cầu hỗ trợ.' }, { status: 500 })
  }
}
