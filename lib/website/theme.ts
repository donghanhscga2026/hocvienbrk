import type { CSSProperties } from 'react'

/** Chuẩn hóa màu và pha alpha lên nền thật để modal luôn có nền kín. */
function opaqueColor(value: string, fallback: string, backdrop = '#ffffff'): string {
  if (!/^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(value)) return fallback
  let hex = value.slice(1)
  if (hex.length <= 4) hex = [...hex].map(c => c + c).join('')
  const alpha = hex.length === 8 ? parseInt(hex.slice(6), 16) / 255 : 1
  return '#' + [0, 2, 4].map(i => Math.round(parseInt(hex.slice(i, i + 2), 16) * alpha + parseInt(backdrop.slice(i + 1, i + 3), 16) * (1 - alpha)).toString(16).padStart(2, '0')).join('')
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
}

export function contrastRatio(a: string, b: string): number {
  const x = luminance(a), y = luminance(b)
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}

/** Đọc được cả tên màu của theme trong database và bộ màu cá nhân cũ. */
export function normalizeWebsitePalette(raw: unknown) {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : {}
  const aliases = {
    primary: ['primary'], background: ['background'],
    surface: ['card', 'backgroundSecondary', 'surface'],
    foreground: ['foreground', 'onSurface'],
    muted: ['foregroundSecondary', 'mutedForeground', 'muted'],
    onPrimary: ['primaryForeground', 'onPrimary'],
    accent: ['accent'], outline: ['border', 'outline'],
  } as const
  const result: Partial<Record<keyof typeof aliases, string>> = {}
  for (const [key, names] of Object.entries(aliases)) {
    const value = names.map(name => source[name]).find(value => typeof value === 'string' && /^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(value))
    if (typeof value === 'string') result[key as keyof typeof aliases] = value
  }
  return result
}

/** Một bảng màu cho trang, điều hướng và mọi chức năng; không phụ thuộc màu của hệ điều hành. */
export function websiteTheme(color: string, background: string, palette?: unknown) {
  const colors = normalizeWebsitePalette(palette)
  const canvas = opaqueColor(background, '#f8fafc')
  const primary = opaqueColor(color, '#7c3aed', canvas)
  const dark = luminance(canvas) < 0.18
  const surface = opaqueColor(colors.surface || '', dark ? opaqueColor('#00000018', '#1e293b', canvas) : '#ffffff', canvas)
  const preferredText = opaqueColor(colors.foreground || '', dark ? '#f8fafc' : '#172033', canvas)
  const text = Math.min(contrastRatio(preferredText, canvas), contrastRatio(preferredText, surface)) >= 4.5 ? preferredText : dark ? '#ffffff' : '#000000'
  // Theme có thể dùng nền tối và thẻ sáng: chữ trên thẻ phải được kiểm tra riêng.
  const surfaceText = contrastRatio(preferredText, surface) >= 4.5 ? preferredText : contrastRatio(surface, '#ffffff') >= contrastRatio(surface, '#000000') ? '#ffffff' : '#000000'
  const preferredMuted = opaqueColor(colors.muted || '', dark ? '#cbd5e1' : '#475569', surface)
  const muted = Math.min(contrastRatio(preferredMuted, canvas), contrastRatio(preferredMuted, surface)) >= 4.5 ? preferredMuted : Math.min(contrastRatio(text, canvas), contrastRatio(text, surface)) >= 4.5 ? text : surfaceText
  const preferredOnPrimary = opaqueColor(colors.onPrimary || '', '#ffffff', primary)
  const onPrimary = contrastRatio(primary, preferredOnPrimary) >= 4.5 ? preferredOnPrimary : contrastRatio(primary, '#ffffff') >= contrastRatio(primary, '#000000') ? '#ffffff' : '#000000'
  // Màu nhấn dùng cho cả chữ và nút: điều chỉnh độ sáng tới khi chữ đủ rõ trên thẻ.
  let accent = opaqueColor(colors.accent || '', primary, surface)
  const target = luminance(surface) < 0.18 ? '#ffffff' : '#000000'
  for (let step = 0; contrastRatio(accent, surface) < 4.5 && step < 24; step++) {
    accent = '#' + [1, 3, 5].map(i => Math.round(parseInt(accent.slice(i, i + 2), 16) * 0.85 + parseInt(target.slice(i, i + 2), 16) * 0.15).toString(16).padStart(2, '0')).join('')
  }
  const onAccent = contrastRatio(accent, '#ffffff') >= contrastRatio(accent, '#000000') ? '#ffffff' : '#000000'
  const style = {
    '--background': canvas, '--foreground': text,
    '--color-primary': primary, '--color-on-primary': onPrimary,
    '--color-background': canvas, '--color-surface': surface,
    '--color-on-surface': surfaceText, '--color-muted': muted,
    '--color-accent': accent, '--color-on-accent': onAccent,
    '--color-outline': opaqueColor(colors.outline || '', dark ? '#475569' : '#cbd5e1', surface),
    colorScheme: dark ? 'dark' : 'light',
  } as CSSProperties
  return { background: canvas, primary, surface, text, surfaceText, muted, accent, onPrimary, dark, style }
}
