import type { AttnBgToken, AttnTextToken } from "@/lib/attention-highlight-theme"

/**
 * Kiểu dữ liệu + giá trị mặc định dùng chung giữa server action
 * (app/actions/attention-highlight-actions.ts) và Context phía client
 * (app/contexts/AttentionHighlightContext.tsx). Tách riêng file này (không có
 * 'use server') vì file 'use server' chỉ được phép export async function —
 * không thể export thẳng 1 hằng số object từ đó.
 */
export interface AttentionHighlightConfig {
    /** Thời gian không hoạt động trước khi bắt đầu chu trình lóe sáng (ms) */
    idleDelayMs: number
    /** Thời gian giữ mỗi đối tượng được highlight trước khi chuyển sang đối tượng kế (ms) */
    cycleIntervalMs: number
    /** Tốc độ 1 nhịp chớp lóe sáng (ms) */
    blinkDurationMs: number
    objectBgToken: AttnBgToken
    objectTextMode: AttnTextToken
    tooltipBgToken: AttnBgToken
    tooltipTextMode: AttnTextToken
    /** Cỡ chữ nội dung tooltip (px) */
    tooltipFontSizePx: number
    /** Chiều rộng TỐI ĐA của tooltip, tính theo % chiều ngang màn hình — điện thoại.
     * Tooltip luôn ưu tiên khớp theo độ dài text thật (shrink-to-fit); chỉ khi
     * text dài hơn giá trị này mới bị giới hạn lại = giá trị này và xuống dòng. */
    tooltipMaxWidthVwMobile: number
    /** Như trên — máy tính / máy tính bảng */
    tooltipMaxWidthVwDesktop: number
}

export const DEFAULT_ATTENTION_CONFIG: AttentionHighlightConfig = {
    idleDelayMs: 5000,
    cycleIntervalMs: 3000,
    blinkDurationMs: 1600,
    objectBgToken: 'primary',
    objectTextMode: 'auto',
    tooltipBgToken: 'accent',
    tooltipTextMode: 'auto',
    tooltipFontSizePx: 11,
    tooltipMaxWidthVwMobile: 60,
    tooltipMaxWidthVwDesktop: 20,
}

export interface AttentionHighlightItem {
    id: string
    group: string
    label: string
    tooltip: string
    enabled: boolean
}
