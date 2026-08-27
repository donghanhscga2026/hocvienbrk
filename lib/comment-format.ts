/**
 * Định dạng nhẹ cho nội dung bình luận — KHÔNG dùng WYSIWYG/HTML thô để tránh
 * rủi ro XSS. Người dùng gõ cú pháp đơn giản qua toolbar (không cần nhớ cú
 * pháp thủ công), lưu nguyên dạng text vào DB, và chỉ parse ra HTML AN TOÀN
 * lúc hiển thị — mọi ký tự khác đều được escape trước, chỉ các pattern do
 * chính hàm insertX() bên dưới tạo ra mới được nhận diện & render thành thẻ.
 *
 * Cú pháp:
 *   **chữ đậm**
 *   {{c:tên_màu}}chữ có màu{{/c}}   — tên_màu chỉ nhận trong COLOR_MAP
 *   {{s:sm|lg}}chữ cỡ nhỏ/lớn{{/s}}
 */

export const COLOR_PRESETS: { key: string; label: string; hex: string }[] = [
    { key: 'red', label: 'Đỏ', hex: '#ef4444' },
    { key: 'orange', label: 'Cam', hex: '#f97316' },
    { key: 'yellow', label: 'Vàng', hex: '#eab308' },
    { key: 'green', label: 'Xanh lá', hex: '#22c55e' },
    { key: 'blue', label: 'Xanh dương', hex: '#3b82f6' },
    { key: 'purple', label: 'Tím', hex: '#a855f7' },
]

const COLOR_MAP: Record<string, string> = Object.fromEntries(COLOR_PRESETS.map(c => [c.key, c.hex]))

export const SIZE_PRESETS: { key: 'sm' | 'lg'; label: string; className: string }[] = [
    { key: 'sm', label: 'Nhỏ', className: 'text-[11px]' },
    { key: 'lg', label: 'Lớn', className: 'text-lg' },
]

const SIZE_MAP: Record<string, string> = Object.fromEntries(SIZE_PRESETS.map(s => [s.key, s.className]))

function escapeHtml(raw: string): string {
    return raw
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
}

/** Chuyển text (có thể chứa cú pháp định dạng ở trên) thành HTML an toàn để render. */
export function formatCommentContent(raw: string): string {
    let html = escapeHtml(raw)

    // Xuống dòng
    html = html.replace(/\n/g, '<br/>')

    // Màu chữ — chỉ nhận key nằm trong COLOR_MAP, không cho chèn CSS tuỳ ý
    html = html.replace(/\{\{c:([a-z]+)\}\}([\s\S]*?)\{\{\/c\}\}/g, (match, key, inner) => {
        const hex = COLOR_MAP[key]
        return hex ? `<span style="color:${hex}">${inner}</span>` : match
    })

    // Cỡ chữ — chỉ nhận key nằm trong SIZE_MAP
    html = html.replace(/\{\{s:([a-z]+)\}\}([\s\S]*?)\{\{\/s\}\}/g, (match, key, inner) => {
        const cls = SIZE_MAP[key]
        return cls ? `<span class="${cls}">${inner}</span>` : match
    })

    // In đậm
    html = html.replace(/\*\*([\s\S]+?)\*\*/g, '<strong>$1</strong>')

    return html
}

/**
 * Định dạng cho nội dung bài học (Lesson.content) — cùng cú pháp
 * đậm/màu/cỡ chữ như ô bình luận, NHƯNG KHÔNG escape HTML trước (khác
 * formatCommentContent): field này do admin/giáo viên biên soạn (không phải
 * học viên tự nhập), và nội dung cũ đã tồn tại có thể chứa HTML thô được
 * render trực tiếp từ trước tới giờ — escape sẽ làm hỏng các bài học cũ.
 * Giữ nguyên hành vi tự động biến URL trần thành link như trước đây.
 */
export function formatLessonContent(raw: string): string {
    let html = raw || ''

    html = html.replace(/\n/g, '<br/>')

    html = html.replace(/\{\{c:([a-z]+)\}\}([\s\S]*?)\{\{\/c\}\}/g, (match, key, inner) => {
        const hex = COLOR_MAP[key]
        return hex ? `<span style="color:${hex}">${inner}</span>` : match
    })

    html = html.replace(/\{\{s:([a-z]+)\}\}([\s\S]*?)\{\{\/s\}\}/g, (match, key, inner) => {
        const cls = SIZE_MAP[key]
        return cls ? `<span class="${cls}">${inner}</span>` : match
    })

    html = html.replace(/\*\*([\s\S]+?)\*\*/g, '<strong>$1</strong>')

    const urlRegex = /(\b(https?:\/\/)[^\s<]+)/gi
    html = html.replace(urlRegex, (match) => {
        return `<a href="${match}" target="_blank" rel="noopener noreferrer" style="color:#ea580c;font-weight:700">${match}</a>`
    })

    return html
}

/** Bọc / chèn cú pháp định dạng quanh vùng đang chọn trong textarea (dùng cho toolbar). */
export function wrapSelection(
    value: string,
    selectionStart: number,
    selectionEnd: number,
    before: string,
    after: string,
    placeholder: string
): { text: string; cursorStart: number; cursorEnd: number } {
    const hasSelection = selectionEnd > selectionStart
    const selected = hasSelection ? value.slice(selectionStart, selectionEnd) : placeholder
    const inserted = `${before}${selected}${after}`
    const text = value.slice(0, selectionStart) + inserted + value.slice(selectionEnd)

    return hasSelection
        ? { text, cursorStart: selectionStart + inserted.length, cursorEnd: selectionStart + inserted.length }
        : { text, cursorStart: selectionStart + before.length, cursorEnd: selectionStart + before.length + placeholder.length }
}

/** Chèn 1 đoạn text (vd emoji) tại vị trí con trỏ. */
export function insertAtCursor(
    value: string,
    selectionStart: number,
    selectionEnd: number,
    insert: string
): { text: string; cursorStart: number; cursorEnd: number } {
    const text = value.slice(0, selectionStart) + insert + value.slice(selectionEnd)
    const cursor = selectionStart + insert.length
    return { text, cursorStart: cursor, cursorEnd: cursor }
}

export const EMOJI_PRESETS = [
    '😀', '😂', '😍', '🥰', '😊', '😉', '😢', '😮', '😡', '👍',
    '👎', '👏', '🙏', '💪', '🔥', '✨', '🎉', '❤️', '💯', '✅',
]
