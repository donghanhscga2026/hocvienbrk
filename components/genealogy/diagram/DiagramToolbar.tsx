'use client'

import { ChevronDown, ChevronRight, Search, Zap, X } from 'lucide-react'

interface DiagramToolbarProps {
  showActiveOnly: boolean
  setShowActiveOnly: (v: boolean) => void
  showMyTeamOnly: boolean
  setShowMyTeamOnly: (v: boolean) => void
  onMyTeamToggle?: (checked: boolean) => void
  showMyTeamCheckbox: boolean
  canToggleMyTeam: boolean
  displayMode: 'default' | 'full'
  setDisplayMode: (v: 'default' | 'full') => void
  editMode: boolean
  setEditMode: (v: boolean) => void
  searchInput: string
  setSearchInput: (v: string) => void
  searchError: string | null
  onSearch: () => void
  isTreeEmpty: boolean
  selectedSystem: number | null
  onCreateRoot: () => void
  isAdmin: boolean
  promotionLogic: 'A' | 'B'
  switchingLogic: boolean
  onSwitchLogic: (method: 'A' | 'B') => void
}

export default function DiagramToolbar({
  showActiveOnly,
  setShowActiveOnly,
  showMyTeamOnly,
  setShowMyTeamOnly,
  onMyTeamToggle,
  showMyTeamCheckbox,
  canToggleMyTeam,
  displayMode,
  setDisplayMode,
  editMode,
  setEditMode,
  searchInput,
  setSearchInput,
  searchError,
  onSearch,
  isTreeEmpty,
  selectedSystem,
  onCreateRoot,
  isAdmin,
  promotionLogic,
  switchingLogic,
  onSwitchLogic,
}: DiagramToolbarProps) {
  return (
    <div className="flex flex-col gap-3 p-4">
      {/* --- Hiển thị --- */}
      <div className="space-y-2">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hiển thị</span>

        <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 hover:bg-white hover:border-indigo-200 transition-all">
          <input
            type="checkbox"
            checked={displayMode === 'full'}
            onChange={(e) => setDisplayMode(e.target.checked ? 'full' : 'default')}
            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span className="text-[11px] font-black text-slate-700 uppercase tracking-tighter">Hiển thị đầy đủ</span>
        </label>
      </div>

      {/* --- Bộ lọc --- */}
      <div className="space-y-2">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bộ lọc</span>

        <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 hover:bg-white hover:border-indigo-200 transition-all">
          <input
            type="checkbox"
            checked={showActiveOnly}
            onChange={(e) => setShowActiveOnly(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span className="text-[11px] font-black text-slate-700 uppercase tracking-tighter">Chỉ Active</span>
        </label>

        {showMyTeamCheckbox && (
          <label className={`flex items-center gap-2 cursor-pointer bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 hover:bg-white hover:border-indigo-200 transition-all ${!canToggleMyTeam ? 'opacity-60 cursor-not-allowed' : ''}`}>
            <input
              type="checkbox"
              checked={showMyTeamOnly}
              disabled={!canToggleMyTeam}
              onChange={(e) => {
                if (!canToggleMyTeam) return
                if (onMyTeamToggle) {
                  onMyTeamToggle(e.target.checked)
                } else {
                  setShowMyTeamOnly(e.target.checked)
                }
              }}
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:bg-slate-200"
            />
            <span className="text-[11px] font-black text-slate-700 uppercase tracking-tighter whitespace-nowrap">Đội của tôi</span>
          </label>
        )}
      </div>

      {/* --- Tìm kiếm --- */}
      <div className="space-y-2">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tìm kiếm</span>
        <div className="relative flex items-center">
          <input
            type="text"
            placeholder="TÌM ID..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSearch()}
            className={`w-full bg-slate-50 text-slate-800 text-[11px] font-black pl-8 pr-8 py-2 rounded-xl border border-slate-200 outline-none placeholder:text-slate-400 transition-all focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50/50 ${searchError ? 'ring-2 ring-red-500 border-red-200' : ''}`}
          />
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          {searchInput && (
            <button
              onClick={() => setSearchInput('')}
              className="absolute right-8 text-slate-300 hover:text-red-400 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={onSearch}
            className="absolute right-1.5 p-1 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        {searchError && (
          <p className="text-[10px] font-bold text-red-500 mt-1">{searchError}</p>
        )}
      </div>

      {/* --- Chế độ chỉnh sửa --- */}
      <div className="space-y-2">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Thao tác</span>

        {isTreeEmpty && selectedSystem !== null && selectedSystem !== 0 ? (
          <button
            type="button"
            onClick={onCreateRoot}
            className="flex items-center gap-1.5 w-full px-3 py-2 rounded-xl bg-violet-600 text-white text-[11px] font-black hover:bg-violet-700 hover:scale-[1.02] transition-all shadow-md shadow-violet-200"
          >
            <Zap className="w-3.5 h-3.5" />
            <span className="uppercase">Tạo cây</span>
          </button>
        ) : (
          selectedSystem !== 0 && selectedSystem !== 1 && (
            <button
              onClick={() => setEditMode(!editMode)}
              className={`flex items-center gap-1.5 w-full px-3 py-2 rounded-xl text-[11px] font-black transition-all shadow-md ${editMode
                ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-orange-100'
                : 'bg-indigo-500 text-white hover:bg-indigo-600 shadow-indigo-100'
                }`}
            >
              {editMode ? 'HỦY CHẾ ĐỘ SỬA' : 'CHẾ ĐỘ SỬA'}
            </button>
          )
        )}
      </div>

      {/* --- Promotion Logic (Admin only, system 4) --- */}
      {isAdmin && selectedSystem === 4 && (
        <div className="space-y-2">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Phương án thăng cấp</span>
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
            <div className="relative flex-1">
              <select
                disabled={switchingLogic}
                value={promotionLogic}
                onChange={(e) => onSwitchLogic(e.target.value as 'A' | 'B')}
                className="w-full appearance-none bg-transparent text-slate-700 text-[10px] font-black pl-2 pr-6 py-1 rounded-lg outline-none cursor-pointer disabled:opacity-50"
              >
                <option value="B">Phương án B (Mặc định)</option>
                <option value="A">Phương án A (Real-time)</option>
              </select>
              <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>
            {switchingLogic && (
              <div className="w-3.5 h-3.5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin ml-1 shrink-0" />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
