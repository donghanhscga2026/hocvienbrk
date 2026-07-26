'use client'

import { useState, useEffect } from 'react'
import { X, Users } from 'lucide-react'
import { getSystemConnectionPathAction } from '@/app/actions/admin-actions'

interface SystemConnectionPathModalProps {
  isOpen: boolean
  onClose: () => void
  ancestorId?: number | null
  descendantId: number
  systemId: number
}

export default function SystemConnectionPathModal({
  isOpen,
  onClose,
  ancestorId,
  descendantId,
  systemId,
}: SystemConnectionPathModalProps) {
  const [loading, setLoading] = useState(false)
  const [path, setPath] = useState<{ userId: number; name: string; level: number }[]>([])

  useEffect(() => {
    if (isOpen && descendantId && systemId) {
      setLoading(true)
      setPath([])
      getSystemConnectionPathAction(ancestorId ?? 0, descendantId, systemId)
        .then(res => {
          if (res.success && res.path) {
            setPath(res.path)
          } else {
            alert(res.error || 'Không tìm thấy tuyến kết nối nhân duyên')
          }
        })
        .catch(err => {
          alert(err.message || 'Lỗi khi kết nối hệ thống')
        })
        .finally(() => {
          setLoading(false)
        })
    }
  }, [isOpen, ancestorId, descendantId, systemId])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[350] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-[28px] shadow-2xl border border-slate-100 flex flex-col animate-in fade-in zoom-in duration-200 overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-purple-50">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            <h3 className="text-sm font-black text-slate-800">Cây Nhân Duyên (Hệ thống #{systemId})</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-200/50 rounded-full transition-colors text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-slate-400 font-bold">Đang tra cứu tuyến kết nối...</span>
            </div>
          ) : path.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-400 font-semibold">
              Không tìm thấy tuyến kết nối từ #{ancestorId} đến #{descendantId}
            </div>
          ) : (
            <div className="flex flex-col relative pl-4">
              {/* Vertical connector line */}
              <div className="absolute left-[23px] top-6 bottom-6 w-0.5 bg-gradient-to-b from-indigo-500 to-purple-500/80" />
              
              {path.map((node, index) => {
                const isA = node.userId === ancestorId
                const isZ = node.userId === descendantId
                
                return (
                  <div key={node.userId} className="flex items-start gap-4 mb-6 last:mb-0 relative">
                    {/* Circle badge indicator */}
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center z-10 shrink-0 mt-0.5 border-4 border-white shadow-md text-[8px] font-black text-white ${
                      isA ? 'bg-indigo-600' : (isZ ? 'bg-purple-600' : 'bg-slate-400')
                    }`}>
                      {index === 0 ? 'A' : (index === path.length - 1 ? 'Z' : index)}
                    </div>
                    
                    {/* Member block info */}
                    <div className={`flex-1 p-3.5 rounded-2xl border ${
                      isA || isZ 
                        ? 'bg-gradient-to-r from-indigo-50/30 to-purple-50/30 border-indigo-100/80 shadow-sm' 
                        : 'bg-slate-50/50 border-slate-100'
                    }`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-black text-slate-800">
                          {node.name}
                        </span>
                        <span className="text-[9px] font-black px-1.5 py-0.5 bg-white border border-slate-100 rounded text-slate-500">
                          Cấp {node.level}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        <span>ID: #{node.userId}</span>
                        {index > 0 && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span className="text-indigo-600 font-extrabold">F{index}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}
