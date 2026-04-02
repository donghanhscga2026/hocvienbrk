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
    name: 'Star Light',
    icon: '💻',
    colors: {
      primary: '#ffaf01ff',    // Xanh dương (Màu chủ đạo cho CTA, Buttons - tạo sự tin cậy)
      onPrimary: '#FFFFFF',    // Trắng (Chữ hiển thị trên nền Primary)
      surface: '#ffffffff',      // Trắng (Nền cho Header, Cards, Modals để giữ sự sạch sẽ)
      background: '#F3F7FF',   // Xanh nhạt tinh khôi (Màu nền Body - giúp website dịu mắt hơn trắng thuần)
      onSurface: '#333A56',    // Xanh đen đậm (Chữ chính - đảm bảo độ tương phản để đọc nội dung)
      muted: '#4e545cff',        // Xanh lơ (Chữ phụ, mô tả hoặc các icon không quan trọng)
      accent: '#666666ff',       // Tím Lavender (Màu nhấn cho Progress bar, Badges hoặc Hover)
      outline: '#e2dfddff'       // Cam đào (Màu viền Borders, đường kẻ phân cách - tạo điểm nhấn ấm áp)
    },
    locked: true,
  },
  // Dark - Dark Mode Premium (Sang trọng & Bí ẩn)
  {
    id: 'dark',
    name: 'Dark',
    icon: '🌙',
    colors: {
      primary: '#d49216ff',
      onPrimary: '#FFFFFF',
      surface: '#1E1E1E',
      background: '#121212',
      onSurface: '#F3F4F6',
      muted: '#9CA3AF',
      accent: '#454d5fff',
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
      primary: '#DE741C',      // Cam đậm (Màu chủ đạo cho CTA, Buttons - màu của hành động và năng lượng)
      onPrimary: '#FFFFFF',    // Trắng (Chữ trên nền cam để đảm bảo độ tương phản cao)
      surface: '#FFFFFF',      // Trắng (Dùng cho Header, Cards nội dung để giữ sự cân bằng thị giác)
      background: '#FDF7F2',   // Kem cam nhạt (Màu nền toàn trang - giúp website ấm áp và đồng bộ với bảng màu)
      onSurface: '#593E67',    // Tím đậm nhất (Chữ chính cho tiêu đề và nội dung - thay cho màu đen khô khan)
      muted: '#84495F',        // Tím hồng (Dùng cho mô tả phụ, các icon hoặc thông tin bổ trợ)
      accent: '#FEA837',       // Vàng cam sáng (Màu nhấn cho Progress bar, Badges hoặc các thông báo quan trọng)
      outline: '#B85B56'       // Đỏ nâu (Dùng cho đường viền Borders hoặc đường kẻ phân đoạn để tạo chiều sâu)
    },
    locked: true,
  },
  // Trust & Wisdom - Soft & Organic (Điềm tĩnh & Bền vững)
  {
    id: 'ocean',
    name: 'Trust & Wisdom',
    icon: '🌿',
    colors: {
      primary: '#3a3838ff',      // Đỏ điện tử rực rỡ (Màu chủ đạo cho CTA, Buttons - tạo sự bùng nổ, thúc giục hành động)
      onPrimary: '#FFFFFF',    // Trắng (Chữ trên nền đỏ để đạt độ tương phản tuyệt đối)
      surface: '#505050ff',      // Trắng (Thanh Header, các thẻ Cards nội dung để giữ sự cân bằng và dễ đọc)
      background: '#000000ff',   // Xám khói nhạt (Màu nền toàn trang - giúp website trông cao cấp và êm ái hơn trắng thuần)
      onSurface: '#ffffffff',    // Đen Navy sâu (Chữ chính cho tiêu đề và nội dung - đây là màu đậm nhất trong bảng của bạn)
      muted: '#eee4f3ff',        // Tím xám trung tính (Dùng cho mô tả phụ, các icon hoặc thông tin không ưu tiên)
      accent: '#9e9e9eff',       // Xanh Navy trung bình (Dùng cho các mảng nhấn lớn, Badge hoặc trạng thái đang thực hiện)
      outline: '#363636ff'       // Xám lạnh (Dùng cho các đường viền Borders, đường kẻ phân tách hoặc Placeholder trong ô nhập liệu)
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
