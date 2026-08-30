'use client'

import React, { useRef, useState, useLayoutEffect } from 'react'
import { useAttentionHighlightSettings } from '@/app/contexts/AttentionHighlightContext'
import { bgTokenToCssVar, textTokenToCssVar } from '@/lib/attention-highlight-theme'

interface AttentionHighlightProps {
    isActive: boolean
    tooltip: string
    /** Vị trí bong bóng tooltip so với đối tượng — 'bottom' cho header (nút ở trên),
     * 'top' cho footer (nút ở dưới, tránh tràn ra ngoài màn hình) */
    tooltipPosition?: 'top' | 'bottom'
    className?: string
    children: React.ReactNode
}

type HAlign = 'left' | 'center' | 'right'

const EDGE_MARGIN = 8 // px cách mép màn hình tối thiểu trước khi phải đổi cách căn lề

/**
 * Wrapper dùng chung cho hiệu ứng lóe sáng + tooltip tự động (xem hook
 * useAttentionCycle). Bọc quanh 1 nút/icon bất kỳ trên Header/Footer/Toolbar
 * để nó tham gia chu trình lóe sáng thu hút chú ý khi người dùng không hoạt động.
 *
 * Toàn bộ màu sắc, tốc độ chớp và kích thước tooltip đọc từ
 * AttentionHighlightContext (nạp 1 lần từ DB ở RootLayout, xem
 * app/actions/attention-highlight-actions.ts) — chỉnh trong
 * /tools/settings/attention-tooltip, không cần sửa code.
 */
export function AttentionHighlight({ isActive, tooltip, tooltipPosition = 'bottom', className = '', children }: AttentionHighlightProps) {
    const { config } = useAttentionHighlightSettings()
    const wrapperRef = useRef<HTMLDivElement>(null)
    const tooltipRef = useRef<HTMLDivElement>(null)
    const [hAlign, setHAlign] = useState<HAlign>('center')
    // Nửa chiều rộng đối tượng (px) — dùng để lệch mũi tên tooltip cho vẫn trỏ
    // đúng vào giữa đối tượng khi bong bóng bị đẩy sang trái/phải thay vì căn giữa.
    const [halfObjectWidth, setHalfObjectWidth] = useState(0)

    // Đo vị trí thực tế so với mép màn hình MỖI KHI tooltip vừa hiện ra, để
    // quyết định căn giữa hay ép sát lề trái/phải — chạy trước khi trình
    // duyệt vẽ khung hình để không bị "nhảy" vị trí trước mắt người dùng.
    useLayoutEffect(() => {
        if (!isActive) return
        const wrapperEl = wrapperRef.current
        const tooltipEl = tooltipRef.current
        if (!wrapperEl || !tooltipEl) return

        const wrapperRect = wrapperEl.getBoundingClientRect()
        const tooltipWidth = tooltipEl.offsetWidth
        const viewportWidth = window.innerWidth
        const wrapperCenter = wrapperRect.left + wrapperRect.width / 2
        const halfTooltip = tooltipWidth / 2

        setHalfObjectWidth(wrapperRect.width / 2)

        if (wrapperCenter - halfTooltip < EDGE_MARGIN) {
            setHAlign('left')
        } else if (wrapperCenter + halfTooltip > viewportWidth - EDGE_MARGIN) {
            setHAlign('right')
        } else {
            setHAlign('center')
        }
    }, [isActive, tooltip])

    const objectBgVar = bgTokenToCssVar(config.objectBgToken)
    const objectTextVar = textTokenToCssVar(config.objectTextMode, config.objectBgToken)
    const tooltipBgVar = bgTokenToCssVar(config.tooltipBgToken)
    const tooltipTextVar = textTokenToCssVar(config.tooltipTextMode, config.tooltipBgToken)

    // Chỉ đổi màu nền + màu chữ/icon (không phóng to) — màu + tốc độ chớp lấy
    // từ config (DB), khác hẳn màu tooltip để dễ phân biệt "đối tượng" và "chú thích".
    const highlightClass = isActive
        ? 'rounded-xl animate-attention-blink attention-highlight-active z-30'
        : 'transition-all duration-300'

    const wrapperStyle = isActive
        ? ({
            ['--attn-bg-color' as any]: objectBgVar,
            ['--attn-text-color' as any]: objectTextVar,
            animationDuration: `${config.blinkDurationMs}ms`,
        } as React.CSSProperties)
        : undefined

    const isBottom = tooltipPosition === 'bottom'

    const bubblePosClass = hAlign === 'left'
        ? 'left-0'
        : hAlign === 'right'
            ? 'right-0'
            : 'left-1/2 -translate-x-1/2'

    return (
        <div ref={wrapperRef} className={`relative flex items-center justify-center ${highlightClass} ${className}`} style={wrapperStyle}>
            {children}
            {isActive && tooltip && (
                <div
                    ref={tooltipRef}
                    className={`attention-tooltip-bubble absolute ${bubblePosClass} backdrop-blur-sm leading-tight font-black px-2 py-1 rounded-md shadow-lg border whitespace-normal break-words text-center z-[60] animate-in fade-in zoom-in-95 duration-200 ${isBottom ? 'top-full mt-1.5' : 'bottom-full mb-1.5'}`}
                    style={{
                        ['--attn-tooltip-max-vw' as any]: `${config.tooltipMaxWidthVwMobile}vw`,
                        ['--attn-tooltip-max-vw-desktop' as any]: `${config.tooltipMaxWidthVwDesktop}vw`,
                        backgroundColor: tooltipBgVar,
                        color: tooltipTextVar,
                        borderColor: `color-mix(in srgb, ${tooltipTextVar} 25%, transparent)`,
                        fontSize: `${config.tooltipFontSizePx}px`,
                    }}
                >
                    {tooltip}
                    <div
                        className={`absolute w-1.5 h-1.5 border ${isBottom ? '-top-1 border-t border-l' : '-bottom-1 border-b border-r'}`}
                        style={{
                            backgroundColor: tooltipBgVar,
                            borderColor: `color-mix(in srgb, ${tooltipTextVar} 25%, transparent)`,
                            ...(hAlign === 'center'
                                ? { left: '50%', transform: 'translateX(-50%) rotate(45deg)' }
                                : hAlign === 'left'
                                    ? { left: halfObjectWidth, transform: 'translateX(-50%) rotate(45deg)' }
                                    : { right: halfObjectWidth, transform: 'translateX(50%) rotate(45deg)' }),
                        }}
                    />
                </div>
            )}
        </div>
    )
}
