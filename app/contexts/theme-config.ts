export interface ThemeColors {
  primary: string;
  secondary: string;
  bg: string;
  bgSecondary: string;
  text: string;
  textSecondary: string;
  accent: string;
  border: string;
  header: string;
}

export function getContrastColor(bgColor: string): string {
  const hex = bgColor.replace('#', '')
  const r = parseInt(hex.substr(0, 2), 16)
  const g = parseInt(hex.substr(2, 2), 16)
  const b = parseInt(hex.substr(4, 2), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5 ? '#000000' : '#ffffff'
}

export function isDarkTheme(themeId: ThemeId | string): boolean {
  return themeId === 'highend' || themeId === 'dark'
}

export function getTextColorForBg(bgColor: string, themeId: ThemeId): string {
  const dark = isDarkTheme(themeId)
  if (bgColor === 'transparent') return dark ? '#ffffff' : '#000000'
  try {
    return getContrastColor(bgColor)
  } catch {
    return dark ? '#ffffff' : '#000000'
  }
}

export type ThemeId = 'default' | 'highend' | 'light' | 'dark' | 'custom';

export interface Theme {
  id: ThemeId;
  name: string;
  icon: string;
  colors: ThemeColors;
  locked: boolean;
}

export const defaultColors: ThemeColors = {
  primary: '#f59e0b',
  secondary: '#0ea5e9',
  bg: '#ffffff',
  bgSecondary: '#f9fafb',
  text: '#171717',
  textSecondary: '#6b7280',
  accent: '#fbbf24',
  border: '#e5e7eb',
  header: '#ffffff',
};

export const presetThemes: Theme[] = [
  {
    id: 'default',
    name: 'Mặc định',
    icon: '🎯',
    colors: {
      primary: '#f59e0b',
      secondary: '#0ea5e9',
      bg: '#ffffff',
      bgSecondary: '#f9fafb',
      text: '#171717',
      textSecondary: '#6b7280',
      accent: '#fbbf24',
      border: '#e5e7eb',
      header: '#ffffff',
    },
    locked: true,
  },
  {
    id: 'highend',
    name: 'Chuyên nghiệp',
    icon: '💼',
    colors: {
      primary: '#D4AF37',
      secondary: '#1e3a5f',
      bg: '#0f1419',
      bgSecondary: '#1a1a1a',
      text: '#ffffff',
      textSecondary: '#9ca3af',
      accent: '#fbbf24',
      border: '#374151',
      header: '#0f1419',
    },
    locked: true,
  },
  {
    id: 'light',
    name: 'Sáng',
    icon: '☀️',
    colors: {
      primary: '#6366f1',
      secondary: '#ec4899',
      bg: '#fafafa',
      bgSecondary: '#f3f4f6',
      text: '#18181b',
      textSecondary: '#71717a',
      accent: '#818cf8',
      border: '#e5e7eb',
      header: '#ffffff',
    },
    locked: true,
  },
  {
    id: 'dark',
    name: 'Tối',
    icon: '🌙',
    colors: {
      primary: '#3b82f6',
      secondary: '#8b5cf6',
      bg: '#0f172a',
      bgSecondary: '#1e293b',
      text: '#f8fafc',
      textSecondary: '#94a3b8',
      accent: '#60a5fa',
      border: '#334155',
      header: '#0f172a',
    },
    locked: true,
  },
];

export const getCustomThemeId = 'custom';

export function getThemeById(id: ThemeId): Theme {
  const theme = presetThemes.find(t => t.id === id);
  if (theme) return theme;
  
  const savedCustom = localStorage.getItem('site-custom-colors');
  if (savedCustom) {
    return {
      id: 'custom',
      name: 'Tùy biến',
      icon: '🎨',
      colors: JSON.parse(savedCustom),
      locked: false,
    };
  }
  
  return presetThemes[0];
}

export function applyThemeCSS(colors: ThemeColors): string {
  return '';
}

export function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.substr(0, 2), 16)
  const g = parseInt(h.substr(2, 2), 16)
  const b = parseInt(h.substr(4, 2), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const h = hex.replace('#', '')
  let r = parseInt(h.substr(0, 2), 16) / 255
  let g = parseInt(h.substr(2, 2), 16) / 255
  let b = parseInt(h.substr(4, 2), 16) / 255

  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let hVal = 0, s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: hVal = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: hVal = ((b - r) / d + 2) / 6; break
      case b: hVal = ((r - g) / d + 4) / 6; break
    }
  }
  return { h: hVal * 360, s: s * 100, l: l * 100 }
}

export function hslToHex(h: number, s: number, l: number): string {
  s /= 100
  l /= 100
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

export function adjustLightness(hex: string, percent: number): string {
  const { h, s, l } = hexToHsl(hex)
  return hslToHex(h, s, Math.max(0, Math.min(100, l + percent)))
}

export function generateThemeOverrides(colors: ThemeColors, isDark: boolean): string {
  return `
    :root {
      --color-primary: ${colors.primary};
      --color-secondary: ${colors.secondary};
      --color-bg: ${colors.bg};
      --color-bg-secondary: ${colors.bgSecondary};
      --color-text: ${colors.text};
      --color-text-secondary: ${colors.textSecondary};
      --color-accent: ${colors.accent};
      --color-border: ${colors.border};
      --color-header: ${colors.header};
    }

    /* ====================== THEME CLASSES ====================== */
    .text-brk-primary {
      color: ${colors.primary} !important;
      text-shadow: 0 0 10px ${hexToRgba(colors.primary, 0.25)}, 0 0 20px ${hexToRgba(colors.primary, 0.25)} !important;
    }
    .text-brk-primary-75 {
      color: ${hexToRgba(colors.primary, 0.75)} !important;
    }
    .text-brk-primary-50 {
      color: ${hexToRgba(colors.primary, 0.5)} !important;
    }
    .text-brk-primary-25 {
      color: ${hexToRgba(colors.primary, 0.25)} !important;
    }
    .text-brk-secondary {
      color: ${colors.secondary} !important;
      text-shadow: 0 0 10px ${hexToRgba(colors.secondary, 0.25)}, 0 0 20px ${hexToRgba(colors.secondary, 0.25)} !important;
    }
    .text-brk-secondary-75 {
      color: ${hexToRgba(colors.secondary, 0.75)} !important;
    }
    .text-brk-secondary-50 {
      color: ${hexToRgba(colors.secondary, 0.5)} !important;
    }
    .text-brk-secondary-25 {
      color: ${hexToRgba(colors.secondary, 0.25)} !important;
    }
    .text-brk-text {
      color: ${colors.text} !important;
    }
    .text-brk-text-75 {
      color: ${hexToRgba(colors.text, 0.75)} !important;
    }
    .text-brk-text-50 {
      color: ${hexToRgba(colors.text, 0.5)} !important;
    }
    .text-brk-text-25 {
      color: ${hexToRgba(colors.text, 0.25)} !important;
    }
    .text-brk-bg {
      color: ${colors.bg} !important;
    }

    /* ====================== LIGHTNESS LEVELS (đậm nhạt) ====================== */
    .text-brk-primary-light {
      color: ${adjustLightness(colors.primary, 20)} !important;
    }
    .text-brk-primary-dark {
      color: ${adjustLightness(colors.primary, -20)} !important;
    }
    .text-brk-secondary-light {
      color: ${adjustLightness(colors.secondary, 20)} !important;
    }
    .text-brk-secondary-dark {
      color: ${adjustLightness(colors.secondary, -20)} !important;
    }
    .text-brk-text-light {
      color: ${adjustLightness(colors.text, 20)} !important;
    }
    .text-brk-text-dark {
      color: ${adjustLightness(colors.text, -20)} !important;
    }
    .bg-brk-bg {
      background-color: ${colors.bg} !important;
    }
    .bg-brk-header {
      background-color: ${colors.header} !important;
    }
    .text-brk-header {
      color: ${colors.header} !important;
    }
    .bg-brk-primary {
      background-color: ${colors.primary} !important;
    }
    .bg-brk-primary-light {
      background-color: ${adjustLightness(colors.primary, 20)} !important;
    }
    .bg-brk-primary-dark {
      background-color: ${adjustLightness(colors.primary, -20)} !important;
    }

    /* ====================== PRIMARY (Nút CTA chính) ====================== */
    .bg-yellow-400, .bg-yellow-500, .bg-amber-400, .bg-amber-500, .bg-orange-500 {
      background-color: ${colors.primary} !important;
    }
    .bg-yellow-400:hover, .bg-yellow-500:hover, .bg-amber-400:hover, .bg-amber-500:hover, .bg-orange-500:hover {
      background-color: ${colors.primary} !important;
      filter: brightness(0.9);
    }
    .text-yellow-400, .text-yellow-500, .text-amber-400, .text-amber-500 {
      color: ${colors.primary} !important;
    }
    .border-yellow-400, .border-yellow-500, .border-amber-400 {
      border-color: ${colors.primary} !important;
    }
    .hover\\:text-yellow-400:hover, nav a:hover {
      color: ${colors.primary} !important;
    }
    .shadow-yellow-400\\/10, .shadow-yellow-400\\/20 {
      box-shadow: 0 10px 15px -3px ${colors.primary}1a !important;
    }
    .ring-amber-200, .ring-yellow-200 {
      --tw-ring-color: ${colors.primary}33 !important;
    }
    .bg-yellow-400\\/10, .bg-yellow-400\\/20 {
      background-color: ${colors.primary}1a !important;
    }
    .bg-yellow-50 {
      background-color: ${colors.primary}0d !important;
    }
    .text-yellow-600, .text-yellow-700, .text-yellow-800 {
      color: ${colors.primary}cc !important;
    }

    /* ====================== SECONDARY (Header, Badge) ====================== */
    header, header[class*="fixed"], header[class*="bg-black"], header[class*="bg-gray"] {
      background-color: ${colors.header} !important;
    }
    .bg-sky-500, .bg-sky-600 {
      background-color: ${colors.secondary} !important;
    }
    .text-sky-500, .text-sky-600 {
      color: ${colors.secondary} !important;
    }
    .bg-zinc-900, .bg-zinc-950 {
      background-color: ${isDark ? colors.header : colors.bgSecondary} !important;
    }
    .bg-orange-500\\/10 {
      background-color: ${colors.primary}1a !important;
    }
    .border-orange-500 {
      border-color: ${colors.primary} !important;
    }
    .text-orange-400, .text-orange-500, .text-orange-600 {
      color: ${colors.primary} !important;
    }
    .hover\\:bg-orange-500:hover {
      background-color: ${colors.primary} !important;
    }
    .text-glow-3d {
      color: ${colors.secondary} !important;
      text-shadow: 0 0 10px ${colors.secondary}40, 0 0 20px ${colors.secondary}40 !important;
    }

    /* ====================== BACKGROUND ====================== */
    body {
      background-color: ${colors.bg} !important;
      color: ${colors.text} !important;
    }
    .bg-white {
      background-color: ${isDark ? colors.bgSecondary : '#ffffff'} !important;
    }
    .bg-gray-50 {
      background-color: ${colors.bgSecondary} !important;
    }
    .bg-gray-100 {
      background-color: ${isDark ? 'rgba(255,255,255,0.05)' : '#f3f4f6'} !important;
    }
    .bg-white\\/5 {
      background-color: ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)'} !important;
    }
    .bg-zinc-800 {
      background-color: ${isDark ? 'rgba(255,255,255,0.1)' : '#3f3f46'} !important;
    }
    footer {
      background-color: ${isDark ? colors.bg : '#f3f4f6'} !important;
    }

    /* ====================== TEXT ====================== */
    .text-white {
      color: ${isDark ? '#ffffff' : colors.text} !important;
    }
    .text-gray-900, .text-zinc-900 {
      color: ${isDark ? '#ffffff' : '#111827'} !important;
    }
    .text-gray-500, .text-zinc-500 {
      color: ${colors.textSecondary} !important;
    }
    .text-gray-600, .text-zinc-600 {
      color: ${isDark ? '#d4d4d8' : '#4b5563'} !important;
    }
    .text-gray-400 {
      color: ${isDark ? '#a1a1aa' : '#9ca3af'} !important;
    }
    .text-gray-300 {
      color: ${isDark ? '#d4d4d8' : '#d1d5db'} !important;
    }
    footer p, footer span {
      color: ${colors.textSecondary} !important;
    }

    /* ====================== BORDERS ====================== */
    .border-gray-200 {
      border-color: ${isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb'} !important;
    }
    .border-gray-100 {
      border-color: ${isDark ? 'rgba(255,255,255,0.05)' : '#f3f4f6'} !important;
    }
    .border-white\\/20, .border-white\\/10 {
      border-color: ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'} !important;
    }
    .border-zinc-800, .border-zinc-700 {
      border-color: ${isDark ? 'rgba(255,255,255,0.1)' : '#3f3f46'} !important;
    }

    /* ====================== MODAL/OVERLAY ====================== */
    .bg-zinc-950 {
      background-color: ${isDark ? '#09090b' : '#ffffff'} !important;
    }
    .bg-slate-900\\/40 {
      background-color: ${isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.4)'} !important;
    }

    /* ====================== HERO/GRADIENT ====================== */
    .bg-gradient-to-br {
      background: ${isDark ? colors.bg : 'linear-gradient(to bottom right, #000, #18181b)'} !important;
    }

    /* ====================== STATUS COLORS ====================== */
    .bg-green-50 {
      background-color: ${isDark ? 'rgba(34,197,94,0.1)' : '#f0fdf4'} !important;
    }
    .bg-red-50 {
      background-color: ${isDark ? 'rgba(239,68,68,0.1)' : '#fef2f2'} !important;
    }
  `;
}
