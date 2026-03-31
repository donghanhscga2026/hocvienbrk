'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, Palette, Copy, RotateCcw } from 'lucide-react';

const presetThemes = [
  {
    id: 'default',
    name: 'Mặc định',
    colors: {
      primary: '#f59e0b',
      secondary: '#000000',
      bg: '#ffffff',
      text: '#171717',
      textSecondary: '#6b7280',
    },
  },
  {
    id: 'highend',
    name: 'High-End Business',
    colors: {
      primary: '#D4AF37',
      secondary: '#0f1419',
      bg: '#0f1419',
      text: '#ffffff',
      textSecondary: '#9ca3af',
    },
  },
  {
    id: 'dark',
    name: 'Dark Mode',
    colors: {
      primary: '#3b82f6',
      secondary: '#0f172a',
      bg: '#0f172a',
      text: '#f8fafc',
      textSecondary: '#94a3b8',
    },
  },
  {
    id: 'light',
    name: 'Light Mode',
    colors: {
      primary: '#6366f1',
      secondary: '#ec4899',
      bg: '#fafafa',
      text: '#18181b',
      textSecondary: '#71717a',
    },
  },
];

interface CustomTheme {
  primary: string;
  secondary: string;
  bg: string;
  text: string;
  textSecondary: string;
}

export default function ThemeSettingsPage() {
  const [currentThemeId, setCurrentThemeId] = useState('default');
  const [customColors, setCustomColors] = useState<CustomTheme | null>(null);
  const [activeColorPicker, setActiveColorPicker] = useState<string | null>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('site-theme') || 'default';
    const savedCustom = localStorage.getItem('site-custom-colors');
    
    setCurrentThemeId(saved);
    if (savedCustom) {
      setCustomColors(JSON.parse(savedCustom));
    }
  }, []);

  const getCurrentColors = (): CustomTheme => {
    if (currentThemeId === 'custom' && customColors) {
      return customColors;
    }
    const theme = presetThemes.find(t => t.id === currentThemeId) || presetThemes[0];
    return theme.colors;
  };

  const colors = getCurrentColors();

  const applyTheme = (themeId: string, customThemeColors?: CustomTheme) => {
    // DEFAULT: Xóa hết CSS overrides
    if (themeId === 'default') {
      localStorage.setItem('site-theme', 'default');
      const styleEl = document.getElementById('theme-overrides');
      if (styleEl) {
        styleEl.textContent = '';
      }
      document.documentElement.removeAttribute('data-theme');
      setCurrentThemeId('default');
      setCustomColors(null);
      return;
    }

    let c: CustomTheme;
    if (customThemeColors) {
      c = customThemeColors;
    } else if (themeId === 'custom' && customColors) {
      c = customColors;
    } else {
      c = presetThemes.find(t => t.id === themeId)?.colors || presetThemes[0].colors;
    }
    const isDark = themeId === 'highend' || themeId === 'dark' || themeId === 'custom';

    localStorage.setItem('site-theme', themeId);
    if (themeId === 'custom' && customThemeColors) {
      localStorage.setItem('site-custom-colors', JSON.stringify(customThemeColors));
    }
    
    let styleEl = document.getElementById('theme-overrides');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'theme-overrides';
      document.head.appendChild(styleEl);
    }

    styleEl.textContent = `
      /* PRIMARY (Gold) */
      .bg-amber-500, .bg-orange-500, .bg-amber-400, .bg-emerald-600 {
        background-color: ${c.primary} !important;
      }
      .bg-amber-500:hover, .bg-orange-500:hover, .bg-amber-400:hover, .bg-emerald-600:hover {
        background-color: ${c.primary} !important;
        filter: brightness(0.9);
      }
      .text-yellow-400, .text-yellow-500 {
        color: ${c.primary} !important;
      }
      .border-yellow-400 {
        border-color: ${c.primary} !important;
      }
      .hover\\:text-yellow-400:hover, nav a:hover {
        color: ${c.primary} !important;
      }
      .bg-yellow-400.text-xs {
        background-color: ${c.primary} !important;
        color: ${isDark ? '#000' : '#fff'} !important;
      }
      
      /* SECONDARY / HEADER */
      header, header[class*="fixed"], header[class*="bg-black"] {
        background-color: ${c.secondary} !important;
      }
      .bg-zinc-900, .bg-zinc-950 {
        background-color: ${isDark ? c.secondary : '#f3f4f6'} !important;
      }
      
      /* NGÂN HÀNG PHƯỚC BÁU - HEADER COLOR */
      .text-glow-3d {
        color: ${c.secondary} !important;
        text-shadow: 0 0 10px ${c.secondary}40, 0 0 20px ${c.secondary}40 !important;
      }
      
      /* BADGES - HEADER COLOR */
      .bg-sky-500, button[class*="bg-sky"] {
        background-color: ${c.secondary} !important;
      }
      
      /* TEXT */
      body {
        background-color: ${c.bg} !important;
        color: ${c.text} !important;
      }
      .text-white {
        color: ${isDark ? '#ffffff' : c.text} !important;
      }
      .text-gray-900, .text-zinc-900 {
        color: ${isDark ? '#ffffff' : '#111827'} !important;
      }
      .text-gray-500, .text-zinc-500 {
        color: ${c.textSecondary} !important;
      }
      .text-gray-600, .text-zinc-600 {
        color: ${isDark ? '#d4d4d8' : '#4b5563'} !important;
      }
      .text-white\\/40, .text-white\\/60, .text-white\\/80 {
        color: ${isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'} !important;
      }
      
      /* BACKGROUNDS */
      .bg-gray-50 {
        background-color: ${isDark ? 'rgba(255,255,255,0.05)' : '#f9fafb'} !important;
      }
      .bg-gray-100 {
        background-color: ${isDark ? 'rgba(255,255,255,0.05)' : '#f3f4f6'} !important;
      }
      .bg-white.rounded-xl, .bg-white.rounded-lg, .bg-white.rounded-2xl {
        background-color: ${isDark ? 'rgba(255,255,255,0.05)' : '#ffffff'} !important;
      }
      footer {
        background-color: ${isDark ? c.bg : '#f3f4f6'} !important;
      }
      footer p, footer span {
        color: ${c.textSecondary} !important;
      }
      
      /* BORDERS */
      .border-white\\/20 {
        border-color: ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'} !important;
      }
      .border-zinc-800, .border-zinc-700 {
        border-color: ${isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb'} !important;
      }
      .border-gray-200 {
        border-color: ${isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb'} !important;
      }
      
      /* MODAL */
      .bg-zinc-950 {
        background-color: ${isDark ? '#09090b' : '#ffffff'} !important;
      }
      
      /* HERO */
      .bg-gradient-to-br {
        background: ${isDark ? c.bg : 'linear-gradient(to bottom right, #000, #18181b)'} !important;
      }
    `;

    setCurrentThemeId(themeId);
  };

  const handleColorChange = (colorKey: keyof CustomTheme, value: string) => {
    const newColors = { ...colors, [colorKey]: value };
    setCustomColors(newColors);
    applyTheme('custom', newColors);
    setActiveColorPicker(null);
  };

  const handlePresetClick = (themeId: string) => {
    setCustomColors(null);
    localStorage.removeItem('site-custom-colors');
    applyTheme(themeId);
  };

  const handleReset = () => {
    setCustomColors(null);
    localStorage.removeItem('site-custom-colors');
    applyTheme('default');
  };

  const copyHex = (hex: string) => {
    navigator.clipboard.writeText(hex);
  };

  const colorLabels: Record<keyof CustomTheme, { label: string; desc: string }> = {
    primary: { label: 'Primary', desc: 'Nút CTA, Vào học tiếp' },
    secondary: { label: 'Header', desc: 'Thanh điều hướng, Đã kích hoạt, NGÂN HÀNG PHƯỚC BÁU' },
    bg: { label: 'Background', desc: 'Nền trang chính' },
    text: { label: 'Text', desc: 'Màu chữ chính' },
    textSecondary: { label: 'Text Secondary', desc: 'Màu chữ mờ, mô tả' },
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-black text-white shadow-lg sticky top-0 z-50">
        <div className="flex items-center justify-between p-4 max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <Link href="/admin/settings" className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-white/10 hover:bg-white/20">
              <ArrowLeft className="h-4 w-4" />
              <span className="text-xs font-medium">Quay ra</span>
            </Link>
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-yellow-400" />
              <h1 className="text-lg font-bold text-yellow-400">Giao diện</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="p-4 max-w-4xl mx-auto space-y-4">
        {/* Preset Themes */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Theme có sẵn</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {presetThemes.map((theme) => {
              const isActive = currentThemeId === theme.id && !customColors;
              return (
                <button
                  key={theme.id}
                  onClick={() => handlePresetClick(theme.id)}
                  className={`p-3 rounded-lg border-2 transition-all text-left ${
                    isActive ? 'border-amber-500 ring-2 ring-amber-200' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex gap-1 mb-2">
                    <div className="w-6 h-6 rounded border" style={{ backgroundColor: theme.colors.primary }} />
                    <div className="w-6 h-6 rounded border" style={{ backgroundColor: theme.colors.secondary }} />
                    <div className="w-6 h-6 rounded border" style={{ backgroundColor: theme.colors.bg }} />
                    <div className="w-6 h-6 rounded border" style={{ backgroundColor: theme.colors.text }} />
                  </div>
                  <p className="text-xs font-medium truncate">{theme.name}</p>
                  {isActive && (
                    <span className="text-[10px] text-green-600 flex items-center gap-1">
                      <Check className="h-3 w-3" /> Đang dùng
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Colors */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Tùy chỉnh màu sắc</h2>
            {currentThemeId === 'custom' && (
              <button
                onClick={handleReset}
                className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
              >
                <RotateCcw className="h-3 w-3" /> Reset
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(Object.keys(colorLabels) as (keyof CustomTheme)[]).map((colorKey) => (
              <div key={colorKey} className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {colorLabels[colorKey].label}
                </label>
                <p className="text-xs text-gray-500 mb-2">{colorLabels[colorKey].desc}</p>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveColorPicker(colorKey)}
                    className="w-12 h-12 rounded-lg border-2 border-gray-300 shadow-sm transition-transform hover:scale-105"
                    style={{ backgroundColor: colors[colorKey] }}
                  />
                  <input
                    type="text"
                    value={colors[colorKey]}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                        handleColorChange(colorKey, val);
                      }
                    }}
                    className="flex-1 px-3 py-2 text-sm font-mono border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                  <button
                    onClick={() => copyHex(colors[colorKey])}
                    className="p-2 text-gray-400 hover:text-gray-600"
                    title="Copy HEX"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>

                {/* Color Picker Popup */}
                {activeColorPicker === colorKey && (
                  <div className="absolute z-50 mt-2 p-3 bg-white rounded-xl shadow-xl border">
                    <input
                      ref={colorInputRef}
                      type="color"
                      value={colors[colorKey]}
                      onChange={(e) => handleColorChange(colorKey, e.target.value)}
                      className="w-40 h-32 cursor-pointer rounded-lg"
                    />
                    <p className="text-xs text-center text-gray-500 mt-2">
                      Click hoặc nhập HEX bên trên
                    </p>
                    <button
                      onClick={() => setActiveColorPicker(null)}
                      className="mt-2 w-full px-3 py-1.5 text-xs bg-gray-100 rounded-lg hover:bg-gray-200"
                    >
                      Đóng
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {currentThemeId === 'custom' && (
            <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-green-700 flex items-center gap-2">
                <Check className="h-4 w-4" />
                Custom theme đang được áp dụng!
              </p>
            </div>
          )}
        </div>

        {/* Preview */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Xem trước</h2>
          <div className="rounded-xl overflow-hidden border" style={{ borderColor: colors.text + '20' }}>
            <div className="p-4 flex items-center gap-3" style={{ backgroundColor: colors.secondary }}>
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-black"
                style={{ backgroundColor: colors.primary }}
              >
                B
              </div>
              <span className="font-bold text-white">Học Viện BRK</span>
              <nav className="ml-auto flex gap-4 text-sm" style={{ color: colors.primary }}>
                Trang chủ
              </nav>
            </div>
            <div className="p-6 space-y-4" style={{ backgroundColor: colors.bg, color: colors.text }}>
              <div
                className="p-4 rounded-lg"
                style={{ backgroundColor: currentThemeId === 'custom' ? 'rgba(255,255,255,0.05)' : colors.bg === '#0f1419' ? 'rgba(255,255,255,0.05)' : '#f9fafb' }}
              >
                <h3 className="font-semibold" style={{ color: colors.text }}>Tiêu đề Card</h3>
                <p className="text-sm" style={{ color: colors.textSecondary }}>Mô tả với màu secondary</p>
                <span
                  className="inline-block px-2 py-0.5 rounded text-xs font-medium mt-2"
                  style={{ backgroundColor: colors.secondary, color: '#fff' }}
                >
                  Tag Header
                </span>
              </div>
              <div className="flex gap-3">
                <button
                  className="px-4 py-2 rounded-lg font-semibold text-white"
                  style={{ backgroundColor: colors.primary }}
                >
                  Primary (Gold)
                </button>
                <button
                  className="px-4 py-2 rounded-lg font-semibold text-white"
                  style={{ backgroundColor: colors.secondary }}
                >
                  Header
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Reference */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Tham khảo nhanh</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="p-3 bg-amber-50 rounded-lg">
              <p className="font-medium text-amber-800">Primary</p>
              <p className="text-xs text-amber-600">Nút CTA, Vào học tiếp</p>
            </div>
            <div className="p-3 rounded-lg" style={{ backgroundColor: '#f0f9ff' }}>
              <p className="font-medium text-sky-800">Secondary</p>
              <p className="text-xs text-sky-600">Header, badges, NGÂN HÀNG</p>
            </div>
            <div className="p-3 bg-gray-100 rounded-lg">
              <p className="font-medium text-gray-800">Background</p>
              <p className="text-xs text-gray-600">Nền trang</p>
            </div>
            <div className="p-3 bg-gray-800 rounded-lg">
              <p className="font-medium text-white">Text</p>
              <p className="text-xs text-gray-300">Màu chữ chính</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
