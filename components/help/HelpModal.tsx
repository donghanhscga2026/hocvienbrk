'use client'

import { X, HelpCircle } from 'lucide-react'
import { useEffect, useState } from 'react'

interface ToolHelpItem {
    color?: string
    label?: string
    desc?: string
    feature?: string
    text?: string
}

interface ToolHelpSection {
    type: 'color_legend' | 'features' | 'text' | 'tips'
    title: string
    items?: ToolHelpItem[]
    content?: string
}

interface ToolHelpData {
    title: string
    content: ToolHelpSection[]
}

interface HelpModalProps {
    isOpen: boolean
    onClose: () => void
    helpData: ToolHelpData | null
    isLoading?: boolean
}

const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-500',
    sky: 'bg-sky-500',
    rose: 'bg-rose-500',
    violet: 'bg-violet-500',
    orange: 'bg-orange-500',
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    red: 'bg-red-500',
}

export default function HelpModal({ isOpen, onClose, helpData, isLoading }: HelpModalProps) {
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        if (isOpen) {
            setIsVisible(true)
        } else {
            setTimeout(() => setIsVisible(false), 200)
        }
    }, [isOpen])

    if (!isVisible) return null

    return (
        <div 
            className={`fixed inset-0 z-[200] flex items-center justify-center p-4 transition-all duration-200 ${
                isOpen ? 'bg-slate-900/60 backdrop-blur-sm' : 'bg-transparent pointer-events-none'
            }`}
            onClick={onClose}
        >
            <div 
                className={`bg-white w-full max-w-md sm:max-w-lg max-h-[80vh] rounded-2xl shadow-2xl overflow-hidden transform transition-all duration-200 ${
                    isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
                }`}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 sm:px-6 py-4 bg-gradient-to-r from-violet-600 to-purple-600 text-white">
                    <div className="flex items-center gap-2">
                        <HelpCircle className="w-5 h-5" />
                        <h2 className="text-sm sm:text-base font-bold">{helpData?.title || 'Hướng dẫn'}</h2>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : helpData?.content ? (
                        <div className="space-y-6">
                            {helpData.content.map((section, idx) => (
                                <div key={idx}>
                                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-3 pb-2 border-b border-slate-200">
                                        {section.title}
                                    </h3>
                                    
                                    {/* Color Legend */}
                                    {section.type === 'color_legend' && section.items && (
                                        <div className="space-y-3">
                                            {section.items.map((item, i) => (
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

                                    {/* Features List */}
                                    {section.type === 'features' && section.items && (
                                        <div className="space-y-2">
                                            {section.items.map((item, i) => (
                                                <div key={i} className="flex items-start gap-2">
                                                    <span className="text-[10px] font-bold text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded shrink-0">
                                                        {item.feature}
                                                    </span>
                                                    <span className="text-xs text-slate-600">{item.text || item.desc}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Text Content */}
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

                {/* Footer */}
                <div className="px-4 sm:px-6 py-3 bg-slate-50 border-t">
                    <button 
                        onClick={onClose}
                        className="w-full py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-lg transition-colors"
                    >
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    )
}