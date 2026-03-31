'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, Palette, Copy, Lock, Unlock } from 'lucide-react';
import {
  presetThemes,
  defaultColors,
  ThemeColors,
  ThemeId,
  applyThemeCSS,
  generateThemeOverrides,
  getThemeById,
} from '@/app/contexts/theme-config';

const BASIC_COLORS = [
  '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6',
  '#3b82f6', '#06b6d4', '#10b981', '#22c55e',
  '#84cc16', '#eab308', '#f97316', '#6366f1',
  '#000000', '#ffffff', '#6b7280', '#9ca3af',
  '#1f2937', '#111827',
];

export default function ThemeSettingsPage() {
  const [currentThemeId, setCurrentThemeId] = useState<ThemeId>('default');
  const [customColors, setCustomColors] = useState<ThemeColors | null>(null);
  const [activeColorPicker, setActiveColorPicker] = useState<string | null>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('site-theme') as ThemeId || 'default';
    const savedCustom = localStorage.getItem('site-custom-colors');
    
    setCurrentThemeId(saved);
    if (savedCustom && saved === 'custom') {
      setCustomColors(JSON.parse(savedCustom));
    }
  }, []);

  const getCurrentColors = (): ThemeColors => {
    if (currentThemeId === 'custom' && customColors) {
      return customColors;
    }
    const theme = getThemeById(currentThemeId);
    return theme.colors;
  };

  const colors = getCurrentColors();

  const isDark = currentThemeId === 'highend' || currentThemeId === 'dark';

  const applyTheme = (themeId: ThemeId, customThemeColors?: ThemeColors) => {
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

    let c: ThemeColors;
    if (customThemeColors) {
      c = customThemeColors;
    } else if (themeId === 'custom' && customColors) {
      c = customColors;
    } else {
      const theme = getThemeById(themeId);
      c = theme.colors;
    }

    const isDarkTheme = themeId === 'highend' || themeId === 'dark';

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

    styleEl.textContent = applyThemeCSS(c) + generateThemeOverrides(c, isDarkTheme);
    document.documentElement.setAttribute('data-theme', themeId);

    setCurrentThemeId(themeId);
  };

  const handleColorChange = (colorKey: keyof ThemeColors, value: string) => {
    const newColors = { ...colors, [colorKey]: value };
    setCustomColors(newColors);
    applyTheme('custom', newColors);
    setActiveColorPicker(null);
  };

  const handlePresetClick = (themeId: ThemeId) => {
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

  const colorLabels: Record<keyof ThemeColors, { label: string; desc: string }> = {
    primary: { label: 'Primary', desc: 'Nút CTA, Vào học tiếp' },
    secondary: { label: 'Secondary', desc: 'Màu nhấn, badge phụ' },
    header: { label: 'Header', desc: 'Thanh điều hướng, NGÂN HÀNG PHƯỚC BÁU' },
    bg: { label: 'Background', desc: 'Nền trang chính' },
    bgSecondary: { label: 'Background 2', desc: 'Nền phụ, card' },
    text: { label: 'Text', desc: 'Màu chữ chính' },
    textSecondary: { label: 'Text Secondary', desc: 'Màu chữ mờ, mô tả' },
    accent: { label: 'Accent', desc: 'Màu nhấn phụ' },
    border: { label: 'Border', desc: 'Đường viền' },
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
          <h2 className="text-lg font-semibold mb-4">Giao diện có sẵn</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {presetThemes.map((theme) => {
              const isActive = currentThemeId === theme.id && !customColors;
              return (
                <button
                  key={theme.id}
                  onClick={() => handlePresetClick(theme.id)}
                  className={`p-3 rounded-lg border-2 transition-all text-left relative ${
                    isActive ? 'border-amber-500 ring-2 ring-amber-200' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {theme.locked && (
                    <Lock className="absolute top-2 right-2 h-3 w-3 text-gray-400" />
                  )}
                  <div className="flex gap-1 mb-2">
                    <div className="w-6 h-6 rounded border" style={{ backgroundColor: theme.colors.primary }} />
                    <div className="w-6 h-6 rounded border" style={{ backgroundColor: theme.colors.secondary }} />
                    <div className="w-6 h-6 rounded border" style={{ backgroundColor: theme.colors.bg }} />
                    <div className="w-6 h-6 rounded border" style={{ backgroundColor: theme.colors.text }} />
                  </div>
                  <p className="text-xs font-medium truncate">{theme.icon} {theme.name}</p>
                  {isActive && (
                    <span className="text-[10px] text-green-600 flex items-center gap-1">
                      <Check className="h-3 w-3" /> Đang dùng
                    </span>
                  )}
                </button>
              );
            })}
            {/* Custom Theme */}
            <button
              onClick={() => handlePresetClick('custom')}
              className={`p-3 rounded-lg border-2 transition-all text-left ${
                currentThemeId === 'custom' ? 'border-amber-500 ring-2 ring-amber-200' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Unlock className="absolute top-2 right-2 h-3 w-3 text-amber-500" />
              <div className="flex gap-1 mb-2">
                <div className="w-6 h-6 rounded border" style={{ backgroundColor: customColors?.primary || '#6366f1' }} />
                <div className="w-6 h-6 rounded border" style={{ backgroundColor: customColors?.secondary || '#ec4899' }} />
                <div className="w-6 h-6 rounded border" style={{ backgroundColor: customColors?.bg || '#fafafa' }} />
                <div className="w-6 h-6 rounded border" style={{ backgroundColor: customColors?.text || '#18181b' }} />
              </div>
              <p className="text-xs font-medium truncate">🎨 Tùy biến</p>
              {currentThemeId === 'custom' && (
                <span className="text-[10px] text-green-600 flex items-center gap-1">
                  <Check className="h-3 w-3" /> Đang dùng
                </span>
              )}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            <Lock className="inline h-3 w-3 mr-1" />
            Các giao diện có sẵn (trừ Tùy biến) là cố định, không thể chỉnh sửa màu.
          </p>
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
                <Copy className="h-3 w-3" /> Khôi phục mặc định
              </button>
            )}
          </div>

          <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
            {currentThemeId === 'custom' ? (
              <span className="text-green-600">✓ Đang chỉnh sửa - Thay đổi sẽ được lưu</span>
            ) : (
              <span>Chọn <strong>Tùy biến</strong> để thay đổi màu sắc. Các theme cố định chỉ hiển thị màu.</span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(Object.keys(colorLabels) as (keyof ThemeColors)[]).map((colorKey) => (
              <div key={colorKey} className={`relative ${currentThemeId !== 'custom' ? 'opacity-60' : ''}`}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {colorLabels[colorKey].label}
                  {currentThemeId !== 'custom' && <Lock className="inline h-3 w-3 ml-1 text-gray-400" />}
                </label>
                <p className="text-xs text-gray-500 mb-2">{colorLabels[colorKey].desc}</p>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => currentThemeId === 'custom' && setActiveColorPicker(colorKey)}
                    className="w-12 h-12 rounded-lg border-2 border-gray-300 shadow-sm transition-transform hover:scale-105"
                    style={{ backgroundColor: colors[colorKey] }}
                    disabled={currentThemeId !== 'custom'}
                  />
                  <input
                    type="text"
                    value={colors[colorKey]}
                    onChange={(e) => {
                      if (currentThemeId !== 'custom') return;
                      const val = e.target.value;
                      if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                        handleColorChange(colorKey, val);
                      }
                    }}
                    className={`flex-1 px-3 py-2 text-sm font-mono border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 ${
                      currentThemeId !== 'custom' ? 'bg-gray-100 cursor-not-allowed' : ''
                    }`}
                    readOnly={currentThemeId !== 'custom'}
                  />
                  <button
                    onClick={() => currentThemeId === 'custom' && copyHex(colors[colorKey])}
                    className={`p-2 ${currentThemeId !== 'custom' ? 'text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
                    title="Copy HEX"
                    disabled={currentThemeId !== 'custom'}
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>

                {/* Color Picker Popup */}
                {activeColorPicker === colorKey && currentThemeId === 'custom' && (
                  <div className="absolute z-50 mt-2 p-3 bg-white rounded-xl shadow-xl border">
                    <input
                      ref={colorInputRef}
                      type="color"
                      value={colors[colorKey]}
                      onChange={(e) => handleColorChange(colorKey, e.target.value)}
                      className="w-full h-28 cursor-pointer rounded-lg mb-2"
                    />
                    <div className="grid grid-cols-6 gap-1 mb-2">
                      {BASIC_COLORS.map((presetColor) => (
                        <button
                          key={presetColor}
                          onClick={() => handleColorChange(colorKey, presetColor)}
                          className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                          style={{ backgroundColor: presetColor }}
                          title={presetColor}
                        />
                      ))}
                    </div>
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
                Giao diện tùy biến đang được áp dụng!
              </p>
            </div>
          )}
        </div>

        {/* Preview */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Xem trước</h2>
          <div className="rounded-xl overflow-hidden border" style={{ borderColor: colors.text + '20' }}>
            <div className="p-4 flex items-center gap-3" style={{ backgroundColor: colors.header }}>
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-black"
                style={{ backgroundColor: colors.primary }}
              >
                B
              </div>
              <span className="font-bold" style={{ color: colors.text }}>Học Viện BRK</span>
              <nav className="ml-auto flex gap-4 text-sm" style={{ color: colors.primary }}>
                Trang chủ
              </nav>
            </div>
            <div className="p-6 space-y-4" style={{ backgroundColor: colors.bg, color: colors.text }}>
              <div
                className="p-4 rounded-lg"
                style={{ backgroundColor: colors.bgSecondary }}
              >
                <h3 className="font-semibold" style={{ color: colors.text }}>Tiêu đề Card</h3>
                <p className="text-sm" style={{ color: colors.textSecondary }}>Mô tả với màu secondary</p>
                <span
                  className="inline-block px-2 py-0.5 rounded text-xs font-medium mt-2"
                  style={{ backgroundColor: colors.secondary, color: '#fff' }}
                >
                  Tag phụ
                </span>
              </div>
              <div className="flex gap-3">
                <button
                  className="px-4 py-2 rounded-lg font-semibold text-white"
                  style={{ backgroundColor: colors.primary }}
                >
                  Primary
                </button>
                <button
                  className="px-4 py-2 rounded-lg font-semibold text-white"
                  style={{ backgroundColor: colors.secondary }}
                >
                  Secondary
                </button>
                <button
                  className="px-4 py-2 rounded-lg font-semibold"
                  style={{ backgroundColor: colors.accent, color: '#000' }}
                >
                  Accent
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Reference */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">Tham khảo nhanh</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 text-sm">
          <div className="p-3 bg-amber-50 rounded-lg">
            <p className="font-medium text-amber-800">Primary</p>
            <p className="text-xs text-amber-600">Nút CTA, Vào học tiếp</p>
          </div>
          <div className="p-3 rounded-lg" style={{ backgroundColor: '#f0f9ff' }}>
            <p className="font-medium text-sky-800">Secondary</p>
            <p className="text-xs text-sky-600">Màu nhấn phụ</p>
          </div>
          <div className="p-3 rounded-lg" style={{ backgroundColor: '#fdf4ff' }}>
            <p className="font-medium text-fuchsia-800">Header</p>
            <p className="text-xs text-fuchsia-600">Thanh điều hướng</p>
          </div>
          <div className="p-3 bg-gray-100 rounded-lg">
            <p className="font-medium text-gray-800">Background</p>
            <p className="text-xs text-gray-600">Nền trang</p>
          </div>
          <div className="p-3 bg-gray-800 rounded-lg">
            <p className="font-medium text-white">Text</p>
            <p className="text-xs text-gray-300">Màu chữ</p>
          </div>
        </div>
      </div>
    </div>
  );
}
