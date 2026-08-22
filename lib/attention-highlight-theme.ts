/**
 * Ánh xạ "token" màu (chọn trong Cài đặt hệ thống) sang CSS custom property
 * tương ứng của theme đang áp dụng (xem app/contexts/theme-config.ts —
 * --color-primary/--color-accent/... được ThemeContext bơm vào :root lúc
 * runtime). Dùng chung giữa AttentionHighlight (hiển thị thật) và trang cài
 * đặt (xem trước).
 */
export type AttnBgToken = 'primary' | 'accent' | 'surface'
export type AttnTextToken = 'auto' | 'onPrimary' | 'onAccent' | 'onSurface' | 'muted'

export const ATTN_BG_TOKEN_OPTIONS: { value: AttnBgToken; label: string }[] = [
    { value: 'primary', label: 'Primary (màu thương hiệu, nút CTA)' },
    { value: 'accent', label: 'Accent (màu nhấn, badge)' },
    { value: 'surface', label: 'Surface (màu nền thẻ/card)' },
]

export const ATTN_TEXT_TOKEN_OPTIONS: { value: AttnTextToken; label: string }[] = [
    { value: 'auto', label: 'Tự động (tương phản với màu nền đã chọn)' },
    { value: 'onPrimary', label: 'On-Primary' },
    { value: 'onAccent', label: 'On-Accent' },
    { value: 'onSurface', label: 'On-Surface' },
    { value: 'muted', label: 'Muted (chữ phụ)' },
]

const BG_VAR: Record<AttnBgToken, string> = {
    primary: 'var(--color-primary, #4EB09B)',
    accent: 'var(--color-accent, #F28076)',
    surface: 'var(--color-surface, #FFFFFF)',
}

// Token "auto" theo từng nền -> token "on-X" tương ứng, luôn đảm bảo tương phản
const AUTO_TEXT_FOR_BG: Record<AttnBgToken, Exclude<AttnTextToken, 'auto'>> = {
    primary: 'onPrimary',
    accent: 'onAccent',
    surface: 'onSurface',
}

const TEXT_VAR: Record<Exclude<AttnTextToken, 'auto'>, string> = {
    onPrimary: 'var(--color-on-primary, #111827)',
    onAccent: 'var(--color-on-accent, #111827)',
    onSurface: 'var(--color-on-surface, #111827)',
    muted: 'var(--color-muted, #6B7280)',
}

/** Trả về `var(--color-x, fallback)` sẵn sàng dùng trực tiếp trong style inline. */
export function bgTokenToCssVar(token: AttnBgToken): string {
    return BG_VAR[token]
}

export function textTokenToCssVar(token: AttnTextToken, bgToken: AttnBgToken): string {
    const resolved = token === 'auto' ? AUTO_TEXT_FOR_BG[bgToken] : token
    return TEXT_VAR[resolved]
}
