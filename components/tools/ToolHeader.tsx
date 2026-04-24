'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { HelpCircle, X } from 'lucide-react'
import { getToolHelpAction, ToolHelpData } from '@/app/actions/help-actions'

interface ToolHeaderProps {
  title?: string
  backUrl?: string
  toolSlug?: string
}

export default function ToolHeader({ title, backUrl, toolSlug }: ToolHeaderProps) {
  const pageTitle = title || 'CÔNG CỤ'
  const effectiveBackUrl = backUrl || (title ? '/tools' : '/')
  const isHome = effectiveBackUrl === '/'
  
  const [showHelp, setShowHelp] = useState(false)
  const [helpData, setHelpData] = useState<ToolHelpData | null>(null)
  const [helpLoading, setHelpLoading] = useState(false)

  useEffect(() => {
    if (showHelp && toolSlug && !helpData) {
      setHelpLoading(true)
      getToolHelpAction(toolSlug).then(result => {
        if (result.success && result.data) {
          setHelpData(result.data as unknown as ToolHelpData)
        }
        setHelpLoading(false)
      })
    }
  }, [showHelp, toolSlug, helpData])

  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-500',
    sky: 'bg-sky-500', 
    rose: 'bg-rose-500',
    violet: 'bg-violet-500',
  }

  return (
    <>
      <header className="bg-brk-surface text-brk-on-surface shadow-lg sticky top-0 z-50">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-1">
            <Link 
              href={effectiveBackUrl} 
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
            >
              <Image
                src="/icon Back.png"
                alt="Quay lại"
                width={36}
                height={36}
                className="object-contain"
                style={{ width: 'auto', height: '28px' }}
              />
              <span className="text-xs font-medium uppercase hidden sm:inline">{isHome ? 'TRANG CHỦ' : 'QUAY LẠI'}</span>
            </Link>
          </div>
          
          <h1 className="text-sm font-bold uppercase absolute left-1/2 -translate-x-1/2">{pageTitle}</h1>
          
          {toolSlug && (
            <button 
              onClick={() => setShowHelp(true)}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors text-brk-muted hover:text-brk-accent"
            >
              <HelpCircle className="h-4 w-4" />
              <span className="text-xs font-medium hidden sm:inline">Hỗ trợ</span>
            </button>
          )}
        </div>
      </header>

      {/* Help Modal */}
      {showHelp && (
        <div 
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          onClick={() => setShowHelp(false)}
        >
          <div 
            className="bg-white w-full max-w-md sm:max-w-lg max-h-[80vh] rounded-2xl shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 bg-gradient-to-r from-violet-600 to-purple-600 text-white">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5" />
                <h2 className="text-sm sm:text-base font-bold">{helpData?.title || 'Hướng dẫn'}</h2>
              </div>
              <button 
                onClick={() => setShowHelp(false)}
                className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
              {helpLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : helpData?.content ? (
                <div className="space-y-6">
                  {helpData.content.map((section: any, idx: number) => (
                    <div key={idx}>
                      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-3 pb-2 border-b border-slate-200">
                        {section.title}
                      </h3>
                      
                      {section.type === 'color_legend' && section.items && (
                        <div className="space-y-3">
                          {section.items.map((item: any, i: number) => (
                            <div key={i} className="flex items-start gap-3">
                              <div className={`w-4 h-4 rounded-full mt-0.5 ${colorMap[item.color || ''] || 'bg-gray-400'}`} />
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
              ) : (
                <div className="text-center py-8 text-slate-400 text-sm">
                  Chưa có hướng dẫn cho trang này
                </div>
              )}
            </div>

            <div className="px-4 sm:px-6 py-3 bg-slate-50 border-t">
              <button 
                onClick={() => setShowHelp(false)}
                className="w-full py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-lg transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}