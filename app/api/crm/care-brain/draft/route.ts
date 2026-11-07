import { z } from 'zod'
import prisma from '@/lib/prisma'
import { getCrmActor } from '@/lib/crm/auth'
import { crmBody, crmFailure, crmResponse } from '@/lib/crm/http'
import { CrmError } from '@/lib/crm/service'
import { careScopeCourseIds } from '@/lib/care/queue'
import { getCourseBrain, searchIndex } from '@/lib/care/brain'
import {
  aiConfigured,
  CARE_AI_MONTHLY_CAP_VND,
  estimateCareAiCostVnd,
  generateCareText,
  monthlyCareAiSpendVnd,
} from '@/lib/care/ai'
export const dynamic = 'force-dynamic'

const draftSchema = z.object({ requestId: z.string().min(1).max(64) }).strict()

/**
 * AI gợi ý trả lời cho 1 yêu cầu CRM: truy hồi tri thức khóa (BM25),
 * soạn NHÁP bám đoạn trích + ghi nguồn. Tuyệt đối không tự gửi —
 * giảng viên bấm "Dùng nháp này" đổ vào ô trả lời và tự gửi như thường lệ.
 * Thiếu khóa AI / vượt trần → trả cờ mềm kèm nguồn truy hồi, không lỗi 500.
 */
export async function POST(request: Request) {
  try {
    const actor = await getCrmActor()
    const { requestId } = draftSchema.parse(await crmBody(request, 4096))
    const req = await prisma.crmRequest.findUnique({
      where: { id: requestId },
      select: { id: true, content: true, name: true, courseId: true, lessonId: true },
    })
    if (!req) throw new CrmError('Không tìm thấy yêu cầu.', 404)
    if (req.courseId == null) {
      return crmResponse({
        requestId, courseId: null, aiConfigured: aiConfigured(), draft: '', sources: [],
        notice: 'Yêu cầu này chưa gắn khóa học nên chưa có tri thức để AI bám vào. Hãy trả lời thủ công.',
      })
    }
    const scope = await careScopeCourseIds(actor)
    if (scope && !scope.includes(req.courseId)) {
      throw new CrmError('Yêu cầu nằm ngoài phạm vi phụ trách của bạn.', 403)
    }

    const brain = await getCourseBrain(req.courseId)
    const hits = searchIndex(brain.index, req.content, 5)
    const sources = hits.map(hit => hit.citation)
    const base = { requestId, courseId: req.courseId, brain: brain.stats, sources }

    if (!hits.length) {
      return crmResponse({
        ...base, aiConfigured: aiConfigured(), draft: '',
        notice: 'Chưa tìm thấy đoạn tri thức nào trong khóa đủ liên quan tới câu hỏi này. Nên trả lời thủ công hoặc biên dịch lại tri thức khóa.',
      })
    }
    if (!aiConfigured()) {
      return crmResponse({
        ...base, aiConfigured: false, draft: '',
        notice: 'Chưa cấu hình khóa AI (GEMINI_API_KEY hoặc OPENAI_API_KEY) nên chưa soạn được nháp. Các nguồn liên quan nhất đã được liệt kê để giảng viên tự trả lời.',
      })
    }

    const spent = await monthlyCareAiSpendVnd(req.courseId)
    const estCost = estimateCareAiCostVnd('gemini', req.content.length + hits.reduce((s, h) => s + h.chunk.text.length, 0), 1500)
    if (spent + estCost > CARE_AI_MONTHLY_CAP_VND) {
      return crmResponse({
        ...base, aiConfigured: true, draft: '', capExceeded: true, spentVnd: spent, capVnd: CARE_AI_MONTHLY_CAP_VND,
        notice: `Đã chạm trần chi phí AI tháng này của khóa (${spent.toLocaleString('vi-VN')}đ / ${CARE_AI_MONTHLY_CAP_VND.toLocaleString('vi-VN')}đ). AI tạm dừng soạn nháp cho khóa này tới tháng sau.`,
      })
    }

    const knowledge = hits
      .map((hit, i) => `[Nguồn ${i + 1}: ${hit.citation.label}]\n${hit.chunk.text}`)
      .join('\n\n')
    const result = await generateCareText({
      system:
        'Bạn là trợ lý soạn nháp trả lời cho giảng viên khóa học trực tuyến. Chỉ dùng tri thức được cung cấp, không bịa thêm. ' +
        'Viết tiếng Việt thân thiện, xưng hô phù hợp, trả lời đúng trọng tâm câu hỏi. Cuối nháp ghi dòng "Nguồn: " liệt kê các nguồn đã dùng theo đúng nhãn được cấp. ' +
        'Đây chỉ là bản nháp để giảng viên duyệt, không phải tin nhắn gửi đi.',
      user: `Học viên ${req.name} hỏi:\n${req.content}\n\nTri thức của khóa:\n${knowledge}\n\nHãy soạn nháp trả lời.`,
    })

    await prisma.activityLog.create({
      data: {
        userId: actor.id,
        action: 'CARE_AI_DRAFT',
        detail: `care-ai-draft:${req.id}`,
        metadata: { courseId: req.courseId, requestId: req.id, estCostVnd: result.estCostVnd, provider: result.provider, model: result.model },
      },
    })

    return crmResponse({
      ...base,
      aiConfigured: true,
      draft: result.text,
      estCostVnd: result.estCostVnd,
      spentVnd: spent + result.estCostVnd,
      capVnd: CARE_AI_MONTHLY_CAP_VND,
    })
  } catch (error) {
    return crmFailure(error)
  }
}
