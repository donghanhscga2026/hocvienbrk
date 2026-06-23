'use client'

import YouTubeEmbed from './YouTubeEmbed'
import { X } from 'lucide-react'

interface GuideVideoPopupProps {
  videoUrl: string
  title?: string | null
  onClose: () => void
}

export default function GuideVideoPopup({ videoUrl, title, onClose }: GuideVideoPopupProps) {
  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-brk-surface rounded-2xl shadow-2xl border border-brk-outline/10 overflow-hidden w-[80vw] max-w-4xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-brk-outline/10">
          <h3 className="text-sm font-bold text-brk-on-surface truncate">
            {title || 'Video hướng dẫn'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-brk-background/20 transition-colors text-brk-muted hover:text-brk-on-surface"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="aspect-video w-full">
          <YouTubeEmbed url={videoUrl} className="w-full h-full" autoplay />
        </div>
      </div>
    </div>
  )
}
