export interface ThemeColors {
  // Brand
  primary: string;        // Màu thương hiệu (CTA, buttons)
  onPrimary: string;       // Chữ trên primary (trắng/đen)

  // Surface
  surface: string;        // Cards, Modal, Panels
  onSurface: string;       // Chữ chính trên surface

  // Background
  background: string;      // Nền trang
  muted: string;           // Chữ phụ, mô tả

  // Accent
  accent: string;         // Màu nhấn (progress, badges)

  // Outline
  outline: string;        // Viền, borders
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
  return themeId === 'highend' || themeId === 'dark' || themeId === 'ocean'
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

export type ThemeId = 'default' | 'highend' | 'light' | 'dark' | 'ocean' | 'custom';

export interface Theme {
  id: ThemeId;
  name: string;
  icon: string;
  colors: ThemeColors;
  locked: boolean;
}

export function getDefaultThemeColors(): ThemeColors {
  return { ...presetThemes[0].colors };
}

export function getThemeColors(themeId: ThemeId): ThemeColors {
  const theme = presetThemes.find(t => t.id === themeId);
  return theme ? theme.colors : presetThemes[0].colors;
}

export const presetThemes: Theme[] = [
  // Royal Empire - Minimalist Editorial (Quyền lực & Trung tính)
  {
    id: 'default',
    name: 'Royal Empire',
    icon: '👑',
    colors: {
      primary: '#4EB09B',
      onPrimary: '#FFFFFF',
      surface: '#FFFFFF',
      background: '#FAE0C7',
      onSurface: '#333333',
      muted: '#FFB6AF',
      accent: '#F28076',
      outline: '#FBC193'
    },
    locked: true,
  },
  // Digital Leader - Modern Corporate (Sạch sẽ & Tin cậy)
  {
    id: 'light',
    name: 'Digital Leader',
    icon: '💻',
    colors: {
      primary: '#41B3A3', //Màu thương hiệu (CTA, buttons)
      onPrimary: '#FFFFFF', //Chữ trên primary (trắng/đen)
      surface: '#FFFFFF', //Thường dùng cho Header,Cards, Modal, Panels
      background: '#85DCB0', //Thường dùng cho Body
      onSurface: '#2D3142', //Chữ chính trên surface
      muted: '#E8A87C', //Chữ phụ, mô tả
      accent: '#E27D60', //Màu nhấn (progress, badges)
      outline: '#C38D9E' //Viền, borders
    },
    locked: true,
  },
  // Dark - Dark Mode Premium (Sang trọng & Bí ẩn)
  {
    id: 'dark',
    name: 'Dark',
    icon: '🌙',
    colors: {
      primary: '#8B5CF6',
      onPrimary: '#FFFFFF',
      surface: '#1E1E1E',
      background: '#121212',
      onSurface: '#F3F4F6',
      muted: '#9CA3AF',
      accent: '#10B981',
      outline: '#333333'
    },
    locked: true,
  },

  // Energy & Growth - Vibrant Creative (Năng lượng & Phá cách)
  {
    id: 'highend',
    name: 'Energy & Growth',
    icon: '⚡',
    colors: {
      primary: '#EC4899',
      onPrimary: '#FFFFFF',
      surface: '#FFFFFF',
      background: '#FAF5FF',
      onSurface: '#4C1D95',
      muted: '#6B7280',
      accent: '#06B6D4',
      outline: '#E9D5FF'
    },
    locked: true,
  },
  // Trust & Wisdom - Soft & Organic (Điềm tĩnh & Bền vững)
  {
    id: 'ocean',
    name: 'Trust & Wisdom',
    icon: '🌿',
    colors: {
      primary: '#059669',
      onPrimary: '#FFFFFF',
      surface: '#FFFFFF',
      background: '#F0FDF4',
      onSurface: '#064E3B',
      muted: '#475569',
      accent: '#FB923C',
      outline: '#D1FAE5'
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

export function generateThemeCSS(colors: ThemeColors, isDark: boolean): string {
  return `
    :root {
      --color-primary: ${colors.primary};
      --color-on-primary: ${colors.onPrimary};
      --color-surface: ${colors.surface};
      --color-background: ${colors.background};
      --color-on-surface: ${colors.onSurface};
      --color-muted: ${colors.muted};
      --color-accent: ${colors.accent};
      --color-outline: ${colors.outline};
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
    .text-brk-on-primary {
      color: ${colors.onPrimary} !important;
    }

    /* ====================== LIGHTNESS LEVELS (đậm nhạt) ====================== */
    .text-brk-primary-light {
      color: ${adjustLightness(colors.primary, 20)} !important;
    }
    .text-brk-primary-dark {
      color: ${adjustLightness(colors.primary, -20)} !important;
    }
    .text-brk-on-surface-light {
      color: ${adjustLightness(colors.onSurface, 20)} !important;
    }
    .text-brk-on-surface-dark {
      color: ${adjustLightness(colors.onSurface, -20)} !important;
    }

    /* ====================== SURFACE (Cards, Modal, Panels) ====================== */
    .bg-brk-surface {
      background-color: ${colors.surface} !important;
    }
    .bg-brk-surface-light {
      background-color: ${adjustLightness(colors.surface, 20)} !important;
    }
    .bg-brk-surface-dark {
      background-color: ${adjustLightness(colors.surface, -20)} !important;
    }
    .text-brk-on-surface {
      color: ${colors.onSurface} !important;
    }
    .text-brk-on-surface-75 {
      color: ${hexToRgba(colors.onSurface, 0.75)} !important;
    }
    .text-brk-on-surface-50 {
      color: ${hexToRgba(colors.onSurface, 0.5)} !important;
    }
    .text-brk-on-surface-25 {
      color: ${hexToRgba(colors.onSurface, 0.25)} !important;
    }

    /* ====================== BACKGROUND (Page background) ====================== */
    .bg-brk-background {
      background-color: ${colors.background} !important;
    }
    .bg-brk-background-light {
      background-color: ${adjustLightness(colors.background, 20)} !important;
    }
    .bg-brk-background-dark {
      background-color: ${adjustLightness(colors.background, -20)} !important;
    }

    /* ====================== MUTED (Secondary text) ====================== */
    .text-brk-muted {
      color: ${colors.muted} !important;
    }
    .text-brk-muted-75 {
      color: ${hexToRgba(colors.muted, 0.75)} !important;
    }
    .text-brk-muted-50 {
      color: ${hexToRgba(colors.muted, 0.5)} !important;
    }
    .text-brk-muted-25 {
      color: ${hexToRgba(colors.muted, 0.25)} !important;
    }

    /* ====================== PRIMARY BUTTONS (CTA) ====================== */
    .bg-brk-primary {
      background-color: ${colors.primary} !important;
    }
    .bg-brk-primary:hover {
      background-color: ${colors.primary} !important;
      filter: brightness(0.9);
    }
    .bg-brk-primary-light {
      background-color: ${adjustLightness(colors.primary, 20)} !important;
    }
    .bg-brk-primary-dark {
      background-color: ${adjustLightness(colors.primary, -20)} !important;
    }
    .text-brk-on-primary {
      color: ${colors.onPrimary} !important;
    }
    .border-brk-primary {
      border-color: ${colors.primary} !important;
    }
    .shadow-brk-primary\\/10 {
      box-shadow: 0 10px 15px -3px ${hexToRgba(colors.primary, 0.1)} !important;
    }
    .shadow-brk-primary\\/20 {
      box-shadow: 0 10px 15px -3px ${hexToRgba(colors.primary, 0.2)} !important;
    }
    .ring-brk-primary {
      --tw-ring-color: ${hexToRgba(colors.primary, 0.2)} !important;
    }

    /* ====================== ACCENT (Emphasis, Success) ====================== */
    .text-brk-accent {
      color: ${colors.accent} !important;
    }
    .bg-brk-accent {
      background-color: ${colors.accent} !important;
    }
    .border-brk-accent {
      border-color: ${colors.accent} !important;
    }
    .text-brk-accent-hover:hover {
      color: ${colors.accent} !important;
    }
    .bg-brk-accent-10 {
      background-color: ${hexToRgba(colors.accent, isDark ? 0.15 : 0.1)} !important;
    }
    .bg-brk-accent-20 {
      background-color: ${hexToRgba(colors.accent, isDark ? 0.2 : 0.2)} !important;
    }
    .bg-brk-accent-30 {
      background-color: ${hexToRgba(colors.accent, isDark ? 0.3 : 0.3)} !important;
    }
    .bg-brk-accent-50 {
      background-color: ${hexToRgba(colors.accent, 0.5)} !important;
    }

    /* ====================== OUTLINE (Borders) ====================== */
    .border-brk-outline {
      border-color: ${colors.outline} !important;
    }
    .border-brk-outline-light {
      border-color: ${adjustLightness(colors.outline, 20)} !important;
    }
    .border-brk-outline-dark {
      border-color: ${adjustLightness(colors.outline, -20)} !important;
    }
    .ring-brk-outline {
      --tw-ring-color: ${colors.outline} !important;
    }

    /* ====================== LEGACY MAPPINGS (for backward compatibility) ====================== */
    /* These map old class names to new design tokens */
    .bg-brk-section {
      background-color: ${colors.surface} !important;
    }
    .bg-brk-section-alt {
      background-color: ${colors.background} !important;
    }
    .text-brk-section {
      color: ${colors.onSurface} !important;
    }
    .text-brk-section-secondary {
      color: ${colors.muted} !important;
    }
    .border-brk-section {
      border-color: ${colors.outline} !important;
    }
    .ring-brk-section {
      --tw-ring-color: ${colors.outline} !important;
    }
    .text-brk-bg {
      color: ${colors.background} !important;
    }
    .bg-brk-bg {
      background-color: ${colors.background} !important;
    }



    /* ====================== PAGE BODY & FOOTER ====================== */
    body {
      background-color: ${colors.background} !important;
      color: ${colors.onSurface} !important;
    }
    footer {
      background-color: ${isDark ? colors.background : '#f3f4f6'} !important;
    }
    footer p, footer span {
      color: ${colors.muted} !important;
    }

    /* ====================== STATUS COLORS (adjust for dark mode) ====================== */
    .bg-green-50 {
      background-color: ${isDark ? 'rgba(34,197,94,0.1)' : '#f0fdf4'} !important;
    }
    .bg-red-50 {
      background-color: ${isDark ? 'rgba(239,68,68,0.1)' : '#fef2f2'} !important;
    }
  `;
}
