'use client'

import React from 'react'
import { X, Volume2, BookOpen, Settings } from 'lucide-react'
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
  const { guideData, toolGuideData, setIsOpen, activeTab, setActiveTab } = useFloatingAssistant()

  const hasTabs = guideData && toolGuideData
  const showGuide = !hasTabs || activeTab === 'guide'
  const showFeatures = !hasTabs || activeTab === 'features'

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      onClick={() => setIsOpen(false)}
    >
      <div
        className="bg-white w-[80vw] max-w-4xl max-h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-violet-600 to-purple-600 text-white shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-2xl">❓</span>
            <h2 className="text-lg font-bold">
              {guideData?.title || toolGuideData?.title || 'Trợ lý ảo'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {(guideData?.script || toolGuideData?.script) && (
              <button
                onClick={() => speak((showGuide ? guideData?.script : toolGuideData?.script) || '')}
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

        {hasTabs && (
          <div className="flex border-b border-slate-200 bg-slate-50 shrink-0">
            <button
              onClick={() => setActiveTab('guide')}
              className={`flex items-center gap-2 px-5 py-3 text-xs font-bold transition-colors ${
                activeTab === 'guide'
                  ? 'text-violet-600 border-b-2 border-violet-600 bg-white'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Hướng dẫn
            </button>
            <button
              onClick={() => setActiveTab('features')}
              className={`flex items-center gap-2 px-5 py-3 text-xs font-bold transition-colors ${
                activeTab === 'features'
                  ? 'text-violet-600 border-b-2 border-violet-600 bg-white'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Settings className="w-4 h-4" />
              Tính năng
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {showGuide && guideData && (
            <div className="p-6 space-y-6">
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

          {showFeatures && toolGuideData?.sections && (
            <div className="p-6 space-y-6">
              {toolGuideData.sections.map((section: any, idx: number) => (
                <div key={idx}>
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-3 pb-2 border-b border-slate-200">
                    {section.title}
                  </h3>
                  {section.type === 'color_legend' && section.items && (
                    <div className="space-y-3">
                      {section.items.map((item: any, i: number) => (
                        <div key={i} className="flex items-start gap-3">
                          <div className={`w-4 h-4 rounded-full mt-0.5 shrink-0 ${
                            item.color === 'emerald' ? 'bg-emerald-500'
                            : item.color === 'sky' ? 'bg-sky-500'
                            : item.color === 'rose' ? 'bg-rose-500'
                            : item.color === 'violet' ? 'bg-violet-500'
                            : item.color === 'orange' ? 'bg-orange-500'
                            : item.color === 'blue' ? 'bg-blue-500'
                            : item.color === 'green' ? 'bg-green-500'
                            : item.color === 'red' ? 'bg-red-500'
                            : 'bg-gray-400'
                          }`} />
                          <div>
                            <span className="text-xs font-bold text-slate-700">{item.label}</span>
                            <p className="text-[11px] text-slate-500 leading-relaxed">{item.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {section.type === 'features' && section.items && (
                    <div className="space-y-2">
                      {section.items.map((item: any, i: number) => (
                        <div key={i} className="flex items-start gap-2">
                          <span className="text-[10px] font-bold text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded shrink-0">
                            {item.feature}
                          </span>
                          <span className="text-xs text-slate-600">{item.text || item.desc}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {(section.type === 'text' || section.type === 'tips') && (
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {section.content || section.items?.[0]?.text || ''}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {!guideData && !toolGuideData && (
            <div className="flex items-center justify-center h-full text-slate-400 p-12">
              <p>Chưa có hướng dẫn cho trang này</p>
            </div>
          )}
        </div>

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
