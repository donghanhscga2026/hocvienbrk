'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'

export interface AttentionItem {
    id: string
    tooltip: string
    visible: boolean
}

interface UseAttentionCycleOptions {
    /** Thời gian không hoạt động trước khi bắt đầu chu trình lóe sáng (ms) */
    idleDelayMs?: number
    /** Thời gian giữ mỗi nút được highlight trước khi chuyển sang nút kế (ms) */
    cycleIntervalMs?: number
}

/**
 * Chu trình lóe sáng tự động khi người dùng không tương tác — dùng chung cho
 * MainHeader và mọi header/footer/toolbar khác trong app. Sau `idleDelayMs`
 * không có hoạt động (chuột/bàn phím/chạm), lần lượt highlight từng đối
 * tượng "visible" trong `items`, mỗi cái giữ trong `cycleIntervalMs`. Bất kỳ
 * hoạt động nào của người dùng sẽ tắt highlight và reset lại bộ đếm.
 */
export function useAttentionCycle(items: AttentionItem[], options?: UseAttentionCycleOptions) {
    const idleDelayMs = options?.idleDelayMs ?? 5000
    const cycleIntervalMs = options?.cycleIntervalMs ?? 3000

    const [activeIndex, setActiveIndex] = useState<number | null>(null)

    const visibleItems = useMemo(() => items.filter(i => i.visible), [items])
    const visibleKey = visibleItems.map(i => i.id).join('|')

    useEffect(() => {
        let inactivityTimer: NodeJS.Timeout
        let cycleTimer: NodeJS.Timeout

        const resetInactivity = () => {
            setActiveIndex(null)
            clearTimeout(inactivityTimer)
            clearInterval(cycleTimer)

            inactivityTimer = setTimeout(() => {
                let current = 0
                setActiveIndex(current)

                cycleTimer = setInterval(() => {
                    if (visibleItems.length === 0) return
                    current = (current + 1) % visibleItems.length
                    setActiveIndex(current)
                }, cycleIntervalMs)
            }, idleDelayMs)
        }

        const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'click']
        events.forEach(e => window.addEventListener(e, resetInactivity))

        resetInactivity()

        return () => {
            clearTimeout(inactivityTimer)
            clearInterval(cycleTimer)
            events.forEach(e => window.removeEventListener(e, resetInactivity))
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visibleKey, idleDelayMs, cycleIntervalMs])

    const getStatus = useCallback((id: string) => {
        const isActive = activeIndex !== null && visibleItems[activeIndex]?.id === id
        const tooltip = visibleItems.find(i => i.id === id)?.tooltip || ''
        return { isActive, tooltip }
    }, [activeIndex, visibleItems])

    return { getStatus }
}
