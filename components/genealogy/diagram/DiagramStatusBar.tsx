'use client'

import { Zap } from 'lucide-react'
import { GenealogyNode } from '@/app/actions/admin-actions'

interface DiagramStatusBarProps {
  fullTree: GenealogyNode | null
  showMyTeamOnly: boolean
  showActiveOnly: boolean
  currentUserId: number | null
  selectedSystem: number | null
  loading: boolean
}

function findNodeStats(node: GenealogyNode, targetId: number): { count: number; stats?: any } | null {
  if (node.id === targetId) return { count: node.totalSubCount, stats: node.stats }
  const allChildren = [...(node.children || []), ...(node.groupA || []), ...(node.groupB || [])]
  for (const child of allChildren) {
    const found = findNodeStats(child, targetId)
    if (found) return found
  }
  return null
}

export default function DiagramStatusBar({
  fullTree,
  showMyTeamOnly,
  showActiveOnly,
  currentUserId,
  selectedSystem,
  loading,
}: DiagramStatusBarProps) {
  if (!fullTree) return null

  return (
    <div className="flex items-center gap-2 px-3 py-2 flex-wrap">
      {/* Total / Active / My Team count badge */}
      <div className="flex items-center gap-1.5 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 shadow-sm">
        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
          {showMyTeamOnly ? 'ĐỘI NHÓM' : (showActiveOnly ? 'ACTIVE' : 'TỔNG')}
        </span>
        <span className="text-[11px] font-black text-white">
          {(() => {
            if (!showMyTeamOnly) {
              return showActiveOnly ? (fullTree.stats?.active ?? 0) : (fullTree.stats?.total ?? fullTree.totalSubCount)
            }
            const myNodeData = currentUserId ? findNodeStats(fullTree, currentUserId) : null
            return myNodeData ? myNodeData.count : fullTree.totalSubCount
          })()}
        </span>
      </div>

      {/* Detailed stats: Active/BĐH/DHTT (system 1 only) */}
      {selectedSystem === 1 && (() => {
        const targetIdForStats = showMyTeamOnly ? currentUserId : fullTree.id
        if (!targetIdForStats) return null

        const findNodeStatsOnly = (node: GenealogyNode, targetId: number): any | null => {
          if (node.id === targetId) return node.stats
          const allChildren = [...(node.children || []), ...(node.groupA || []), ...(node.groupB || [])]
          for (const child of allChildren) {
            const found = findNodeStatsOnly(child, targetId)
            if (found) return found
          }
          return null
        }

        const activeStats = findNodeStatsOnly(fullTree, targetIdForStats)
        if (!activeStats) return null

        return (
          <>
            {!showActiveOnly && (
              <div className="flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1.5 rounded-xl border border-emerald-100">
                <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">ACTIVE</span>
                <span className="text-[11px] font-black text-emerald-700">{activeStats.active}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 bg-orange-50 px-2.5 py-1.5 rounded-xl border border-orange-100">
              <span className="text-[9px] font-black text-orange-500 uppercase tracking-widest">BĐH</span>
              <span className="text-[11px] font-black text-orange-700">{activeStats.bdh}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-pink-50 px-2.5 py-1.5 rounded-xl border border-pink-100">
              <span className="text-[9px] font-black text-pink-500 uppercase tracking-widest">DHTT</span>
              <span className="text-[11px] font-black text-pink-700">{activeStats.dhtt}</span>
            </div>
          </>
        );
      })()}

      {/* Loading indicator */}
      {loading && (
        <div className="flex items-center gap-2 ml-auto shrink-0">
          <div className="w-3 h-3 rounded-full border-2 border-rose-500 border-t-transparent animate-spin" />
          <span className="text-[10px] font-black uppercase text-slate-500 tracking-tighter">Đang cập nhật...</span>
        </div>
      )}
    </div>
  )
}
