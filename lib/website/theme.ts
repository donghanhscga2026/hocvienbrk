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

/** Một bảng màu cho trang, điều hướng và mọi chức năng; không phụ thuộc màu của hệ điều hành. */
export function websiteTheme(color: string, background: string) {
  const canvas = opaqueColor(background, '#f8fafc')
  const primary = opaqueColor(color, '#7c3aed', canvas)
  const dark = luminance(canvas) < 0.18
  const surface = dark ? opaqueColor('#00000018', '#1e293b', canvas) : '#ffffff'
  const preferredText = dark ? '#f8fafc' : '#172033'
  const text = Math.min(contrastRatio(preferredText, canvas), contrastRatio(preferredText, surface)) >= 4.5 ? preferredText : dark ? '#ffffff' : '#000000'
  const preferredMuted = dark ? '#cbd5e1' : '#475569'
  const muted = Math.min(contrastRatio(preferredMuted, canvas), contrastRatio(preferredMuted, surface)) >= 4.5 ? preferredMuted : text
  const onPrimary = contrastRatio(primary, '#ffffff') >= contrastRatio(primary, '#000000') ? '#ffffff' : '#000000'
  // Màu nhấn dùng cho cả chữ và nút: điều chỉnh độ sáng tới khi chữ đủ rõ trên thẻ.
  let accent = primary
  const target = dark ? '#ffffff' : '#000000'
  for (let step = 0; contrastRatio(accent, surface) < 4.5 && step < 24; step++) {
    accent = '#' + [1, 3, 5].map(i => Math.round(parseInt(accent.slice(i, i + 2), 16) * 0.85 + parseInt(target.slice(i, i + 2), 16) * 0.15).toString(16).padStart(2, '0')).join('')
  }
  const onAccent = contrastRatio(accent, '#ffffff') >= contrastRatio(accent, '#000000') ? '#ffffff' : '#000000'
  const style = {
    '--background': canvas, '--foreground': text,
    '--color-primary': primary, '--color-on-primary': onPrimary,
    '--color-background': canvas, '--color-surface': surface,
    '--color-on-surface': text, '--color-muted': muted,
    '--color-accent': accent, '--color-on-accent': onAccent,
    '--color-outline': dark ? '#475569' : '#cbd5e1',
    colorScheme: dark ? 'dark' : 'light',
  } as CSSProperties
  return { background: canvas, primary, surface, text, muted, accent, onPrimary, dark, style }
}
