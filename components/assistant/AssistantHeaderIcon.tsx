'use client'

import React from 'react'
import { useFloatingAssistant } from './AssistantProvider'

export default function AssistantHeaderIcon() {
  const { setIsOpen, displayMode, guideData } = useFloatingAssistant()

  return (
    <button
      onClick={() => setIsOpen(true)}
      className="shrink-0 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors overflow-hidden"
      style={{ width: '36px', height: '36px' }}
      title="Trợ lý ảo"
    >
      {displayMode === 'avatar' && guideData?.agentVideoUrl ? (
        <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-white/30">
          <video
            src={guideData.agentVideoUrl}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
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
      )}
      <style>{`
        @keyframes headerIcon3d {
          0%, 100% { transform: perspective(500px) rotateY(0deg); }
          50% { transform: perspective(500px) rotateY(180deg); }
        }
      `}</style>
    </button>
  )
}
