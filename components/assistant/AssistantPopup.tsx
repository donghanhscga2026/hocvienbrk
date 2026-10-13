'use client'

import React, { useEffect, useState } from 'react'
import { X, Volume2, BookOpen, Settings, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
import { useFloatingAssistant, type AssistantGuideStep } from './AssistantProvider'
import GuideTour from './GuideTour'

function speak(text: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'vi-VN'
  utterance.rate = 1.0
  utterance.pitch = 1.0
  window.speechSynthesis.speak(utterance)
}

function toEmbedUrl(url: string): string | null {
  // YouTube watch/share -> embed
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{6,})/)
  return m ? `https://www.youtube.com/embed/${m[1]}` : null
}

function StepMedia({ step }: { step: AssistantGuideStep }) {
  const embed = step.videoUrl ? toEmbedUrl(step.videoUrl) : null
  return (
    <>
      {step.imageUrl && (
        <div className="rounded-xl overflow-hidden border border-slate-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={step.imageUrl} alt={step.title} className="w-full object-contain bg-slate-50" loading="lazy" />
        </div>
      )}
      {step.videoUrl && (
        embed ? (
          <div className="rounded-xl overflow-hidden border border-slate-200 aspect-video">
            <iframe src={embed} title={step.title} className="w-full h-full" allowFullScreen />
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden border border-slate-200 aspect-video bg-slate-100">
            <video src={step.videoUrl} controls preload="metadata" className="w-full h-full object-contain" />
          </div>
        )
      )}
    </>
  )
}

function StepsView({ steps }: { steps: AssistantGuideStep[] }) {
  const [idx, setIdx] = useState(0)
  const [tourOpen, setTourOpen] = useState(false)
  const step = steps[idx]
  const hasTour = steps.some(s => s.targetSelector)

  useEffect(() => { setIdx(0) }, [steps])

  if (tourOpen) {
    return <GuideTour steps={steps} onDone={() => setTourOpen(false)} />
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        {steps.map((s, i) => (
          <button
            key={s.id}
            onClick={() => setIdx(i)}
            title={s.title}
            className={`w-8 h-8 rounded-full text-xs font-bold transition-colors ${
              i === idx
                ? 'bg-violet-600 text-white'
                : i < idx
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            {i + 1}
          </button>
        ))}
        <span className="text-xs text-slate-400 font-bold ml-1">Bước {idx + 1}/{steps.length}</span>
      </div>

      <div className="space-y-3">
        <h3 className="text-base font-bold text-slate-800">{step.title}</h3>
        {step.body && (
          <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{step.body}</p>
        )}
        <StepMedia step={step} />
      </div>

      {hasTour && (
        <button
          onClick={() => setTourOpen(true)}
          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
        >
          <Sparkles className="w-4 h-4" />
          Dẫn tôi làm từng bước
        </button>
      )}

      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={() => setIdx(i => Math.max(0, i - 1))}
          disabled={idx === 0}
          className="flex items-center gap-1 px-4 py-2 text-sm font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-40"
        >
          <ChevronLeft className="w-4 h-4" /> Trước
        </button>
        <div className="flex-1" />
        {idx < steps.length - 1 ? (
          <button
            onClick={() => setIdx(i => Math.min(steps.length - 1, i + 1))}
            className="flex items-center gap-1 px-4 py-2 text-sm font-bold text-white bg-violet-600 rounded-lg hover:bg-violet-700"
          >
            Tiếp <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg">🎉 Hoàn tất hướng dẫn</span>
        )}
      </div>
    </div>
  )
}

export default function AssistantPopup() {
  const { guideData, toolGuideData, setIsOpen, activeTab, setActiveTab } = useFloatingAssistant()

  const hasTabs = guideData && toolGuideData
  const showGuide = !hasTabs || activeTab === 'guide'
  const showFeatures = !hasTabs || activeTab === 'features'
  const activeGuide = showGuide ? guideData : toolGuideData
  const steps = activeGuide?.steps ?? []

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
            steps.length > 0 ? (
              <StepsView key={guideData.id} steps={steps} />
            ) : (
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
            )
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
