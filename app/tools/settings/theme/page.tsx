'use client';

import { useState, useEffect, useRef } from 'react';
import { Check, Palette, Copy, Lock, Unlock, Table2, ChevronDown, ChevronUp } from 'lucide-react';
import {
  presetThemes,
  ThemeColors,
  ThemeId,
  generateThemeCSS,
  getThemeById,
  isDarkTheme,
} from '@/app/contexts/theme-config';
import MainHeader from '@/components/layout/MainHeader';

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
  const [showColorTable, setShowColorTable] = useState(false);
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

  const isDark = isDarkTheme(currentThemeId);

  const applyTheme = (themeId: ThemeId, customThemeColors?: ThemeColors) => {
    let c: ThemeColors;
    if (themeId === 'default') {
      c = presetThemes[0].colors; // Royal Empire là default
    } else if (customThemeColors) {
      c = customThemeColors;
    } else if (themeId === 'custom' && customColors) {
      c = customColors;
    } else {
      const theme = getThemeById(themeId);
      c = theme.colors;
    }

    const isDarkMode = isDarkTheme(themeId);

    localStorage.setItem('site-theme', themeId);
    if (themeId === 'custom' && customThemeColors) {
      localStorage.setItem('site-custom-colors', JSON.stringify(customThemeColors));
    }
    
    // Inject vào cùng style element với ThemeContext và Header
    let styleEl = document.getElementById('theme-base-css');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'theme-base-css';
      document.head.appendChild(styleEl);
    }

    styleEl.textContent = generateThemeCSS(c, isDarkMode);
    document.documentElement.setAttribute('data-theme', themeId);

    setCurrentThemeId(themeId);
    if (themeId === 'default') {
      setCustomColors(null);
    }
  };

  const handleColorChange = (colorKey: keyof ThemeColors, value: string) => {
    const newColors = { ...colors, [colorKey]: value };
    setCustomColors(newColors);
    applyTheme('custom', newColors);
    setActiveColorPicker(null);
  };

  const handlePresetClick = (themeId: ThemeId) => {
    setCustomColors(null)
    localStorage.removeItem('site-custom-colors')
    applyTheme(themeId)
    // Reload to ensure CSS updates across entire site
    setTimeout(() => window.location.reload(), 100)
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
    onPrimary: { label: 'On Primary', desc: 'Chữ trên nút primary' },
    surface: { label: 'Surface', desc: 'Nền card, modal, panel' },
    onSurface: { label: 'On Surface', desc: 'Chữ chính trên surface' },
    background: { label: 'Background', desc: 'Nền trang chính' },
    muted: { label: 'Muted', desc: 'Chữ mờ, mô tả' },
    accent: { label: 'Accent', desc: 'Màu nhấn (progress, badges)' },
    outline: { label: 'Outline', desc: 'Đường viền' },
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <MainHeader title="GIAO DIỆN" toolSlug="theme" />

      <div className="p-4 max-w-4xl mx-auto space-y-4">
        {/* Preset Themes */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Giao diện có sẵn</h2>
            <button
              onClick={() => setShowColorTable(!showColorTable)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Table2 className="h-4 w-4" />
              {showColorTable ? 'Ẩn bảng màu' : 'Bảng màu đầy đủ'}
              {showColorTable ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
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
                    <div className="w-6 h-6 rounded border" style={{ backgroundColor: theme.colors.accent }} />
                    <div className="w-6 h-6 rounded border" style={{ backgroundColor: theme.colors.background }} />
                    <div className="w-6 h-6 rounded border" style={{ backgroundColor: theme.colors.onSurface }} />
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
                <div className="w-6 h-6 rounded border" style={{ backgroundColor: customColors?.accent || '#ec4899' }} />
                <div className="w-6 h-6 rounded border" style={{ backgroundColor: customColors?.background || '#fafafa' }} />
                <div className="w-6 h-6 rounded border" style={{ backgroundColor: customColors?.onSurface || '#18181b' }} />
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

        {/* Bảng màu đầy đủ */}
        {showColorTable && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Bảng tham chiếu màu - Theme hiện tại</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 font-semibold text-gray-600">CSS Class</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-600">Màu</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-600">HEX</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-600">Ý nghĩa</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Primary */}
                  <tr className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-3 font-mono text-xs">text-brk-primary</td>
                    <td className="py-2 px-3"><div className="w-6 h-6 rounded border border-gray-300" style={{ backgroundColor: colors.primary }} /></td>
                    <td className="py-2 px-3 font-mono text-xs cursor-pointer hover:text-blue-600" onClick={() => copyHex(colors.primary)} title="Click để copy">{colors.primary}</td>
                    <td className="py-2 px-3 text-gray-500">Chữ màu chính</td>
                  </tr>
                  <tr className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-3 font-mono text-xs">bg-brk-primary</td>
                    <td className="py-2 px-3"><div className="w-6 h-6 rounded border border-gray-300" style={{ backgroundColor: colors.primary }} /></td>
                    <td className="py-2 px-3 font-mono text-xs cursor-pointer hover:text-blue-600" onClick={() => copyHex(colors.primary)} title="Click để copy">{colors.primary}</td>
                    <td className="py-2 px-3 text-gray-500">Nền nút CTA, buttons</td>
                  </tr>
                  <tr className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-3 font-mono text-xs">text-brk-on-primary</td>
                    <td className="py-2 px-3"><div className="w-6 h-6 rounded border border-gray-300" style={{ backgroundColor: colors.onPrimary }} /></td>
                    <td className="py-2 px-3 font-mono text-xs cursor-pointer hover:text-blue-600" onClick={() => copyHex(colors.onPrimary)} title="Click để copy">{colors.onPrimary}</td>
                    <td className="py-2 px-3 text-gray-500">Chữ trên nút primary</td>
                  </tr>
                  {/* Surface */}
                  <tr className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-3 font-mono text-xs">bg-brk-surface</td>
                    <td className="py-2 px-3"><div className="w-6 h-6 rounded border border-gray-300" style={{ backgroundColor: colors.surface }} /></td>
                    <td className="py-2 px-3 font-mono text-xs cursor-pointer hover:text-blue-600" onClick={() => copyHex(colors.surface)} title="Click để copy">{colors.surface}</td>
                    <td className="py-2 px-3 text-gray-500">Nền cards, modal, panel</td>
                  </tr>
                  <tr className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-3 font-mono text-xs">text-brk-on-surface</td>
                    <td className="py-2 px-3"><div className="w-6 h-6 rounded border border-gray-300" style={{ backgroundColor: colors.onSurface }} /></td>
                    <td className="py-2 px-3 font-mono text-xs cursor-pointer hover:text-blue-600" onClick={() => copyHex(colors.onSurface)} title="Click để copy">{colors.onSurface}</td>
                    <td className="py-2 px-3 text-gray-500">Chữ chính trên surface</td>
                  </tr>
                  {/* Background */}
                  <tr className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-3 font-mono text-xs">bg-brk-background</td>
                    <td className="py-2 px-3"><div className="w-6 h-6 rounded border border-gray-300" style={{ backgroundColor: colors.background }} /></td>
                    <td className="py-2 px-3 font-mono text-xs cursor-pointer hover:text-blue-600" onClick={() => copyHex(colors.background)} title="Click để copy">{colors.background}</td>
                    <td className="py-2 px-3 text-gray-500">Nền trang chính</td>
                  </tr>
                  {/* Muted */}
                  <tr className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-3 font-mono text-xs">text-brk-muted</td>
                    <td className="py-2 px-3"><div className="w-6 h-6 rounded border border-gray-300" style={{ backgroundColor: colors.muted }} /></td>
                    <td className="py-2 px-3 font-mono text-xs cursor-pointer hover:text-blue-600" onClick={() => copyHex(colors.muted)} title="Click để copy">{colors.muted}</td>
                    <td className="py-2 px-3 text-gray-500">Chữ mờ, mô tả phụ</td>
                  </tr>
                  {/* Accent */}
                  <tr className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-3 font-mono text-xs">text-brk-accent</td>
                    <td className="py-2 px-3"><div className="w-6 h-6 rounded border border-gray-300" style={{ backgroundColor: colors.accent }} /></td>
                    <td className="py-2 px-3 font-mono text-xs cursor-pointer hover:text-blue-600" onClick={() => copyHex(colors.accent)} title="Click để copy">{colors.accent}</td>
                    <td className="py-2 px-3 text-gray-500">Màu nhấn (progress, badges)</td>
                  </tr>
                  <tr className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-3 font-mono text-xs">bg-brk-accent</td>
                    <td className="py-2 px-3"><div className="w-6 h-6 rounded border border-gray-300" style={{ backgroundColor: colors.accent }} /></td>
                    <td className="py-2 px-3 font-mono text-xs cursor-pointer hover:text-blue-600" onClick={() => copyHex(colors.accent)} title="Click để copy">{colors.accent}</td>
                    <td className="py-2 px-3 text-gray-500">Background màu nhấn</td>
                  </tr>
                  {/* Outline */}
                  <tr className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-3 font-mono text-xs">border-brk-outline</td>
                    <td className="py-2 px-3"><div className="w-6 h-6 rounded border border-gray-300" style={{ backgroundColor: colors.outline }} /></td>
                    <td className="py-2 px-3 font-mono text-xs cursor-pointer hover:text-blue-600" onClick={() => copyHex(colors.outline)} title="Click để copy">{colors.outline}</td>
                    <td className="py-2 px-3 text-gray-500">Viền borders</td>
                  </tr>
                  {/* Variants */}
                  <tr className="bg-gray-50">
                    <td colSpan={4} className="py-2 px-3 font-semibold text-gray-500 text-xs">Các biến thể màu (alpha/opacity)</td>
                  </tr>
                  <tr className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-3 font-mono text-xs">bg-brk-accent-10</td>
                    <td className="py-2 px-3"><div className="w-6 h-6 rounded border border-gray-300" style={{ backgroundColor: colors.accent + '1A' }} /></td>
                    <td className="py-2 px-3 font-mono text-xs">{colors.accent}1A</td>
                    <td className="py-2 px-3 text-gray-500">Background accent 10% opacity</td>
                  </tr>
                  <tr className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-3 font-mono text-xs">bg-brk-accent-20</td>
                    <td className="py-2 px-3"><div className="w-6 h-6 rounded border border-gray-300" style={{ backgroundColor: colors.accent + '33' }} /></td>
                    <td className="py-2 px-3 font-mono text-xs">{colors.accent}33</td>
                    <td className="py-2 px-3 text-gray-500">Background accent 20% opacity</td>
                  </tr>
                  <tr className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-3 font-mono text-xs">text-brk-primary-75</td>
                    <td className="py-2 px-3"><div className="w-6 h-6 rounded border border-gray-300" style={{ backgroundColor: colors.primary + 'BF' }} /></td>
                    <td className="py-2 px-3 font-mono text-xs">{colors.primary}BF</td>
                    <td className="py-2 px-3 text-gray-500">Primary 75% opacity</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-400 mt-3">Click vào HEX để copy. Bảng màu cập nhật theo theme đang chọn.</p>
          </div>
        )}

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
          <div className="rounded-xl overflow-hidden border" style={{ borderColor: colors.onSurface + '20' }}>
            <div className="p-4 flex items-center gap-3" style={{ backgroundColor: colors.surface }}>
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-black"
                style={{ backgroundColor: colors.primary }}
              >
                B
              </div>
              <span className="font-bold" style={{ color: colors.onSurface }}>Học Viện BRK</span>
              <nav className="ml-auto flex gap-4 text-sm" style={{ color: colors.primary }}>
                Trang chủ
              </nav>
            </div>
            <div className="p-6 space-y-4" style={{ backgroundColor: colors.background, color: colors.onSurface }}>
              <div
                className="p-4 rounded-lg"
                style={{ backgroundColor: colors.surface }}
              >
                <h3 className="font-semibold" style={{ color: colors.onSurface }}>Tiêu đề Card</h3>
                <p className="text-sm" style={{ color: colors.muted }}>Mô tả với màu muted</p>
                <span
                  className="inline-block px-2 py-0.5 rounded text-xs font-medium mt-2"
                  style={{ backgroundColor: colors.accent, color: '#fff' }}
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
                  style={{ backgroundColor: colors.accent }}
                >
                  Accent
                </button>
                <button
                  className="px-4 py-2 rounded-lg font-semibold"
                  style={{ backgroundColor: colors.outline, color: colors.onSurface }}
                >
                  Outline
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
