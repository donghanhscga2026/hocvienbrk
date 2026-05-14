'use client'

import Link from 'next/link'
import { X, ChevronDown, User, ExternalLink } from 'lucide-react'
import { useState } from 'react'

export interface GroupMember {
  id: number
  name: string | null
  image?: string | null
  totalSubCount: number
  children?: GroupMember[]
  level?: number | null
  personalScore?: number | null
  totalScore?: number | null
  groupName?: string | null
  chucDanh?: string | null
}

interface GroupModalProps {
  users: GroupMember[]
  type: 'A' | 'B'
  totalSub: number
  editMode?: boolean
  onClose: () => void
  onAddChild?: (parentId: number) => void
  onDeleteNode?: (nodeId: number) => void
}

const getChucDanhBadge = (chucDanh?: string | null) => {
  if (!chucDanh) return null
  const styles: Record<string, string> = {
    C5: 'bg-orange-500 text-white',
    C20: 'bg-yellow-400 text-slate-800',
    DHTT: 'bg-pink-400 text-white',
  }
  const color = styles[chucDanh.toUpperCase()]
  return color ? (
    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${color}`}>
      {chucDanh}
    </span>
  ) : null
}

export default function GroupModal({ users, type, totalSub, editMode, onClose, onAddChild, onDeleteNode }: GroupModalProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null)

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[180] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl max-h-[80vh] rounded-[40px] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-8 border-b border-slate-180 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black tracking-tight">
              Nhóm F1 {type === 'A' ? 'Trống (A)' : 'Cạn (B)'}
            </h2>
            <p className="text-sm text-slate-400 font-bold uppercase mt-1 tracking-widest">
              Gồm {users.length} F1 (Tổng: {totalSub} thành viên)
            </p>
          </div>
          <button onClick={onClose} className="p-3 bg-slate-50 hover:bg-slate-180 rounded-2xl transition-colors">
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-50/30">
          <div className="grid grid-cols-1 gap-2">
            {users.map(u => (
              <div key={u.id} className="mb-1">
                <div
                  onClick={() => { if (type === 'B') setExpandedId(expandedId === u.id ? null : u.id); }}
                  className={`flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all border-2 ${expandedId === u.id ? 'border-indigo-500 bg-indigo-50' : 'border-transparent hover:bg-white hover:shadow-sm'}`}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-180 text-slate-500 flex items-center justify-center font-black text-xs shrink-0 overflow-hidden">
                      {u.image ? (
                        <img src={u.image} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-5 h-5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-black text-slate-900 truncate">
                        #{u.id} {u.name || 'Học viên'}
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          TS: {u.totalSubCount}
                        </span>
                        {u.level != null && (
                          <span className="px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 text-[8px] font-black">
                            Cấp {u.level}
                          </span>
                        )}
                        {u.groupName && (
                          <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[8px] font-black">
                            {u.groupName}
                          </span>
                        )}
                        {getChucDanhBadge(u.chucDanh)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Link
                      href={`/tools/students/${u.id}`}
                      target="_blank"
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 text-[10px] font-bold hover:bg-indigo-100 transition-colors"
                      title="Xem hồ sơ"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Hồ sơ
                    </Link>
                    {editMode && (
                      <>
                        <button onClick={(e) => { e.stopPropagation(); onAddChild?.(u.id); }}
                          className="px-2 py-1.5 rounded-lg bg-indigo-500 text-white text-[10px] font-bold hover:bg-indigo-600">
                          +F1
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onDeleteNode?.(u.id); }}
                          className="px-2 py-1.5 rounded-lg bg-red-500 text-white text-[10px] font-bold hover:bg-red-600">
                          X
                        </button>
                      </>
                    )}
                    {type === 'B' && (
                      <ChevronDown className={`w-5 h-5 text-slate-300 transition-transform ${expandedId === u.id ? 'rotate-180 text-sky-500' : ''}`} />
                    )}
                  </div>
                </div>

                {expandedId === u.id && type === 'B' && u.children && (
                  <div className="p-2 pl-14 space-y-1 animate-in slide-in-from-top-2">
                    {u.children.map((f2) => (
                      <div key={f2.id} className="p-3 bg-white border border-sky-180 rounded-2xl flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-sky-600">#{f2.id}</span>
                          <span className="text-xs font-bold text-slate-600">{f2.name}</span>
                          {f2.level != null && (
                            <span className="px-1 py-0.5 rounded-full bg-violet-50 text-violet-600 text-[8px] font-black">Cấp {f2.level}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Link href={`/tools/students/${f2.id}`} target="_blank" onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-50 text-indigo-600 text-[10px] font-bold hover:bg-indigo-100 transition-colors">
                            <ExternalLink className="w-3 h-3" />
                            Hồ sơ
                          </Link>
                          {editMode && (
                            <>
                              <button onClick={(e) => { e.stopPropagation(); onAddChild?.(f2.id); }}
                                className="px-2 py-1 rounded bg-indigo-500 text-white text-[10px] font-bold hover:bg-indigo-600">+F1</button>
                              <button onClick={(e) => { e.stopPropagation(); onDeleteNode?.(f2.id); }}
                                className="px-2 py-1 rounded bg-red-500 text-white text-[10px] font-bold hover:bg-red-600">X</button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
