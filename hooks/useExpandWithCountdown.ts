'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

export function useExpandWithCountdown(countdownSeconds = 10) {
    const [isExpanded, setIsExpanded] = useState(false)
    const [countdown, setCountdown] = useState(countdownSeconds)
    const timerRef = useRef<NodeJS.Timeout | null>(null)
    const intervalRef = useRef<NodeJS.Timeout | null>(null)

    const resetTimer = useCallback(() => {
        if (timerRef.current) clearTimeout(timerRef.current)
        if (intervalRef.current) clearInterval(intervalRef.current)
        
        if (isExpanded) {
            setCountdown(countdownSeconds)
            
            intervalRef.current = setInterval(() => {
                setCountdown(prev => (prev > 0 ? prev - 1 : 0))
            }, 1000)

            timerRef.current = setTimeout(() => {
                setIsExpanded(false)
            }, countdownSeconds * 1000)
        }
    }, [isExpanded, countdownSeconds])

    useEffect(() => {
        if (isExpanded) {
            resetTimer()
        } else {
            if (timerRef.current) clearTimeout(timerRef.current)
            if (intervalRef.current) clearInterval(intervalRef.current)
        }
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current)
            if (intervalRef.current) clearInterval(intervalRef.current)
        }
    }, [isExpanded, resetTimer])

    const handleActivity = () => {
        if (isExpanded) resetTimer()
    }

    return { isExpanded, setIsExpanded, countdown, resetTimer, handleActivity }
}
