'use client'

import { ArrowLeft, Home, Settings, Users } from 'lucide-react'

interface DiagramHeaderProps {
  selectedSystem: number | null
  focusedSubtreeNode: any | null
  focusedNodeName: string | null
  totalMembers: number
  onExitFocus: () => void
  onResetToRoot: () => void
  onOpenSettings: () => void
}

export default function DiagramHeader({
  selectedSystem,
  focusedSubtreeNode,
  focusedNodeName,
  totalMembers,
  onExitFocus,
  onResetToRoot,
  onOpenSettings,
}: DiagramHeaderProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-3 bg-white border-b shadow-sm z-40 sticky top-0">
      {/* --- Left: Navigation --- */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Nút Quay về (chỉ hiện khi đang ở Focus Subtree Mode) */}
        {focusedSubtreeNode && (
          <button
            onClick={onExitFocus}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-black hover:bg-amber-100 transition-all shrink-0"
            title="Quay về cây toàn bộ"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline uppercase">Quay về</span>
            {focusedNodeName && <span className="text-amber-500 truncate max-w-[60px] ml-1">({focusedNodeName})</span>}
          </button>
        )}

        {/* Nút Cây chính */}
        {selectedSystem !== null && (
          <button
            onClick={onResetToRoot}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 text-white text-[11px] font-black hover:bg-emerald-700 hover:scale-105 transition-all shrink-0 shadow-md shadow-emerald-200"
            title="Quay về cây mặc định"
          >
            <Home className="w-3.5 h-3.5" />
            <span className="hidden lg:inline uppercase">Cây chính</span>
          </button>
        )}
      </div>

      {/* --- Spacer --- */}
      <div className="flex-1" />

      {/* --- Member count badge --- */}
      {selectedSystem !== null && totalMembers > 0 && (
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-indigo-50 border border-indigo-100 shrink-0">
          <Users className="w-3 h-3 text-indigo-500" />
          <span className="text-[10px] font-black text-indigo-700 tracking-tight">{totalMembers}</span>
          <span className="text-[9px] font-bold text-indigo-400 uppercase hidden sm:inline">thành viên</span>
        </div>
      )}

      {/* --- Right: Settings trigger --- */}
      <button
        onClick={onOpenSettings}
        className="flex items-center justify-center p-2 rounded-xl bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 hover:text-slate-800 transition-all shrink-0 shadow-sm"
        title="Bộ lọc & Cài đặt"
      >
        <Settings className="w-4 h-4" />
      </button>
    </div>
  )
}
