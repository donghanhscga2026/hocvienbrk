/**
 * Một Lesson có thể gồm nhiều "học phần" (nested playlist), mỗi phần có thể là
 * Video / Tài liệu / Văn bản. Cơ chế lưu trữ (không đổi schema):
 * - `videoUrl`: các phần Video/Docs nối nhau bằng "|", mỗi phần bọc tiền tố
 *   `[Tiêu đề]url` (video) hoặc `(Tiêu đề)url` (docs) — xem
 *   components/course/VideoPlayer.tsx#buildPlaylist (nơi thực sự render).
 * - `content`: có 2 nghĩa tùy `type`:
 *   - `type=TEXT`: toàn bộ nội dung bài học.
 *   - `type=ALL`: nội dung của 1 học phần Văn bản, luôn được player chèn làm
 *     phần ĐẦU TIÊN trong danh sách phát (không phụ thuộc thứ tự trong mảng parts).
 *   - `type=VIDEO`/`DOCS`: "mô tả thêm" hiển thị dưới video/tài liệu (không
 *     phải 1 học phần riêng trong danh sách phát).
 * - `type`: 'ALL' khi có cả học phần Văn bản lẫn Video/Docs; nếu không thì là
 *   loại duy nhất đang có (VIDEO/DOCS/TEXT).
 */

export type LessonPartType = 'VIDEO' | 'DOCS' | 'TEXT'

export interface LessonPartDraft {
    type: LessonPartType
    title: string
    value: string // URL (VIDEO/DOCS) hoặc nội dung văn bản (TEXT)
}

function parseMediaParts(videoUrl: string, fallbackType: 'VIDEO' | 'DOCS'): LessonPartDraft[] {
    return videoUrl
        .split('|')
        .map(s => s.trim())
        .filter(Boolean)
        .map((item): LessonPartDraft => {
            const videoMatch = item.match(/^\[(.*?)\](.*)$/)
            if (videoMatch) return { type: 'VIDEO', title: videoMatch[1], value: videoMatch[2].trim() }
            const docMatch = item.match(/^\((.*?)\)(.*)$/)
            if (docMatch) return { type: 'DOCS', title: docMatch[1], value: docMatch[2].trim() }
            return { type: fallbackType, title: '', value: item }
        })
}

/** Tách 1 Lesson (từ DB) thành danh sách học phần để hiển thị trong form Admin. */
export function parseLessonToParts(lesson: {
    type?: string | null
    videoUrl?: string | null
    content?: string | null
}): { parts: LessonPartDraft[]; extraDescription: string } {
    const type = lesson.type || 'VIDEO'
    const videoUrl = lesson.videoUrl || ''
    const content = lesson.content || ''

    if (type === 'TEXT') {
        return { parts: [{ type: 'TEXT', title: '', value: content }], extraDescription: '' }
    }

    const fallbackType: 'VIDEO' | 'DOCS' = type === 'DOCS' ? 'DOCS' : 'VIDEO'
    const mediaParts = videoUrl ? parseMediaParts(videoUrl, fallbackType) : []

    if (type === 'ALL') {
        const textPart: LessonPartDraft = { type: 'TEXT', title: '', value: content }
        return { parts: content ? [textPart, ...mediaParts] : mediaParts, extraDescription: '' }
    }

    return {
        parts: mediaParts.length > 0 ? mediaParts : [{ type: fallbackType, title: '', value: '' }],
        extraDescription: content,
    }
}

/** Gộp danh sách học phần (+ mô tả thêm) thành { type, videoUrl, content } để lưu vào Lesson. */
export function serializeLessonParts(
    parts: LessonPartDraft[],
    extraDescription: string
): { ok: true; type: 'VIDEO' | 'DOCS' | 'TEXT' | 'ALL'; videoUrl: string | null; content: string | null } | { ok: false; error: string } {
    const mediaParts = parts.filter(p => p.type !== 'TEXT' && p.value.trim())
    const textParts = parts.filter(p => p.type === 'TEXT' && p.value.trim())

    if (mediaParts.length === 0 && textParts.length === 0) {
        return { ok: false, error: 'Vui lòng nhập nội dung cho ít nhất 1 học phần' }
    }
    if (textParts.length > 1) {
        return { ok: false, error: 'Chỉ được có tối đa 1 học phần dạng Văn bản trong 1 bài học' }
    }

    const videoUrl = mediaParts.length > 0
        ? mediaParts
              .map((p, i) => {
                  const title = (p.title.trim() || `Phần ${i + 1}`).replace(/[[\]()]/g, '')
                  return p.type === 'DOCS' ? `(${title})${p.value.trim()}` : `[${title}]${p.value.trim()}`
              })
              .join('|')
        : null

    if (textParts.length === 1 && mediaParts.length === 0) {
        return { ok: true, type: 'TEXT', videoUrl: null, content: textParts[0].value.trim() }
    }
    if (textParts.length === 1) {
        return { ok: true, type: 'ALL', videoUrl, content: textParts[0].value.trim() }
    }
    const type = mediaParts[0].type === 'DOCS' ? 'DOCS' : 'VIDEO'
    return { ok: true, type, videoUrl, content: extraDescription.trim() || null }
}
