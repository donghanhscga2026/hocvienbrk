'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Save, CheckCircle2, Check } from 'lucide-react'
import MainHeader from '@/components/layout/MainHeader'
import {
    updateAttentionHighlightConfig,
    updateAttentionHighlightItems,
} from '@/app/actions/attention-highlight-actions'
import type { AttentionHighlightConfig, AttentionHighlightItem } from '@/lib/attention-highlight-types'
import {
    ATTN_BG_TOKEN_OPTIONS,
    ATTN_TEXT_TOKEN_OPTIONS,
    bgTokenToCssVar,
    textTokenToCssVar,
} from '@/lib/attention-highlight-theme'
import { presetThemes, generateThemeCSS, isDarkTheme, type ThemeId } from '@/app/contexts/theme-config'

interface Props {
    initialConfig: AttentionHighlightConfig
    initialItems: AttentionHighlightItem[]
}

// Áp dụng theme site-wide ngay lập tức (giống hệt /tools/settings/theme) — để
// admin đổi thử theme ngay tại đây và thấy tooltip/đối tượng đổi màu theo, mà
// không cần rời trang. CSS variables cập nhật live nên preview đổi ngay, không cần reload.
function applyThemeLive(themeId: ThemeId) {
    const theme = presetThemes.find(t => t.id === themeId) || presetThemes[0]
    localStorage.setItem('site-theme', themeId)
    let styleEl = document.getElementById('theme-base-css')
    if (!styleEl) {
        styleEl = document.createElement('style')
        styleEl.id = 'theme-base-css'
        document.head.appendChild(styleEl)
    }
    styleEl.textContent = generateThemeCSS(theme.colors, isDarkTheme(themeId))
    document.documentElement.setAttribute('data-theme', themeId)
}

export default function AttentionTooltipSettingsClient({ initialConfig, initialItems }: Props) {
    const router = useRouter()
    const [config, setConfig] = useState<AttentionHighlightConfig>(initialConfig)
    const [items, setItems] = useState<AttentionHighlightItem[]>(initialItems)
    const [saving, setSaving] = useState(false)
    const [savedAt, setSavedAt] = useState<number | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [previewThemeId, setPreviewThemeId] = useState<ThemeId>('default')
    const [previewText, setPreviewText] = useState('Ngân hàng Phước báu — thử gõ nội dung dài hơn để xem tự xuống dòng')
    const [previewObjectText, setPreviewObjectText] = useState('Thoát ra')

    useEffect(() => {
        const saved = (localStorage.getItem('site-theme') as ThemeId) || 'default'
        setPreviewThemeId(saved)
    }, [])

    const groups = useMemo(() => {
        const map = new Map<string, AttentionHighlightItem[]>()
        for (const item of items) {
            if (!map.has(item.group)) map.set(item.group, [])
            map.get(item.group)!.push(item)
        }
        return Array.from(map.entries())
    }, [items])

    const updateItem = (id: string, patch: Partial<Pick<AttentionHighlightItem, 'tooltip' | 'enabled'>>) => {
        setItems(prev => prev.map(it => it.id === id ? { ...it, ...patch } : it))
    }

    const handleSelectTheme = (themeId: ThemeId) => {
        setPreviewThemeId(themeId)
        applyThemeLive(themeId)
    }

    const handleSave = async () => {
        setSaving(true)
        setError(null)
        try {
            const itemsPayload: Record<string, { tooltip: string; enabled: boolean }> = {}
            for (const it of items) {
                itemsPayload[it.id] = { tooltip: it.tooltip.trim(), enabled: it.enabled }
            }
            const [r1, r2] = await Promise.all([
                updateAttentionHighlightConfig(config),
                updateAttentionHighlightItems(itemsPayload),
            ])
            if (!r1.success || !r2.success) throw new Error('Lưu thất bại')
            setSavedAt(Date.now())
            router.refresh()
        } catch (e: any) {
            setError(e.message || 'Có lỗi xảy ra khi lưu.')
        } finally {
            setSaving(false)
        }
    }

    const objectBgVar = bgTokenToCssVar(config.objectBgToken)
    const objectTextVar = textTokenToCssVar(config.objectTextMode, config.objectBgToken)
    const tooltipBgVar = bgTokenToCssVar(config.tooltipBgToken)
    const tooltipTextVar = textTokenToCssVar(config.tooltipTextMode, config.tooltipBgToken)

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            <MainHeader title="TOOLTIP LÓE SÁNG" toolSlug="settings" />

            <div className="p-4 max-w-2xl mx-auto space-y-4 mt-4">
                <Link href="/tools/settings" className="inline-flex items-center gap-2 text-xs font-bold text-gray-400 uppercase hover:text-purple-600 transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Quay lại Cài đặt
                </Link>

                <div className="bg-white rounded-2xl border border-gray-100 p-6">
                    <h1 className="text-lg font-bold text-gray-900">Tooltip lóe sáng (Header/Footer)</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Cấu hình màu sắc, tốc độ chớp và nội dung tooltip cho toàn bộ hiệu ứng lóe sáng thu hút chú ý trên header/footer — thay đổi ở đây áp dụng ngay cho cả site, không cần deploy lại code.
                    </p>
                </div>

                {/* ── Chọn theme để xem trước ── */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-3">
                    <h2 className="text-sm font-black text-gray-900 uppercase">Theme đang xem trước</h2>
                    <p className="text-[11px] text-gray-400">Vì màu nền/chữ ở dưới chọn theo TOKEN của theme (Primary/Accent/Surface...), đổi thử theme ở đây để thấy tooltip trông khác nhau thế nào giữa các theme — áp dụng ngay cho cả site, giống hệt trang Giao diện.</p>
                    <div className="flex flex-wrap gap-2">
                        {presetThemes.map(theme => (
                            <button
                                key={theme.id}
                                onClick={() => handleSelectTheme(theme.id)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-xs font-bold transition-all ${previewThemeId === theme.id ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-gray-300'}`}
                            >
                                <span className="text-base">{theme.icon}</span>
                                <span className="flex gap-0.5">
                                    <span className="w-3 h-3 rounded-full border border-black/10" style={{ backgroundColor: theme.colors.primary }} />
                                    <span className="w-3 h-3 rounded-full border border-black/10" style={{ backgroundColor: theme.colors.accent }} />
                                </span>
                                {theme.name}
                                {previewThemeId === theme.id && <Check className="w-3.5 h-3.5 text-purple-600" />}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── Xem trước trực tiếp ── */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-3">
                    <h2 className="text-sm font-black text-gray-900 uppercase">Xem trước</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[11px] font-bold text-gray-500 mb-1">Nhãn đối tượng (nút/tab) — gõ thử để thấy chiều rộng đối tượng đổi theo</label>
                            <input
                                type="text"
                                value={previewObjectText}
                                onChange={e => setPreviewObjectText(e.target.value)}
                                placeholder="Gõ thử nhãn đối tượng..."
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-gray-500 mb-1">Nội dung tooltip</label>
                            <input
                                type="text"
                                value={previewText}
                                onChange={e => setPreviewText(e.target.value)}
                                placeholder="Gõ thử nội dung tooltip..."
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                            />
                        </div>
                    </div>
                    <p className="text-[11px] text-gray-400">Đổi nhãn đối tượng để thấy chiều rộng đối tượng co giãn theo — và tooltip bên dưới vẫn tự căn giữa theo đúng đối tượng dù chiều rộng đối tượng thay đổi.</p>
                    <div className="flex items-center justify-center py-10 bg-gray-900 rounded-xl">
                        <div
                            className="relative flex items-center justify-center gap-1.5 rounded-xl animate-attention-blink attention-highlight-active h-10 px-3.5"
                            style={{
                                ['--attn-bg-color' as any]: objectBgVar,
                                ['--attn-text-color' as any]: objectTextVar,
                                animationDuration: `${config.blinkDurationMs}ms`,
                            }}
                        >
                            <CheckCircle2 className="w-5 h-5 shrink-0" />
                            <span className="text-xs font-black whitespace-nowrap">{previewObjectText || 'Ví dụ nhãn'}</span>
                            <div
                                className="attention-tooltip-bubble absolute top-full mt-1.5 left-1/2 -translate-x-1/2 leading-tight font-black px-2 py-1 rounded-md shadow-lg border whitespace-normal break-words text-center"
                                style={{
                                    ['--attn-tooltip-max-vw' as any]: `${config.tooltipMaxWidthVwMobile}vw`,
                                    ['--attn-tooltip-max-vw-desktop' as any]: `${config.tooltipMaxWidthVwDesktop}vw`,
                                    backgroundColor: tooltipBgVar,
                                    color: tooltipTextVar,
                                    borderColor: `color-mix(in srgb, ${tooltipTextVar} 25%, transparent)`,
                                    fontSize: `${config.tooltipFontSizePx}px`,
                                }}
                            >
                                {previewText || 'Ví dụ nội dung tooltip'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Màu sắc ── */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
                    <h2 className="text-sm font-black text-gray-900 uppercase">Màu sắc (theo bảng màu theme đang áp dụng)</h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">Nền đối tượng (đang lóe sáng)</label>
                            <select
                                value={config.objectBgToken}
                                onChange={e => setConfig(c => ({ ...c, objectBgToken: e.target.value as any }))}
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                            >
                                {ATTN_BG_TOKEN_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">Chữ/icon đối tượng</label>
                            <select
                                value={config.objectTextMode}
                                onChange={e => setConfig(c => ({ ...c, objectTextMode: e.target.value as any }))}
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                            >
                                {ATTN_TEXT_TOKEN_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">Nền tooltip</label>
                            <select
                                value={config.tooltipBgToken}
                                onChange={e => setConfig(c => ({ ...c, tooltipBgToken: e.target.value as any }))}
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                            >
                                {ATTN_BG_TOKEN_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">Chữ tooltip</label>
                            <select
                                value={config.tooltipTextMode}
                                onChange={e => setConfig(c => ({ ...c, tooltipTextMode: e.target.value as any }))}
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                            >
                                {ATTN_TEXT_TOKEN_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </div>
                    </div>
                    <p className="text-[11px] text-gray-400">Nền đối tượng và nền tooltip nên chọn khác token nhau (vd Primary vs Accent) để dễ phân biệt.</p>
                </div>

                {/* ── Thời gian ── */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
                    <h2 className="text-sm font-black text-gray-900 uppercase">Thời gian</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">Chờ trước khi lóe sáng (giây)</label>
                            <input
                                type="number" min={1} max={60} step={0.5}
                                value={config.idleDelayMs / 1000}
                                onChange={e => setConfig(c => ({ ...c, idleDelayMs: Math.round(Number(e.target.value) * 1000) }))}
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">Mỗi đối tượng giữ (giây)</label>
                            <input
                                type="number" min={0.5} max={30} step={0.5}
                                value={config.cycleIntervalMs / 1000}
                                onChange={e => setConfig(c => ({ ...c, cycleIntervalMs: Math.round(Number(e.target.value) * 1000) }))}
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">Tốc độ 1 nhịp chớp (giây)</label>
                            <input
                                type="number" min={0.3} max={5} step={0.1}
                                value={config.blinkDurationMs / 1000}
                                onChange={e => setConfig(c => ({ ...c, blinkDurationMs: Math.round(Number(e.target.value) * 1000) }))}
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                            />
                        </div>
                    </div>
                </div>

                {/* ── Kích thước & cỡ chữ tooltip ── */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
                    <h2 className="text-sm font-black text-gray-900 uppercase">Kích thước tooltip</h2>
                    <p className="text-[11px] text-gray-400">
                        Tooltip luôn ưu tiên khớp sát theo độ dài nội dung. Chỉ khi text dài hơn chiều rộng tối đa bên dưới thì mới bị giới hạn lại đúng bằng mức tối đa đó và tự xuống dòng.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">Tối đa — Điện thoại (%)</label>
                            <input
                                type="number" min={10} max={95} step={1}
                                value={config.tooltipMaxWidthVwMobile}
                                onChange={e => setConfig(c => ({ ...c, tooltipMaxWidthVwMobile: Number(e.target.value) }))}
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">Tối đa — Máy tính/Tablet (%)</label>
                            <input
                                type="number" min={5} max={70} step={1}
                                value={config.tooltipMaxWidthVwDesktop}
                                onChange={e => setConfig(c => ({ ...c, tooltipMaxWidthVwDesktop: Number(e.target.value) }))}
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">Cỡ chữ tooltip (px)</label>
                            <input
                                type="number" min={8} max={24} step={1}
                                value={config.tooltipFontSizePx}
                                onChange={e => setConfig(c => ({ ...c, tooltipFontSizePx: Number(e.target.value) }))}
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                            />
                        </div>
                    </div>
                </div>

                {/* ── Nội dung tooltip theo từng vị trí ── */}
                {groups.map(([groupName, groupItems]) => (
                    <div key={groupName} className="bg-white rounded-2xl border border-gray-100 p-6 space-y-3">
                        <h2 className="text-sm font-black text-gray-900 uppercase">{groupName}</h2>
                        {groupItems.map(item => (
                            <div key={item.id} className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    checked={item.enabled}
                                    onChange={e => updateItem(item.id, { enabled: e.target.checked })}
                                    className="w-4 h-4 accent-purple-600 shrink-0"
                                    title="Bật/tắt lóe sáng cho vị trí này"
                                />
                                <div className="w-36 shrink-0 text-xs font-semibold text-gray-500 truncate" title={item.label}>{item.label}</div>
                                <input
                                    type="text"
                                    value={item.tooltip}
                                    onChange={e => updateItem(item.id, { tooltip: e.target.value })}
                                    disabled={!item.enabled}
                                    className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm disabled:opacity-40"
                                    placeholder="Nội dung tooltip..."
                                />
                            </div>
                        ))}
                    </div>
                ))}

                {error && (
                    <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
                )}
            </div>

            {/* Thanh Lưu cố định dưới cùng */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 flex items-center justify-center gap-3 z-40">
                {savedAt && !saving && (
                    <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Đã lưu
                    </span>
                )}
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-50"
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {saving ? 'Đang lưu...' : 'Lưu tất cả thay đổi'}
                </button>
            </div>
        </div>
    )
}
