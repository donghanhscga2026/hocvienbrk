'use client'

import React, { useRef, useEffect, useCallback } from 'react'
import { useFloatingAssistant } from './AssistantProvider'
import AssistantPopup from './AssistantPopup'

function speak(text: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'vi-VN'
  utterance.rate = 1.0
  utterance.pitch = 1.0
  window.speechSynthesis.speak(utterance)
}

export default function FloatingAssistant() {
  const { mode, setMode, position, setPosition, guideData } = useFloatingAssistant()
  const avatarRef = useRef<HTMLDivElement>(null)
  const dragStartRef = useRef<{ x: number; y: number; startX: number; startY: number } | null>(null)
  const lastClickRef = useRef<number>(0)
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const initedRef = useRef(false)

  useEffect(() => {
    if (mode === 'floating' && !initedRef.current) {
      initedRef.current = true
      setPosition({
        x: window.innerWidth - 80,
        y: window.innerHeight - 90,
      })
    }
    if (mode === 'minimized') {
      initedRef.current = false
    }
  }, [mode, setPosition])

  const handleClick = useCallback(() => {
    const now = Date.now()
    if (now - lastClickRef.current < 300) {
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current)
        clickTimerRef.current = null
      }
      setMode('popup')
      lastClickRef.current = 0
    } else {
      lastClickRef.current = now
      clickTimerRef.current = setTimeout(() => {
        if (guideData?.script) {
          speak(guideData.script)
        }
        clickTimerRef.current = null
      }, 300)
    }
  }, [guideData, setMode])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    const el = e.currentTarget as HTMLElement
    el.setPointerCapture(e.pointerId)

    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startX: position.x,
      startY: position.y,
    }

    let hasMoved = false

    const onMove = (ev: PointerEvent) => {
      if (!dragStartRef.current) return
      const dx = ev.clientX - dragStartRef.current.x
      const dy = ev.clientY - dragStartRef.current.y
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        hasMoved = true
        avatarRef.current?.style.setProperty('transform', `translate(${dx}px, ${dy}px)`)
      }
    }

    const onUp = (ev: PointerEvent) => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
      if (!dragStartRef.current) return

      const dx = ev.clientX - dragStartRef.current.x
      const dy = ev.clientY - dragStartRef.current.y

      if (hasMoved) {
        setPosition({ x: position.x + dx, y: position.y + dy })
        avatarRef.current?.style.removeProperty('transform')
      } else {
        handleClick()
      }

      dragStartRef.current = null
    }

    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
  }, [position, setPosition, handleClick])

  if (mode === 'minimized') return null

  if (mode === 'popup') return <AssistantPopup />

  return (
    <div
      ref={avatarRef}
      onPointerDown={handlePointerDown}
      style={{ left: position.x, top: position.y }}
      className="fixed z-[100] w-[50px] h-[50px] flex items-center justify-center cursor-grab active:cursor-grabbing opacity-50 hover:opacity-100 transition-opacity select-none rounded-full bg-white/80 shadow-lg backdrop-blur-sm border border-white/50"
      title="Trợ lý ảo — Kéo để di chuyển, Click để nghe, Double-click để mở"
    >
      <span
        className="text-3xl inline-block"
        style={{
          animation: 'assistantFloat3d 4s ease-in-out infinite',
          transformStyle: 'preserve-3d',
          perspective: '500px',
        }}
      >
        ❓
      </span>
      <style>{`
        @keyframes assistantFloat3d {
          0%, 100% { transform: perspective(500px) rotateY(0deg) translateY(0px); }
          25% { transform: perspective(500px) rotateY(15deg) translateY(-4px); }
          50% { transform: perspective(500px) rotateY(0deg) translateY(0px); }
          75% { transform: perspective(500px) rotateY(-15deg) translateY(-4px); }
        }
      `}</style>
    </div>
  )
}
