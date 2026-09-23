/**
 * Kiểm tra xem một giá trị link ảnh có phải URL hợp lệ không.
 * Bỏ qua các placeholder bị lỗi phổ biến như "image.png".
 * File này không import bất kỳ Node.js module nào → an toàn cho client-side bundling.
 */
export function isValidImageUrl(url: string | null | undefined): boolean {
    if (!url) return false
    const trimmed = url.trim()
    if (!trimmed) return false
    const invalidValues = ['image.png', 'image.jpg', 'image.jpeg', 'image.gif', '']
    if (invalidValues.includes(trimmed.toLowerCase())) return false
    try {
        const parsed = new URL(trimmed)
        return parsed.protocol === 'http:' || parsed.protocol === 'https:'
    } catch {
        return trimmed.startsWith('/') || trimmed.startsWith('./') || trimmed.startsWith('../')
    }
}
