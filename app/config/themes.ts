// THEME CONFIGURATION - 2026-03-30
// Quản lý themes cho website

// Color Palette Interface
export interface ColorPalette {
  primary: string
  primaryForeground: string
  secondary: string
  secondaryForeground: string
  accent: string
  accentForeground: string
  background: string
  backgroundSecondary: string
  backgroundTertiary: string
  foreground: string
  foregroundSecondary: string
  foregroundMuted: string
  border: string
  borderHover: string
  success: string
  successForeground: string
  warning: string
  warningForeground: string
  error: string
  errorForeground: string
  info: string
  infoForeground: string
  card: string
  cardForeground: string
  input: string
  inputForeground: string
  ring: string
  muted: string
  mutedForeground: string
}

// Typography Interface
export interface TypographyConfig {
  fontHeading: string
  fontBody: string
  fontMono: string
  fontSizeXs: string
  fontSizeSm: string
  fontSizeBase: string
  fontSizeLg: string
  fontSizeXl: string
  fontSize2xl: string
  fontSize3xl: string
  fontSize4xl: string
  fontWeightLight: number
  fontWeightNormal: number
  fontWeightMedium: number
  fontWeightSemibold: number
  fontWeightBold: number
  fontWeightBlack: number
  lineHeightTight: number
  lineHeightNormal: number
  lineHeightRelaxed: number
  letterSpacingTight: string
  letterSpacingNormal: string
  letterSpacingWide: string
}

// Layout Interface
export interface LayoutConfig {
  radiusNone: string
  radiusSm: string
  radius: string
  radiusMd: string
  radiusLg: string
  radiusXl: string
  radius2xl: string
  radiusFull: string
  spacingXs: string
  spacingSm: string
  spacing: string
  spacingMd: string
  spacingLg: string
  spacingXl: string
  shadowSm: string
  shadow: string
  shadowMd: string
  shadowLg: string
  shadowXl: string
}

// Animation Interface
export interface AnimationConfig {
  durationFast: string
  duration: string
  durationSlow: string
  durationSlower: string
  easingDefault: string
  easingIn: string
  easingOut: string
  easingBounce: string
}

// Effect Interface
export interface EffectConfig {
  gradientPrimary: string
  gradientAccent: string
  blurSm: string
  blur: string
  blurMd: string
  blurLg: string
  overlayLight: string
  overlayDark: string
  glowPrimary: string
  glowAccent: string
}

// Full Theme Interface
export interface Theme {
  id: string
  name: string
  description?: string
  colors: ColorPalette
  typography: TypographyConfig
  layout: LayoutConfig
  animations?: AnimationConfig
  effects?: EffectConfig
  isLocked: boolean
}

// Theme Presets
// NOTE: "default" = giao diện gốc, KHÔNG apply CSS variables
export const THEME_PRESETS: Theme[] = [
  // 0. Default (Giao diện gốc - không thay đổi gì)
  {
    id: 'default',
    name: 'Mặc định',
    description: 'Giao diện gốc của website - không thay đổi',
    isLocked: true,
    colors: {
      primary: '#f59e0b',
      primaryForeground: '#ffffff',
      secondary: '#0ea5e9',
      secondaryForeground: '#ffffff',
      accent: '#10b981',
      accentForeground: '#ffffff',
      background: '#ffffff',
      backgroundSecondary: '#f8fafc',
      backgroundTertiary: '#f1f5f9',
      foreground: '#171717',
      foregroundSecondary: '#475569',
      foregroundMuted: '#94a3b8',
      border: '#e2e8f0',
      borderHover: '#cbd5e1',
      success: '#10b981',
      successForeground: '#ffffff',
      warning: '#f59e0b',
      warningForeground: '#ffffff',
      error: '#ef4444',
      errorForeground: '#ffffff',
      info: '#0ea5e9',
      infoForeground: '#ffffff',
      card: '#ffffff',
      cardForeground: '#171717',
      input: '#ffffff',
      inputForeground: '#171717',
      ring: '#f59e0b',
      muted: '#f1f5f9',
      mutedForeground: '#94a3b8',
    },
    typography: {
      fontHeading: 'be-vietnam',
      fontBody: 'be-vietnam',
      fontMono: 'source-code',
      fontSizeXs: '0.75rem',
      fontSizeSm: '0.875rem',
      fontSizeBase: '1rem',
      fontSizeLg: '1.125rem',
      fontSizeXl: '1.25rem',
      fontSize2xl: '1.5rem',
      fontSize3xl: '1.875rem',
      fontSize4xl: '2.25rem',
      fontWeightLight: 300,
      fontWeightNormal: 400,
      fontWeightMedium: 500,
      fontWeightSemibold: 600,
      fontWeightBold: 700,
      fontWeightBlack: 900,
      lineHeightTight: 1.25,
      lineHeightNormal: 1.5,
      lineHeightRelaxed: 1.75,
      letterSpacingTight: '-0.05em',
      letterSpacingNormal: '0em',
      letterSpacingWide: '0.05em',
    },
    layout: {
      radiusNone: '0',
      radiusSm: '0.125rem',
      radius: '0.25rem',
      radiusMd: '0.375rem',
      radiusLg: '0.5rem',
      radiusXl: '0.75rem',
      radius2xl: '1rem',
      radiusFull: '9999px',
      spacingXs: '0.25rem',
      spacingSm: '0.5rem',
      spacing: '1rem',
      spacingMd: '1.5rem',
      spacingLg: '2rem',
      spacingXl: '3rem',
      shadowSm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      shadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
      shadowMd: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
      shadowLg: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
      shadowXl: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    },
    animations: {
      durationFast: '150ms',
      duration: '200ms',
      durationSlow: '300ms',
      durationSlower: '500ms',
      easingDefault: 'cubic-bezier(0.4, 0, 0.2, 1)',
      easingIn: 'cubic-bezier(0.4, 0, 1, 1)',
      easingOut: 'cubic-bezier(0, 0, 0.2, 1)',
      easingBounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    },
    effects: {
      gradientPrimary: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      gradientAccent: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      blurSm: '4px',
      blur: '8px',
      blurMd: '12px',
      blurLg: '16px',
      overlayLight: 'rgba(255, 255, 255, 0.5)',
      overlayDark: 'rgba(0, 0, 0, 0.5)',
      glowPrimary: '0 0 20px rgba(245, 158, 11, 0.4)',
      glowAccent: '0 0 20px rgba(16, 185, 129, 0.4)',
    },
  },

  // 1. BRK Classic
  {
    id: 'classic',
    name: 'BRK Classic',
    description: 'Giao diện cổ điển với màu vàng chủ đạo',
    isLocked: true,
    colors: {
      primary: '#f59e0b',
      primaryForeground: '#ffffff',
      secondary: '#0ea5e9',
      secondaryForeground: '#ffffff',
      accent: '#10b981',
      accentForeground: '#ffffff',
      background: '#ffffff',
      backgroundSecondary: '#f8fafc',
      backgroundTertiary: '#f1f5f9',
      foreground: '#0f172a',
      foregroundSecondary: '#475569',
      foregroundMuted: '#94a3b8',
      border: '#e2e8f0',
      borderHover: '#cbd5e1',
      success: '#10b981',
      successForeground: '#ffffff',
      warning: '#f59e0b',
      warningForeground: '#ffffff',
      error: '#ef4444',
      errorForeground: '#ffffff',
      info: '#0ea5e9',
      infoForeground: '#ffffff',
      card: '#ffffff',
      cardForeground: '#0f172a',
      input: '#ffffff',
      inputForeground: '#0f172a',
      ring: '#f59e0b',
      muted: '#f1f5f9',
      mutedForeground: '#94a3b8',
    },
    typography: {
      fontHeading: 'be-vietnam',
      fontBody: 'be-vietnam',
      fontMono: 'source-code',
      fontSizeXs: '0.75rem',
      fontSizeSm: '0.875rem',
      fontSizeBase: '1rem',
      fontSizeLg: '1.125rem',
      fontSizeXl: '1.25rem',
      fontSize2xl: '1.5rem',
      fontSize3xl: '1.875rem',
      fontSize4xl: '2.25rem',
      fontWeightLight: 300,
      fontWeightNormal: 400,
      fontWeightMedium: 500,
      fontWeightSemibold: 600,
      fontWeightBold: 700,
      fontWeightBlack: 900,
      lineHeightTight: 1.25,
      lineHeightNormal: 1.5,
      lineHeightRelaxed: 1.75,
      letterSpacingTight: '-0.05em',
      letterSpacingNormal: '0em',
      letterSpacingWide: '0.05em',
    },
    layout: {
      radiusNone: '0',
      radiusSm: '0.125rem',
      radius: '0.25rem',
      radiusMd: '0.375rem',
      radiusLg: '0.5rem',
      radiusXl: '0.75rem',
      radius2xl: '1rem',
      radiusFull: '9999px',
      spacingXs: '0.25rem',
      spacingSm: '0.5rem',
      spacing: '1rem',
      spacingMd: '1.5rem',
      spacingLg: '2rem',
      spacingXl: '3rem',
      shadowSm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      shadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
      shadowMd: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
      shadowLg: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
      shadowXl: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    },
    animations: {
      durationFast: '150ms',
      duration: '200ms',
      durationSlow: '300ms',
      durationSlower: '500ms',
      easingDefault: 'cubic-bezier(0.4, 0, 0.2, 1)',
      easingIn: 'cubic-bezier(0.4, 0, 1, 1)',
      easingOut: 'cubic-bezier(0, 0, 0.2, 1)',
      easingBounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    },
    effects: {
      gradientPrimary: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      gradientAccent: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      blurSm: '4px',
      blur: '8px',
      blurMd: '12px',
      blurLg: '16px',
      overlayLight: 'rgba(255, 255, 255, 0.5)',
      overlayDark: 'rgba(0, 0, 0, 0.5)',
      glowPrimary: '0 0 20px rgba(245, 158, 11, 0.4)',
      glowAccent: '0 0 20px rgba(16, 185, 129, 0.4)',
    },
  },

  // 2. Dark Mode
  {
    id: 'dark',
    name: 'Dark Mode',
    description: 'Giao diện tối chuyên nghiệp',
    isLocked: true,
    colors: {
      primary: '#3b82f6',
      primaryForeground: '#ffffff',
      secondary: '#8b5cf6',
      secondaryForeground: '#ffffff',
      accent: '#06b6d4',
      accentForeground: '#ffffff',
      background: '#0f172a',
      backgroundSecondary: '#1e293b',
      backgroundTertiary: '#334155',
      foreground: '#f8fafc',
      foregroundSecondary: '#94a3b8',
      foregroundMuted: '#64748b',
      border: '#334155',
      borderHover: '#475569',
      success: '#22c55e',
      successForeground: '#ffffff',
      warning: '#eab308',
      warningForeground: '#000000',
      error: '#ef4444',
      errorForeground: '#ffffff',
      info: '#38bdf8',
      infoForeground: '#000000',
      card: '#1e293b',
      cardForeground: '#f8fafc',
      input: '#334155',
      inputForeground: '#f8fafc',
      ring: '#3b82f6',
      muted: '#334155',
      mutedForeground: '#64748b',
    },
    typography: {
      fontHeading: 'inter',
      fontBody: 'inter',
      fontMono: 'fira-code',
      fontSizeXs: '0.75rem',
      fontSizeSm: '0.875rem',
      fontSizeBase: '1rem',
      fontSizeLg: '1.125rem',
      fontSizeXl: '1.25rem',
      fontSize2xl: '1.5rem',
      fontSize3xl: '1.875rem',
      fontSize4xl: '2.25rem',
      fontWeightLight: 300,
      fontWeightNormal: 400,
      fontWeightMedium: 500,
      fontWeightSemibold: 600,
      fontWeightBold: 700,
      fontWeightBlack: 900,
      lineHeightTight: 1.25,
      lineHeightNormal: 1.5,
      lineHeightRelaxed: 1.75,
      letterSpacingTight: '-0.05em',
      letterSpacingNormal: '0em',
      letterSpacingWide: '0.05em',
    },
    layout: {
      radiusNone: '0',
      radiusSm: '0.125rem',
      radius: '0.25rem',
      radiusMd: '0.375rem',
      radiusLg: '0.5rem',
      radiusXl: '0.75rem',
      radius2xl: '1rem',
      radiusFull: '9999px',
      spacingXs: '0.25rem',
      spacingSm: '0.5rem',
      spacing: '1rem',
      spacingMd: '1.5rem',
      spacingLg: '2rem',
      spacingXl: '3rem',
      shadowSm: '0 1px 2px 0 rgb(0 0 0 / 0.3)',
      shadow: '0 4px 6px -1px rgb(0 0 0 / 0.4)',
      shadowMd: '0 10px 15px -3px rgb(0 0 0 / 0.4)',
      shadowLg: '0 20px 25px -5px rgb(0 0 0 / 0.5)',
      shadowXl: '0 25px 50px -12px rgb(0 0 0 / 0.6)',
    },
    animations: {
      durationFast: '150ms',
      duration: '200ms',
      durationSlow: '300ms',
      durationSlower: '500ms',
      easingDefault: 'cubic-bezier(0.4, 0, 0.2, 1)',
      easingIn: 'cubic-bezier(0.4, 0, 1, 1)',
      easingOut: 'cubic-bezier(0, 0, 0.2, 1)',
      easingBounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    },
    effects: {
      gradientPrimary: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
      gradientAccent: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
      blurSm: '4px',
      blur: '8px',
      blurMd: '12px',
      blurLg: '16px',
      overlayLight: 'rgba(255, 255, 255, 0.1)',
      overlayDark: 'rgba(0, 0, 0, 0.7)',
      glowPrimary: '0 0 20px rgba(59, 130, 246, 0.5)',
      glowAccent: '0 0 20px rgba(6, 182, 212, 0.5)',
    },
  },

  // 3. Light Mode
  {
    id: 'light',
    name: 'Light Mode',
    description: 'Giao diện sáng tối giản',
    isLocked: true,
    colors: {
      primary: '#6366f1',
      primaryForeground: '#ffffff',
      secondary: '#ec4899',
      secondaryForeground: '#ffffff',
      accent: '#14b8a6',
      accentForeground: '#ffffff',
      background: '#fafafa',
      backgroundSecondary: '#f4f4f5',
      backgroundTertiary: '#e4e4e7',
      foreground: '#18181b',
      foregroundSecondary: '#71717a',
      foregroundMuted: '#a1a1aa',
      border: '#e4e4e7',
      borderHover: '#d4d4d8',
      success: '#22c55e',
      successForeground: '#ffffff',
      warning: '#eab308',
      warningForeground: '#000000',
      error: '#ef4444',
      errorForeground: '#ffffff',
      info: '#0ea5e9',
      infoForeground: '#ffffff',
      card: '#ffffff',
      cardForeground: '#18181b',
      input: '#ffffff',
      inputForeground: '#18181b',
      ring: '#6366f1',
      muted: '#f4f4f5',
      mutedForeground: '#a1a1aa',
    },
    typography: {
      fontHeading: 'inter',
      fontBody: 'inter',
      fontMono: 'source-code',
      fontSizeXs: '0.75rem',
      fontSizeSm: '0.875rem',
      fontSizeBase: '1rem',
      fontSizeLg: '1.125rem',
      fontSizeXl: '1.25rem',
      fontSize2xl: '1.5rem',
      fontSize3xl: '1.875rem',
      fontSize4xl: '2.25rem',
      fontWeightLight: 300,
      fontWeightNormal: 400,
      fontWeightMedium: 500,
      fontWeightSemibold: 600,
      fontWeightBold: 700,
      fontWeightBlack: 900,
      lineHeightTight: 1.25,
      lineHeightNormal: 1.5,
      lineHeightRelaxed: 1.75,
      letterSpacingTight: '-0.05em',
      letterSpacingNormal: '0em',
      letterSpacingWide: '0.05em',
    },
    layout: {
      radiusNone: '0',
      radiusSm: '0.25rem',
      radius: '0.5rem',
      radiusMd: '0.75rem',
      radiusLg: '1rem',
      radiusXl: '1.5rem',
      radius2xl: '2rem',
      radiusFull: '9999px',
      spacingXs: '0.25rem',
      spacingSm: '0.5rem',
      spacing: '1rem',
      spacingMd: '1.5rem',
      spacingLg: '2rem',
      spacingXl: '3rem',
      shadowSm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      shadow: '0 2px 4px 0 rgb(0 0 0 / 0.1)',
      shadowMd: '0 4px 8px -2px rgb(0 0 0 / 0.1)',
      shadowLg: '0 8px 16px -4px rgb(0 0 0 / 0.1)',
      shadowXl: '0 12px 24px -6px rgb(0 0 0 / 0.15)',
    },
    animations: {
      durationFast: '100ms',
      duration: '150ms',
      durationSlow: '200ms',
      durationSlower: '300ms',
      easingDefault: 'cubic-bezier(0.4, 0, 0.2, 1)',
      easingIn: 'cubic-bezier(0.4, 0, 1, 1)',
      easingOut: 'cubic-bezier(0, 0, 0.2, 1)',
      easingBounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    },
    effects: {
      gradientPrimary: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
      gradientAccent: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
      blurSm: '2px',
      blur: '4px',
      blurMd: '8px',
      blurLg: '12px',
      overlayLight: 'rgba(255, 255, 255, 0.8)',
      overlayDark: 'rgba(0, 0, 0, 0.4)',
      glowPrimary: '0 0 15px rgba(99, 102, 241, 0.3)',
      glowAccent: '0 0 15px rgba(20, 184, 166, 0.3)',
    },
  },

  // 4. Custom 1 (Placeholder)
  {
    id: 'custom-1',
    name: 'Tùy chỉnh 1',
    description: 'Theme tùy chỉnh #1',
    isLocked: false,
    colors: {
      primary: '#8b5cf6',
      primaryForeground: '#ffffff',
      secondary: '#f97316',
      secondaryForeground: '#ffffff',
      accent: '#14b8a6',
      accentForeground: '#ffffff',
      background: '#f8fafc',
      backgroundSecondary: '#f1f5f9',
      backgroundTertiary: '#e2e8f0',
      foreground: '#0f172a',
      foregroundSecondary: '#475569',
      foregroundMuted: '#94a3b8',
      border: '#cbd5e1',
      borderHover: '#94a3b8',
      success: '#22c55e',
      successForeground: '#ffffff',
      warning: '#f59e0b',
      warningForeground: '#ffffff',
      error: '#ef4444',
      errorForeground: '#ffffff',
      info: '#3b82f6',
      infoForeground: '#ffffff',
      card: '#ffffff',
      cardForeground: '#0f172a',
      input: '#ffffff',
      inputForeground: '#0f172a',
      ring: '#8b5cf6',
      muted: '#f1f5f9',
      mutedForeground: '#94a3b8',
    },
    typography: {
      fontHeading: 'poppins',
      fontBody: 'inter',
      fontMono: 'source-code',
      fontSizeXs: '0.75rem',
      fontSizeSm: '0.875rem',
      fontSizeBase: '1rem',
      fontSizeLg: '1.125rem',
      fontSizeXl: '1.25rem',
      fontSize2xl: '1.5rem',
      fontSize3xl: '1.875rem',
      fontSize4xl: '2.25rem',
      fontWeightLight: 300,
      fontWeightNormal: 400,
      fontWeightMedium: 500,
      fontWeightSemibold: 600,
      fontWeightBold: 700,
      fontWeightBlack: 900,
      lineHeightTight: 1.25,
      lineHeightNormal: 1.5,
      lineHeightRelaxed: 1.75,
      letterSpacingTight: '-0.05em',
      letterSpacingNormal: '0em',
      letterSpacingWide: '0.05em',
    },
    layout: {
      radiusNone: '0',
      radiusSm: '0.25rem',
      radius: '0.5rem',
      radiusMd: '0.75rem',
      radiusLg: '1rem',
      radiusXl: '1.5rem',
      radius2xl: '2rem',
      radiusFull: '9999px',
      spacingXs: '0.25rem',
      spacingSm: '0.5rem',
      spacing: '1rem',
      spacingMd: '1.5rem',
      spacingLg: '2rem',
      spacingXl: '3rem',
      shadowSm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      shadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
      shadowMd: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
      shadowLg: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
      shadowXl: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    },
  },

  // 5. Custom 2 (Placeholder)
  {
    id: 'custom-2',
    name: 'Tùy chỉnh 2',
    description: 'Theme tùy chỉnh #2',
    isLocked: false,
    colors: {
      primary: '#0ea5e9',
      primaryForeground: '#ffffff',
      secondary: '#f43f5e',
      secondaryForeground: '#ffffff',
      accent: '#22c55e',
      accentForeground: '#ffffff',
      background: '#ffffff',
      backgroundSecondary: '#f0fdf4',
      backgroundTertiary: '#dcfce7',
      foreground: '#14532d',
      foregroundSecondary: '#166534',
      foregroundMuted: '#22c55e',
      border: '#bbf7d0',
      borderHover: '#86efac',
      success: '#16a34a',
      successForeground: '#ffffff',
      warning: '#ca8a04',
      warningForeground: '#ffffff',
      error: '#dc2626',
      errorForeground: '#ffffff',
      info: '#0284c7',
      infoForeground: '#ffffff',
      card: '#ffffff',
      cardForeground: '#14532d',
      input: '#ffffff',
      inputForeground: '#14532d',
      ring: '#0ea5e9',
      muted: '#f0fdf4',
      mutedForeground: '#22c55e',
    },
    typography: {
      fontHeading: 'be-vietnam',
      fontBody: 'be-vietnam',
      fontMono: 'source-code',
      fontSizeXs: '0.75rem',
      fontSizeSm: '0.875rem',
      fontSizeBase: '1rem',
      fontSizeLg: '1.125rem',
      fontSizeXl: '1.25rem',
      fontSize2xl: '1.5rem',
      fontSize3xl: '1.875rem',
      fontSize4xl: '2.25rem',
      fontWeightLight: 300,
      fontWeightNormal: 400,
      fontWeightMedium: 500,
      fontWeightSemibold: 600,
      fontWeightBold: 700,
      fontWeightBlack: 900,
      lineHeightTight: 1.25,
      lineHeightNormal: 1.5,
      lineHeightRelaxed: 1.75,
      letterSpacingTight: '-0.05em',
      letterSpacingNormal: '0em',
      letterSpacingWide: '0.05em',
    },
    layout: {
      radiusNone: '0',
      radiusSm: '0.25rem',
      radius: '0.5rem',
      radiusMd: '0.75rem',
      radiusLg: '1rem',
      radiusXl: '1.5rem',
      radius2xl: '2rem',
      radiusFull: '9999px',
      spacingXs: '0.25rem',
      spacingSm: '0.5rem',
      spacing: '1rem',
      spacingMd: '1.5rem',
      spacingLg: '2rem',
      spacingXl: '3rem',
      shadowSm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      shadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
      shadowMd: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
      shadowLg: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
      shadowXl: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    },
  },
]

// Default theme ID
export const DEFAULT_THEME_ID = 'classic'

// Get theme by ID
export function getThemeById(id: string): Theme | undefined {
  return THEME_PRESETS.find((theme) => theme.id === id)
}

// Get default theme
export function getDefaultTheme(): Theme {
  return getThemeById(DEFAULT_THEME_ID) || THEME_PRESETS[0]
}
