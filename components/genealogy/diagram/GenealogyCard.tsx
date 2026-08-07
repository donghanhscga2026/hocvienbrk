import { User, Users, ChevronDown, ExternalLink } from 'lucide-react'
import { Position, Handle, NodeProps } from '@xyflow/react'
import { GenealogyNode } from '@/app/actions/admin-actions'
import { getLevelColor, getLevelBadgeColor, getChucDanhStyle } from '@/components/genealogy/lib/genealogy-helpers'

export const GenealogyCard = (props: NodeProps) => {
  const data = props.data as unknown as GenealogyNode & {
    isRoot?: boolean;
    isSearchTarget?: boolean;
    editMode?: boolean;
    displayMode?: 'default' | 'full';
    treeDepth?: number;
    onToggleExpand?: (id: number) => void;
    onFocusSubtree?: (id: number, name?: string | null) => void;
    onOpenGroup?: (type: 'A' | 'B', data: any[], totalSub: number) => void;
    onAddChild?: (parentId: number) => void;
    onDeleteNode?: (nodeId: number) => void;
    onShowDetails?: (userId: number) => void;
    onSearchNode?: (userId: number) => void;
    onShowSharingTree?: (userId: number, name: string | null) => void;
    currentUserId?: number | null;
  }

  const hasChildren = data.f1cCount > 0 || data.f1aCount > 0 || data.f1bCount > 0
  const isActuallyRoot = data.isRoot
  const isTarget = data.isSearchTarget
  const isFullMode = data.displayMode === 'full'
  const isCurrentUser = data.id === data.currentUserId

  const tcaLevel = data.level
  const treeDepth = data.treeDepth ?? 0
  const colorDepth = treeDepth

  const levelBadgeText = tcaLevel != null ? `Cấp ${tcaLevel}` : (treeDepth === 0 ? 'ROOT' : null)

  const hasTcaData = data.personalScore != null || data.totalScore != null
  const pScore = data.personalScore ?? 0
  const tScore = data.totalScore ?? 0

  return (
    <div className={`
      relative flex flex-col items-center justify-center w-[190px]
      ${hasChildren ? 'cursor-pointer' : 'cursor-default'}
      transition-all duration-300 transform group hover:-translate-y-1
    `}>
      {!isActuallyRoot && <Handle type="target" position={Position.Top} className="!opacity-0 !w-2 !h-2" style={{ top: -8 }} />}

      <div className="relative z-10 w-[164px] mx-auto -mt-10">
        {levelBadgeText && (
          <div className={`absolute -top-12 left-1/2 -translate-x-1/2 z-20 w-18 h-18 rounded-full flex items-center justify-center text-[35px] font-black border-4 border-white shadow-lg ${getLevelBadgeColor(colorDepth)}`}>
            {tcaLevel != null ? tcaLevel : '★'}
          </div>
        )}

        <div
          onClick={(e) => { e.stopPropagation(); data.onShowDetails?.(data.id); }}
          className={`relative p-2 bg-white rounded-full shadow-2xl cursor-pointer hover:scale-105 transition-transform 
            ${isTarget ? 'ring-4 ring-offset-2 ring-amber-400' : ''}
            ${isCurrentUser ? 'ring-4 ring-offset-4 ring-blue-500 animate-pulse shadow-[0_0_40px_rgba(59,130,246,0.6)]' : ''}
          `}
        >
          {isCurrentUser && (
            <div className="absolute inset-0 rounded-full animate-ping bg-blue-500 opacity-20 -z-10"></div>
          )}
          <div className={`w-[148px] h-[148px] rounded-full flex items-center justify-center text-white overflow-hidden shadow-inner border-4 bg-gradient-to-br ${getLevelColor(colorDepth, isActuallyRoot)}`}>
            {data.image ? (
              <img
                src={data.image}
                alt={data.name || ''}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-20 h-20 opacity-40" />
            )}
          </div>

          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 z-20 px-3 py-0.5 bg-white/95 backdrop-blur-sm rounded-full shadow-md border border-slate-100 text-[13px] font-black text-slate-600 tracking-tighter">
            #{data.id}
          </div>
        </div>
      </div>

      <div
        className={`${getChucDanhStyle(data.chucDanh)} px-2 pb-2 pt-12 -mt-8 rounded-2xl shadow-[0_15px_50px_rgb(0,0,0,0.12)] border border-slate-100 w-full text-center relative z-0 flex flex-col items-center hover:ring-2 hover:ring-indigo-400 transition-all`}
      >
        {data.seq != null && (
          <div className="absolute -top-2.5 -left-1.5 z-20 px-1.5 py-0.5 bg-indigo-500 text-white text-[10px] font-black rounded-full shadow-md leading-none">
            @{data.seq}
          </div>
        )}

        {data.sharingCount !== undefined && (
          <div 
            onClick={(e) => { e.stopPropagation(); data.onShowSharingTree?.(data.id, data.name); }}
            className="absolute -top-2.5 -right-1.5 z-20 px-1.5 py-0.5 bg-emerald-600 text-white text-[10px] font-black rounded-full shadow-md leading-none cursor-pointer hover:scale-110 active:scale-95 transition-transform" 
            title="Số thành viên phát triển được (nhân mạch chia sẻ) - Click để xem danh sách"
          >
            ${data.sharingCount}
          </div>
        )}

        <div className="font-bold text-[20px] text-slate-800 line-clamp-2 leading-tight uppercase mb-1.5 w-full px font-sans">
          {data.name || 'Thành viên'}
        </div>

        {hasTcaData ? (
          <div className="flex items-center justify-between w-full gap-1 mb-2">
            <div className={`flex-1 flex flex-col items-center py-0.5 rounded-lg text-[9px] font-black leading-tight ${pScore > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}
              title="Điểm cá nhân">
              <span className="text-[8px] font-medium opacity-70">CÁ NHÂN</span>
              <span>{pScore.toLocaleString('vi')}</span>
            </div>
            <div 
              onClick={(e) => { e.stopPropagation(); data.onSearchNode?.(data.id); }}
              className="flex-1 flex flex-col items-center py-0.5 rounded-lg text-[9px] font-black bg-violet-50 text-violet-600 leading-tight cursor-pointer hover:bg-violet-100 active:scale-95 transition-all"
              title="Tổng thành viên đội nhóm - Click để xem cây">
              <span className="text-[8px] font-medium opacity-70">ĐỘI NHÓM</span>
              <span>{data.totalSubCount || 0}</span>
            </div>
            <div className={`flex-1 flex flex-col items-center py-0.5 rounded-lg text-[9px] font-black leading-tight ${tScore > 0 ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-400'}`}
              title="Điểm đội nhóm">
              <span className="text-[8px] font-medium opacity-70">ĐIỂM ĐỘI</span>
              <span>{tScore.toLocaleString('vi')}</span>
            </div>
          </div>
        ) : (
          (data.totalSubCount || 0) > 0 ? (
            <div className="flex items-center justify-center w-full mb-1.5">
              <div 
                onClick={(e) => { e.stopPropagation(); data.onSearchNode?.(data.id); }}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 text-[9px] font-black cursor-pointer hover:bg-violet-100 active:scale-95 transition-all"
                title="Click để xem cây"
              >
                <Users className="w-2.5 h-2.5" />
                <span>{data.totalSubCount} thành viên</span>
              </div>
            </div>
          ) : null
        )}

        {data.editMode && (
          <div className="flex gap-2 w-full justify-center mb-2">
            <button
              onClick={(e) => { e.stopPropagation(); data.onAddChild?.(data.id); }}
              className="flex-1 max-w-[60px] py-1 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-bold hover:bg-indigo-500 hover:text-white transition-colors"
            >
              +F1
            </button>
            {!data.isRoot && (
              <button
                onClick={(e) => { e.stopPropagation(); data.onDeleteNode?.(data.id); }}
                className="w-7 py-1 rounded-full bg-rose-50 text-rose-600 text-[10px] font-bold hover:bg-rose-500 hover:text-white transition-colors flex items-center justify-center"
              >
                X
              </button>
            )}
          </div>
        )}

        {!isFullMode && (data.f1aCount > 0 || data.f1bCount > 0 || data.f1cCount > 0) && (
          <div className="flex justify-between items-center w-full mt-0.5 gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); if (data.f1aCount > 0) data.onOpenGroup?.('A', data.groupA || [], data.groupATotalSub || 0); }}
              className={`flex-1 flex flex-col items-center py-0.5 rounded-lg text-[9px] font-black border border-white shadow-sm transition-all
                ${data.f1aCount > 0
                  ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 cursor-pointer'
                  : 'bg-slate-50 text-slate-300 cursor-default pointer-events-none opacity-40'}`}
              title="F1 Lá — chưa có F2"
            >
              <span className="text-[7.5px] font-medium opacity-60 leading-tight">LÁ</span>
              <span>{data.f1aCount}</span>
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); if (data.f1cCount > 0) data.onFocusSubtree?.(data.id, data.name); }}
              className={`flex-[2] rounded-xl flex flex-col items-center justify-center gap-0 text-[9px] py-0.5 font-black shadow-sm transition-all
                ${data.f1cCount > 0
                  ? (props.selected ? 'bg-indigo-500 text-white' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 cursor-pointer')
                  : 'bg-slate-50 text-slate-300 cursor-default pointer-events-none opacity-40'}`}
              title="Mở nhánh sâu"
            >
              <Users className="w-3 h-3" />
              <span>{data.f1cCount} nhánh</span>
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); if (data.f1bCount > 0) data.onOpenGroup?.('B', data.groupB || [], data.groupBTotalSub || 0); }}
              className={`flex-1 flex flex-col items-center py-0.5 rounded-lg text-[9px] font-black border border-white shadow-sm transition-all
                ${data.f1bCount > 0
                  ? 'bg-sky-50 text-sky-700 hover:bg-sky-100 cursor-pointer'
                  : 'bg-slate-50 text-slate-300 cursor-default pointer-events-none opacity-40'}`}
              title="F1 Cạn — có F2 nhưng chưa có F3"
            >
              <span className="text-[7.5px] font-medium opacity-60 leading-tight">CẠN</span>
              <span>{data.f1bCount}</span>
            </button>
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="!opacity-0 !w-2 !h-2" style={{ bottom: -8 }} />
    </div>
  )
}

export const SearchNodeCard = (props: NodeProps) => {
  const data = props.data as { id: number; name: string | null; isTarget?: boolean; level?: number }
  const levelColors = ['bg-emerald-500', 'bg-sky-500', 'bg-violet-500', 'bg-rose-500', 'bg-orange-500']
  return (
    <>
      <Handle type="target" position={Position.Top} className="!bg-slate-400 !w-2 !h-2" style={{ left: '50%', transform: 'translateX(-50%)' }} />
      <div className={`
        bg-white rounded-xl px-3 py-2 w-32 sm:w-40 shadow-xl
        ${data.isTarget ? 'border-4 border-amber-400 ring-4 ring-amber-200' : 'border-2 border-slate-200'}
      `}>
        <div className="flex items-center justify-between mb-1">
          <div className={`
            text-[10px] font-black px-1.5 py-0.5 rounded-full text-white
            ${(data.level || 0) > 0 ? levelColors[Math.min(data.level || 0, levelColors.length - 1)] : 'bg-slate-400'}
          `}>
            {(data.level || 0) > 0 ? `F${data.level}` : 'Mới'}
          </div>
          <div className="font-black text-slate-900 text-xs sm:text-sm">#{data.id}</div>
        </div>
        <div className="text-[10px] sm:text-xs font-medium text-slate-500 uppercase text-center truncate">
          {data.name || 'HV'}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-slate-400 !w-2 !h-2" style={{ left: '50%', transform: 'translateX(-50%)' }} />
    </>
  )
}

export const nodeTypes = { genealogyCard: GenealogyCard, searchNode: SearchNodeCard }
