'use client'

import React from 'react'
import { useFloatingAssistant } from './AssistantProvider'

export default function AssistantHeaderIcon() {
  const { mode, setMode } = useFloatingAssistant()

  if (mode !== 'minimized') return null

  return (
    <button
      onClick={() => setMode('floating')}
      className="shrink-0 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
      style={{ width: '36px', height: '36px' }}
      title="Mở trợ lý ảo"
    >
      <span
        className="inline-block text-xl"
        style={{
          animation: 'headerIcon3d 3s ease-in-out infinite',
          transformStyle: 'preserve-3d',
          perspective: '500px',
        }}
      >
        ❓
      </span>
      <style>{`
        @keyframes headerIcon3d {
          0%, 100% { transform: perspective(500px) rotateY(0deg); }
          50% { transform: perspective(500px) rotateY(180deg); }
        }
      `}</style>
    </button>
  )
}
