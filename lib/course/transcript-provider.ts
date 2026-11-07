// Thư viện bài giảng thông minh — lấy lời giảng (phụ đề) của video YouTube.
//
// Đã kiểm chứng 07/11/2026: YouTube chặn IP máy chủ (cả VM dev lẫn Vercel đều
// nhận LOGIN_REQUIRED "xác nhận bạn không phải robot") nên web KHÔNG tự tải
// phụ đề trực tiếp từ YouTube được. Phải qua dịch vụ lấy phụ đề chuyên dụng
// (Supadata) có hạ tầng riêng — cấu hình bằng env SUPADATA_API_KEY.
// SUPADATA_API_BASE chỉ để test/e2e trỏ vào máy chủ giả lập.

export type RawCue = { startSec: number; endSec: number; text: string }

export function transcriptProviderConfigured(): boolean {
    return !!process.env.SUPADATA_API_KEY
}

/**
 * Lấy danh sách cue của 1 video YouTube qua Supadata.
 * Trả về null khi dịch vụ lỗi/không có phụ đề; ném lỗi khi chưa cấu hình khóa.
 * Ưu tiên phụ đề tiếng Việt; không có thì lấy ngôn ngữ đầu tiên dịch vụ có.
 */
export async function fetchTranscriptCues(videoId: string): Promise<RawCue[] | null> {
    const apiKey = process.env.SUPADATA_API_KEY
    if (!apiKey) throw new Error('SUPADATA_NOT_CONFIGURED')
    const base = (process.env.SUPADATA_API_BASE || 'https://api.supadata.ai').replace(/\/$/, '')

    for (const lang of ['vi', '']) {
        const qs = new URLSearchParams({ id: videoId, text: 'false' })
        if (lang) qs.set('lang', lang)
        let res: Response
        try {
            res = await fetch(`${base}/v1/youtube/transcript?${qs.toString()}`, {
                headers: { 'x-api-key': apiKey },
            })
        } catch {
            return null
        }
        if (res.status === 404) continue // không có phụ đề ở ngôn ngữ này → thử ngôn ngữ mặc định
        if (!res.ok) return null
        const data: any = await res.json().catch(() => null)
        const items: any[] = Array.isArray(data?.content) ? data.content : []
        const cues: RawCue[] = []
        for (const it of items) {
            const text = String(it?.text ?? '').replace(/\s+/g, ' ').trim()
            if (!text) continue
            // Supadata trả offset/duration theo mili-giây.
            const startSec = Math.max(0, Math.floor(Number(it?.offset ?? 0) / 1000))
            const durSec = Math.max(1, Math.round(Number(it?.duration ?? 0) / 1000))
            cues.push({ startSec, endSec: startSec + durSec, text })
        }
        if (cues.length > 0) {
            cues.sort((a, b) => a.startSec - b.startSec)
            return cues
        }
    }
    return null
}
