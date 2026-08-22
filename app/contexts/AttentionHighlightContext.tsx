'use client'

import React, { createContext, useContext, useMemo, useCallback } from 'react'
import {
    DEFAULT_ATTENTION_CONFIG,
    type AttentionHighlightConfig,
    type AttentionHighlightItem,
} from '@/lib/attention-highlight-types'

interface AttentionHighlightContextValue {
    config: AttentionHighlightConfig
    /** Lấy nội dung tooltip + trạng thái bật/tắt đã cấu hình cho 1 vị trí (theo id
     * trong lib/attention-highlight-registry.ts). Trả về fallback nếu vị trí đó
     * chưa được đăng ký hoặc admin chưa tuỳ chỉnh. */
    getItem: (id: string, fallbackTooltip?: string) => { tooltip: string; enabled: boolean }
}

const AttentionHighlightContext = createContext<AttentionHighlightContextValue>({
    config: DEFAULT_ATTENTION_CONFIG,
    getItem: (id, fallbackTooltip) => ({ tooltip: fallbackTooltip || '', enabled: true }),
})

export function AttentionHighlightProvider({
    config,
    items,
    children,
}: {
    config: AttentionHighlightConfig
    items: AttentionHighlightItem[]
    children: React.ReactNode
}) {
    const itemsMap = useMemo(() => new Map(items.map(i => [i.id, i])), [items])

    const getItem = useCallback((id: string, fallbackTooltip?: string) => {
        const found = itemsMap.get(id)
        return found
            ? { tooltip: found.tooltip, enabled: found.enabled }
            : { tooltip: fallbackTooltip || '', enabled: true }
    }, [itemsMap])

    const value = useMemo(() => ({ config, getItem }), [config, getItem])

    return (
        <AttentionHighlightContext.Provider value={value}>
            {children}
        </AttentionHighlightContext.Provider>
    )
}

export function useAttentionHighlightSettings() {
    return useContext(AttentionHighlightContext)
}
