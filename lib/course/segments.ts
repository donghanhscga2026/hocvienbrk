// Thư viện bài giảng thông minh (GĐ1) — tiện ích dùng chung cho đoạn bài giảng.
// Pipeline STT/AI ở giai đoạn sau sẽ import từ đây để ghi LessonSegment dạng
// DRAFT và TranscriptCue kèm textNorm, rồi GV duyệt qua cùng API/UI này.

/** Bỏ dấu tiếng Việt + hạ thường — dùng cho TranscriptCue.textNorm để tìm kiếm không dấu. */
export function normalizeVietnamese(input: string): string {
    return input
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim()
}

/** Nhận "mm:ss", "h:mm:ss" hoặc số giây thuần ("2700") → giây. Trả về null nếu sai định dạng. */
export function parseTimeInput(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value >= 0 ? Math.floor(value) : null
    }
    if (typeof value !== 'string') return null
    const trimmed = value.trim()
    if (!trimmed) return null
    if (/^\d+$/.test(trimmed)) return parseInt(trimmed, 10)
    const parts = trimmed.split(':')
    if (parts.length < 2 || parts.length > 3) return null
    if (!parts.every(p => /^\d{1,3}$/.test(p))) return null
    const nums = parts.map(p => parseInt(p, 10))
    // mm:ss: chỉ phần giây < 60 (phần phút có thể ≥ 60 với video dài, ví dụ 75:00).
    // h:mm:ss: cả phần phút và phần giây đều < 60.
    if (parts.length === 2 && nums[1] >= 60) return null
    if (parts.length === 3 && (nums[1] >= 60 || nums[2] >= 60)) return null
    return nums.reduce((acc, n) => acc * 60 + n, 0)
}

/** Giây → "m:ss" hoặc "h:mm:ss" để hiển thị mốc giờ đoạn. */
export function formatSegmentTime(totalSec: number): string {
    const sec = Math.max(0, Math.floor(totalSec))
    const h = Math.floor(sec / 3600)
    const m = Math.floor((sec % 3600) / 60)
    const s = sec % 60
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    return `${m}:${String(s).padStart(2, '0')}`
}

export type SegmentInput = {
    videoIndex: number
    startSec: number
    endSec: number
    title: string
    summary: string | null
    keywords: string[]
    order: number | null
    status: 'DRAFT' | 'PUBLISHED'
}

/** Chuẩn hóa + kiểm tra dữ liệu đoạn từ request body. `partial` = cho phép thiếu trường (PATCH). */
export function parseSegmentInput(body: any, partial: boolean): { data: Partial<SegmentInput> } | { error: string } {
    const data: Partial<SegmentInput> = {}

    if (!partial || body.videoIndex !== undefined) {
        const v = body.videoIndex === undefined ? 0 : Number(body.videoIndex)
        if (!Number.isInteger(v) || v < 0) return { error: 'videoIndex phải là số nguyên ≥ 0' }
        data.videoIndex = v
    }

    const hasStart = body.startSec !== undefined || body.start !== undefined
    const hasEnd = body.endSec !== undefined || body.end !== undefined
    if (!partial || hasStart) {
        const v = parseTimeInput(body.startSec !== undefined ? body.startSec : body.start)
        if (v === null) return { error: 'Mốc bắt đầu không hợp lệ (dùng mm:ss hoặc số giây)' }
        data.startSec = v
    }
    if (!partial || hasEnd) {
        const v = parseTimeInput(body.endSec !== undefined ? body.endSec : body.end)
        if (v === null) return { error: 'Mốc kết thúc không hợp lệ (dùng mm:ss hoặc số giây)' }
        data.endSec = v
    }
    if (data.startSec !== undefined && data.endSec !== undefined && data.endSec <= data.startSec) {
        return { error: 'Mốc kết thúc phải lớn hơn mốc bắt đầu' }
    }

    if (!partial || body.title !== undefined) {
        const title = typeof body.title === 'string' ? body.title.trim() : ''
        if (!title) return { error: 'Tiêu đề đoạn là bắt buộc' }
        data.title = title
    }

    if (body.summary !== undefined) {
        data.summary = typeof body.summary === 'string' && body.summary.trim() ? body.summary.trim() : null
    } else if (!partial) {
        data.summary = null
    }

    if (body.keywords !== undefined) {
        if (Array.isArray(body.keywords)) {
            data.keywords = body.keywords.map((k: any) => String(k).trim()).filter(Boolean)
        } else if (typeof body.keywords === 'string') {
            data.keywords = body.keywords.split(',').map((k: string) => k.trim()).filter(Boolean)
        } else {
            return { error: 'Từ khóa phải là danh sách hoặc chuỗi cách nhau dấu phẩy' }
        }
    } else if (!partial) {
        data.keywords = []
    }

    if (body.order !== undefined && body.order !== null) {
        const v = Number(body.order)
        if (!Number.isInteger(v) || v < 0) return { error: 'Thứ tự đoạn phải là số nguyên ≥ 0' }
        data.order = v
    } else if (!partial) {
        data.order = null // null = server tự gán cuối danh sách
    }

    if (body.status !== undefined) {
        if (body.status !== 'DRAFT' && body.status !== 'PUBLISHED') {
            return { error: 'Trạng thái đoạn chỉ gồm DRAFT hoặc PUBLISHED' }
        }
        data.status = body.status
    } else if (!partial) {
        data.status = 'DRAFT'
    }

    return { data }
}
