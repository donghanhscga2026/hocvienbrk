'use client'

import { useEffect, useRef, useCallback } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SlidePanelProps {
  open: boolean
  onClose: () => void
  direction?: 'top' | 'bottom' | 'left' | 'right'
  children: React.ReactNode
  title?: string
  width?: string
  className?: string
}

const directionConfig = {
  right: {
    panel: 'inset-y-0 right-0 w-80 max-w-[85vw]',
    translate: { open: 'translate-x-0', closed: 'translate-x-full' },
    mobile: '',
  },
  left: {
    panel: 'inset-y-0 left-0 w-80 max-w-[85vw]',
    translate: { open: 'translate-x-0', closed: '-translate-x-full' },
    mobile: '',
  },
  top: {
    panel: 'inset-x-0 top-0 max-h-[70vh]',
    translate: { open: 'translate-y-0', closed: '-translate-y-full' },
    mobile: 'max-h-[80vh] sm:max-h-[70vh]',
  },
  bottom: {
    panel: 'inset-x-0 bottom-0 max-h-[85vh]',
    translate: { open: 'translate-y-0', closed: 'translate-y-full' },
    mobile: 'max-h-[85vh] sm:max-h-[85vh]',
  },
}

const positionClasses = {
  right: 'items-stretch justify-end',
  left: 'items-stretch justify-start',
  top: 'items-start justify-center',
  bottom: 'items-end justify-center',
}

export default function SlidePanel({
  open,
  onClose,
  direction = 'right',
  children,
  title,
  width,
  className,
}: SlidePanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const config = directionConfig[direction]

  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [open, handleEscape])

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-[199] bg-black/30 backdrop-blur-sm transition-opacity duration-300',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        className={cn(
          'fixed z-[200] flex flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out',
          config.panel,
          config.translate.open,
          config.mobile,
          !open && config.translate.closed,
          direction === 'bottom' && 'rounded-t-3xl',
          direction === 'top' && 'rounded-b-3xl',
          className
        )}
        style={width ? { width } : undefined}
      >
        {/* Handle bar (mobile visual cue) */}
        {(direction === 'bottom' || direction === 'top') && (
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="w-12 h-1.5 rounded-full bg-slate-200" />
          </div>
        )}

        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 shrink-0">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">{title}</h3>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {children}
        </div>
      </div>
    </>
  )
}
