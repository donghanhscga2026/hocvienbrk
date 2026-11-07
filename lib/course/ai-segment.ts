// Thư viện bài giảng thông minh — AI chia đoạn từ lời giảng (Gemini).
//
// Nguyên tắc an toàn dữ liệu: AI chỉ đề xuất MỐC BẮT ĐẦU + tiêu đề/tóm tắt/từ khóa.
// Mốc kết thúc suy ra từ mốc bắt đầu của đoạn kế tiếp (đoạn cuối = hết video),
// mốc bắt đầu được "bắt" về mốc cue gần nhất để seek chính xác. Mọi đoạn AI tạo
// đều ở trạng thái DRAFT — giáo viên duyệt mới xuất bản cho học viên.
//
// Cấu hình: env GEMINI_API_KEY (bắt buộc), GEMINI_MODEL (mặc định gemini-2.5-flash),
// GEMINI_API_BASE (chỉ để test/e2e trỏ vào máy chủ giả lập).

import type { RawCue } from './transcript-provider'

export type DraftSegment = {
    startSec: number
    endSec: number
    title: string
    summary: string | null
    keywords: string[]
}

const MIN_SEGMENT_SEC = 30
const MAX_SEGMENTS = 20

export function aiSegmentConfigured(): boolean {
    return !!process.env.GEMINI_API_KEY
}

function fmt(sec: number): string {
    const h = Math.floor(sec / 3600)
    const m = Math.floor((sec % 3600) / 60)
    const s = sec % 60
    return h > 0
        ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
        : `${m}:${String(s).padStart(2, '0')}`
}

/** Gọn lời giảng thành các dòng "[m:ss] nội dung" để đưa cho AI. */
export function buildTranscriptLines(cues: RawCue[]): string {
    return cues.map(c => `[${fmt(c.startSec)}] ${c.text}`).join('\n')
}

/**
 * Chuẩn hóa đầu ra thô của AI thành danh sách đoạn hợp lệ:
 * lọc mốc ngoài phạm vi, sắp xếp, bắt mốc về cue gần nhất (±4s), suy mốc kết thúc,
 * gộp đoạn ngắn hơn MIN_SEGMENT_SEC, giới hạn MAX_SEGMENTS đoạn.
 */
export function validateAndDeriveSegments(raw: any, cues: RawCue[]): DraftSegment[] {
    if (!cues.length) return []
    const duration = cues[cues.length - 1].endSec
    const items: any[] = Array.isArray(raw?.segments) ? raw.segments : Array.isArray(raw) ? raw : []

    type Start = { startSec: number; title: string; summary: string | null; keywords: string[] }
    const starts: Start[] = []
    for (const it of items) {
        let startSec = Number(it?.startSec)
        if (!Number.isFinite(startSec)) continue
        startSec = Math.floor(startSec)
        if (startSec < 0 || startSec >= duration) continue
        // Bắt mốc về cue gần nhất trong ±4 giây để seek khớp biên câu.
        let best = startSec, bestDiff = 5
        for (const c of cues) {
            const d = Math.abs(c.startSec - startSec)
            if (d < bestDiff) { best = c.startSec; bestDiff = d }
        }
        startSec = best
        const title = String(it?.title ?? '').replace(/\s+/g, ' ').trim().slice(0, 120)
        if (!title) continue
        const summaryRaw = String(it?.summary ?? '').replace(/\s+/g, ' ').trim().slice(0, 400)
        const keywords = Array.isArray(it?.keywords)
            ? it.keywords.map((k: any) => String(k).replace(/\s+/g, ' ').trim().slice(0, 40)).filter(Boolean).slice(0, 6)
            : []
        starts.push({ startSec, title, summary: summaryRaw || null, keywords })
    }
    starts.sort((a, b) => a.startSec - b.startSec)

    // Khử mốc trùng/quá gần nhau (<5s): giữ mốc đầu tiên.
    const deduped: Start[] = []
    for (const s of starts) {
        if (deduped.length && s.startSec - deduped[deduped.length - 1].startSec < 5) continue
        deduped.push(s)
    }
    if (!deduped.length) return []
    // Đoạn đầu tiên luôn bắt đầu từ đầu video/phần lời giảng đầu tiên.
    deduped[0].startSec = Math.min(deduped[0].startSec, cues[0].startSec)

    // Suy mốc kết thúc + gộp đoạn quá ngắn vào đoạn trước (đoạn đầu ngắn → gộp vào đoạn sau).
    let segments: DraftSegment[] = deduped.map((s, i) => ({
        ...s,
        endSec: i + 1 < deduped.length ? deduped[i + 1].startSec : duration,
    }))
    segments = segments.filter((s, i) => {
        if (segments.length <= 2) return true
        if (s.endSec - s.startSec >= MIN_SEGMENT_SEC) return true
        if (i === 0) { segments[1].startSec = s.startSec; return false }
        segments[i - 1].endSec = s.endSec
        return false
    })
    // Giới hạn số đoạn: gộp đoạn ngắn nhất vào đoạn kề ngắn hơn cho tới khi đạt giới hạn.
    while (segments.length > MAX_SEGMENTS) {
        let idx = 0, minLen = Infinity
        for (let i = 0; i < segments.length; i++) {
            const len = segments[i].endSec - segments[i].startSec
            if (len < minLen) { minLen = len; idx = i }
        }
        if (idx === 0) { segments[1].startSec = segments[0].startSec; segments.splice(0, 1) }
        else { segments[idx - 1].endSec = segments[idx].endSec; segments.splice(idx, 1) }
    }
    return segments.filter(s => s.endSec > s.startSec)
}

function buildPrompt(lessonTitle: string, cues: RawCue[]): string {
    const duration = cues[cues.length - 1].endSec
    return [
        `Bạn là trợ lý biên tập bài giảng tiếng Việt. Dưới đây là lời giảng (transcript) của video "${lessonTitle}", tổng thời lượng ${fmt(duration)}. Mỗi dòng bắt đầu bằng mốc thời gian [m:ss] của câu nói.`,
        '',
        'Hãy chia video thành các đoạn theo mạch nội dung (thường 5–15 đoạn cho video dưới 1 giờ, tối đa 20 đoạn). Mỗi đoạn là một chủ đề/ý chính liền mạch.',
        '',
        'Trả về DUY NHẤT một JSON đúng cấu trúc sau, không thêm chữ nào ngoài JSON:',
        '{"segments":[{"startSec":0,"title":"Tiêu đề đoạn ngắn gọn, có nghĩa","summary":"Tóm tắt 1–2 câu nội dung đoạn","keywords":["từ khóa 1","từ khóa 2"]}]}',
        '',
        'Quy tắc:',
        '- startSec là giây bắt đầu đoạn, phải trùng mốc thời gian của một dòng trong transcript; đoạn đầu tiên bắt đầu ở 0.',
        '- Tiêu đề tiếng Việt, tối đa ~12 từ, phản ánh đúng nội dung đoạn; không đánh số đoạn trong tiêu đề.',
        '- Tóm tắt 1–2 câu tiếng Việt; từ khóa 3–6 cụm ngắn, viết thường.',
        '- Chỉ dùng nội dung có thật trong transcript, không bịa thêm.',
        '',
        'TRANSCRIPT:',
        buildTranscriptLines(cues),
    ].join('\n')
}

/** Gọi Gemini chia đoạn. Ném lỗi 'GEMINI_NOT_CONFIGURED' khi chưa có khóa; lỗi khác → Error thường. */
export async function segmentTranscriptWithGemini(lessonTitle: string, cues: RawCue[]): Promise<DraftSegment[]> {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) throw new Error('GEMINI_NOT_CONFIGURED')
    const base = (process.env.GEMINI_API_BASE || 'https://generativelanguage.googleapis.com').replace(/\/$/, '')
    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash'

    const res = await fetch(`${base}/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
            contents: [{ parts: [{ text: buildPrompt(lessonTitle, cues) }] }],
            generationConfig: { responseMimeType: 'application/json', temperature: 0.3 },
        }),
    })
    if (!res.ok) {
        const detail = await res.text().catch(() => '')
        throw new Error(`Gemini lỗi ${res.status}: ${detail.slice(0, 200)}`)
    }
    const data: any = await res.json()
    const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text || '').join('') || ''
    let parsed: any
    try {
        parsed = JSON.parse(text)
    } catch {
        throw new Error('AI trả về dữ liệu không đọc được — thử chạy lại.')
    }
    const segments = validateAndDeriveSegments(parsed, cues)
    if (!segments.length) throw new Error('AI không đề xuất được đoạn nào từ lời giảng này.')
    return segments
}
