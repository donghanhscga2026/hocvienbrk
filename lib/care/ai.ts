/**
 * Care Engine GĐ3 — adapter AI tối thiểu cho tính năng gợi ý trả lời.
 *
 * Repo chưa có nhà cung cấp AI nào; adapter này đọc khóa từ env:
 * ưu tiên GEMINI_API_KEY (hệ sinh thái Google sẵn có của dự án), sau đó
 * OPENAI_API_KEY. Không có khóa → aiConfigured() = false và mọi tính năng
 * AI xuống cấp mềm (truy hồi vẫn chạy, UI báo "chưa cấu hình AI"),
 * tuyệt đối không ném lỗi 500 ra ngoài.
 */
import prisma from '@/lib/prisma'

/** Trần chi phí AI mặc định: 200.000đ/tháng/khóa (như demo đã duyệt). */
export const CARE_AI_MONTHLY_CAP_VND = Number(process.env.CARE_AI_MONTHLY_CAP_VND || 200_000)

export type CareAiProvider = 'gemini' | 'openai'

export function careAiProvider(): { provider: CareAiProvider; model: string; apiKey: string } | null {
  const geminiKey = process.env.GEMINI_API_KEY
  if (geminiKey) return { provider: 'gemini', model: process.env.GEMINI_MODEL || 'gemini-2.0-flash', apiKey: geminiKey }
  const openaiKey = process.env.OPENAI_API_KEY
  if (openaiKey) return { provider: 'openai', model: process.env.OPENAI_MODEL || 'gpt-4o-mini', apiKey: openaiKey }
  return null
}

export function aiConfigured(): boolean {
  return careAiProvider() != null
}

const USD_VND = 26_000
// Giá tham chiếu USD / 1 triệu token (vào, ra) — chỉ để ước lượng trần chi phí.
const PRICE_PER_MILLION: Record<CareAiProvider, { in: number; out: number }> = {
  gemini: { in: 0.1, out: 0.4 },
  openai: { in: 0.15, out: 0.6 },
}

/** Ước lượng chi phí (đồng) từ số ký tự vào/ra — token tiếng Việt ≈ ký tự / 3,5. */
export function estimateCareAiCostVnd(provider: CareAiProvider, inputChars: number, outputChars: number): number {
  const price = PRICE_PER_MILLION[provider]
  const usd = (inputChars / 3.5 / 1_000_000) * price.in + (outputChars / 3.5 / 1_000_000) * price.out
  return Math.max(1, Math.round(usd * USD_VND))
}

/** Tổng chi phí AI đã ghi nhận trong tháng hiện tại cho 1 khóa (đọc ActivityLog). */
export async function monthlyCareAiSpendVnd(courseId: number): Promise<number> {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const logs = await prisma.activityLog.findMany({
    where: {
      action: { in: ['CARE_AI_DRAFT', 'CARE_AI_QA'] },
      createdAt: { gte: monthStart },
      metadata: { path: ['courseId'], equals: courseId },
    },
    select: { metadata: true },
    take: 1000,
  })
  let total = 0
  for (const log of logs) {
    const meta = log.metadata as { estCostVnd?: unknown } | null
    if (meta && typeof meta.estCostVnd === 'number') total += meta.estCostVnd
  }
  return total
}

export class CareAiNotConfiguredError extends Error {
  constructor() {
    super('Chưa cấu hình khóa AI (GEMINI_API_KEY hoặc OPENAI_API_KEY).')
    this.name = 'CareAiNotConfiguredError'
  }
}

/** Gọi mô hình sinh văn bản; ném CareAiNotConfiguredError nếu thiếu khóa. */
export async function generateCareText(input: {
  system: string
  user: string
  maxOutputTokens?: number
}): Promise<{ text: string; provider: CareAiProvider; model: string; estCostVnd: number }> {
  const cfg = careAiProvider()
  if (!cfg) throw new CareAiNotConfiguredError()
  const maxOutputTokens = input.maxOutputTokens ?? 700
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 30_000)
  try {
    let text = ''
    if (cfg.provider === 'gemini') {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${cfg.model}:generateContent?key=${cfg.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: input.system }] },
            contents: [{ role: 'user', parts: [{ text: input.user }] }],
            generationConfig: { maxOutputTokens, temperature: 0.4 },
          }),
        },
      )
      if (!res.ok) throw new Error(`Gemini trả lỗi ${res.status}`)
      const data = (await res.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[]
      }
      text = (data.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('').trim()
    } else {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.apiKey}` },
        signal: controller.signal,
        body: JSON.stringify({
          model: cfg.model,
          temperature: 0.4,
          max_tokens: maxOutputTokens,
          messages: [
            { role: 'system', content: input.system },
            { role: 'user', content: input.user },
          ],
        }),
      })
      if (!res.ok) throw new Error(`OpenAI trả lỗi ${res.status}`)
      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
      text = (data.choices?.[0]?.message?.content || '').trim()
    }
    if (!text) throw new Error('Mô hình AI trả về nội dung rỗng.')
    return {
      text,
      provider: cfg.provider,
      model: cfg.model,
      estCostVnd: estimateCareAiCostVnd(cfg.provider, input.system.length + input.user.length, text.length),
    }
  } finally {
    clearTimeout(timer)
  }
}
