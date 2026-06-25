'use client'

import React from 'react'
import { X, Volume2 } from 'lucide-react'
import { useFloatingAssistant } from './AssistantProvider'

function speak(text: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'vi-VN'
  utterance.rate = 1.0
  utterance.pitch = 1.0
  window.speechSynthesis.speak(utterance)
}

export default function AssistantPopup() {
  const { guideData, setIsOpen } = useFloatingAssistant()

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      onClick={() => setIsOpen(false)}
    >
      <div
        className="bg-white w-[80vw] max-w-4xl h-[80vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-violet-600 to-purple-600 text-white shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-2xl">❓</span>
            <h2 className="text-lg font-bold">
              {guideData?.title || 'Trợ lý ảo'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {guideData?.script && (
              <button
                onClick={() => speak(guideData.script!)}
                className="p-2 rounded-lg hover:bg-white/20 transition-colors"
                title="Đọc hướng dẫn"
              >
                <Volume2 className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 rounded-lg hover:bg-white/20 transition-colors"
              title="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!guideData ? (
            <div className="flex items-center justify-center h-full text-slate-400">
              <p>Chưa có hướng dẫn cho trang này</p>
            </div>
          ) : (
            <div className="space-y-6">
              {guideData.textContent && (
                <div className="prose prose-sm max-w-none text-slate-700 leading-relaxed whitespace-pre-line">
                  {guideData.textContent}
                </div>
              )}

              {guideData.videoUrl && (
                <div className="aspect-video bg-slate-100 rounded-lg overflow-hidden">
                  <video
                    src={guideData.videoUrl}
                    controls
                    className="w-full h-full object-contain"
                    preload="metadata"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t shrink-0">
          <button
            onClick={() => setIsOpen(false)}
            className="w-full py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-lg transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}
