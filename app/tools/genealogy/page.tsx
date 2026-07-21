'use client'

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import { ArrowLeft, Home, User, Users, ChevronRight, X, Zap, ChevronDown, Search, Phone, Mail, Calendar, Smile, Award, Star, Coins, Sparkles, Gift, ArrowUpRight, ArrowUp, ArrowDown } from 'lucide-react'
import {
  ReactFlow,
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Position,
  Handle,
  NodeProps,
  useReactFlow,
  ReactFlowProvider,
  useStore,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { getGenealogyTreeAction, getGenealogyChildrenAction, getSystemTreeAction, getSystemChildrenAction, searchGenealogyByIdAction, getAvailableSystemsAction, getCurrentUserRoleAction, createSystemRootAction, getMemberDetailsAction, getSystemRootUserAction, getSystemPromotionLogicAction, switchSystemPromotionLogicAction, getMemberPromotionHistoryAction, GenealogyNode, SystemTreeInfo } from '@/app/actions/admin-actions'
import { Role } from '@prisma/client'
import MainHeader from '@/components/layout/MainHeader'
import * as d3 from 'd3-hierarchy'
import GroupModal, { GroupMember } from '@/components/genealogy/GroupModal'

// Constants cho tree layout
const NODE_WIDTH = 200
const NODE_HEIGHT = 130
const HORIZONTAL_SPACING = 20
const VERTICAL_SPACING = 450 // Sửa: tăng khoảng cách các hàng từ 320 lên 450

// Đếm số con trực tiếp của node
// Hàm đệ quy build D3 Tree object
type D3Node = { id: number; data: GenealogyNode; children: D3Node[] };
interface MemberDetailInfo {
  show: boolean;
  userId: number;
  data?: {
    user: any;
    tca: any;
    enrollment?: any;
    systemData?: {
      systemName: string;
      level: number | null;
      totalPoints: number | null;
      personalScore: number;
      seq: number | null;
      status: string | null;
      teamTotalBrkd: number;
      teamTotalVnd: number;
      joinedAt: Date | string | null;
      levelUpdatedAt?: Date | string | null;
      teamSize?: number;
      upline1?: { id: number; name: string | null } | null;
      upline2?: { id: number; name: string | null } | null;
      wallet: {
        balance: number;
        brkd: number;
        voucherBalance: number;
        totalEarned: number;
        totalWithdrawn: number;
      } | null;
    };
  };
  loading: boolean;
}

const buildD3Tree = (node: GenealogyNode, isFullMode: boolean, currentFocusMap?: Map<number, number>, isParentVisibleAndExpanded: boolean = true): D3Node | null => {
  const isFocusNode = isFullMode || isParentVisibleAndExpanded;
  if (!isFocusNode) return { id: node.id, data: node, children: [] };

  let childrenToRender = isFullMode
    ? [...(node.groupA || []), ...(node.groupB || []), ...(node.children || [])]
    : node.children || []

  if (childrenToRender) {
    childrenToRender = Array.from(new Map(childrenToRender.map(c => [c.id, c])).values())
  }

  const d3Children: D3Node[] = [];
  if (childrenToRender && childrenToRender.length > 0) {
    childrenToRender.forEach(child => {
      const subIsExpanded = isFullMode || (currentFocusMap?.get(node.id) === child.id);
      const childD3Node = buildD3Tree(child as GenealogyNode, isFullMode, currentFocusMap, subIsExpanded);
      if (childD3Node) d3Children.push(childD3Node);
    });
  }

  return { id: node.id, data: node, children: d3Children };
}

// Build position map với thuật toán d3-hierarchy chuẩn xác
const calculateNodePositions = (root: GenealogyNode, isFullMode: boolean, currentFocusMap?: Map<number, number>): Map<number, { x: number; y: number }> => {
  const positions = new Map<number, { x: number; y: number }>()

  const hierarchyRootObj = buildD3Tree(root, isFullMode, currentFocusMap, true);
  if (!hierarchyRootObj) return positions;

  const rootHierarchy = d3.hierarchy(hierarchyRootObj, d => d.children);
  const treeLayout = d3.tree<D3Node>().nodeSize([NODE_WIDTH + HORIZONTAL_SPACING, VERTICAL_SPACING]);
  treeLayout(rootHierarchy);

  const rootX = rootHierarchy.x || 0;

  rootHierarchy.each(node => {
    positions.set(node.data.id, { x: (node.x || 0) - rootX, y: node.y || 0 });
  });

  return positions;
}

// v8.4.0: Helper filter Active tree - đặt ngoài component để không tạo lại mỗi render
// Logic: Chỉ giữ node có groupName = "THÁI SƠN" và các node cha của nó
// Lọc cả children, groupA, groupB
const filterToActiveTree = (node: GenealogyNode): GenealogyNode | null => {
  // Lọc children trước - chỉ giữ children đã được filter
  const filteredChildren = (node.children || [])
    .map(c => filterToActiveTree(c))
    .filter(Boolean) as GenealogyNode[]

  // Lọc groupA
  const filteredGroupA = (node.groupA || [])
    .map(c => filterToActiveTree(c))
    .filter(Boolean) as GenealogyNode[]

  // Lọc groupB
  const filteredGroupB = (node.groupB || [])
    .map(c => filterToActiveTree(c))
    .filter(Boolean) as GenealogyNode[]

  // Gộp tất cả children đã lọc để kiểm tra
  const allFilteredChildren = [...filteredChildren, ...filteredGroupA, ...filteredGroupB]

  // Nếu node là Active → giữ lại với tất cả children đã lọc
  if (node.personalScore != null && Number(node.personalScore) > 0) {
    return { ...node, children: filteredChildren, groupA: filteredGroupA, groupB: filteredGroupB }
  }

  // Nếu có active children → giữ lại node cha với tất cả children đã lọc
  if (allFilteredChildren.length > 0) {
    return { ...node, children: filteredChildren, groupA: filteredGroupA, groupB: filteredGroupB }
  }

  // Không active và không có active children → bỏ
  return null
}

const getLevelColor = (level?: number, isRoot?: boolean) => {
  // Sửa: Node root màu đỏ đậm đặc biệt
  if (isRoot) return 'from-red-600 to-red-800 ring-red-300 border-red-900'
  const colors = [
    'from-amber-400 to-orange-500 ring-amber-200 border-amber-600', // Root - Gold/Yellow
    'from-emerald-400 to-teal-500 ring-emerald-200 border-emerald-600', // F1 - Green
    'from-blue-400 to-indigo-500 ring-blue-200 border-blue-600', // F2 - Blue
    'from-violet-400 to-purple-500 ring-violet-200 border-violet-600', // F3 - Purple
    'from-rose-400 to-pink-500 ring-rose-200 border-rose-600' // F4+ - Pink
  ]
  return colors[Math.min(level || 0, colors.length - 1)]
}

// Màu badge cấp bổ trợ với getLevelColor (màu nguyên, khác tône để nổi bật)
// Root=teal, F1=amber, F2=rose, F3=emerald, F4+=sky
const getLevelBadgeColor = (level?: number) => {
  const colors = [
    'bg-teal-500 text-white',    // Root   - amber semi → teal badge
    'bg-amber-500 text-white',   // F1     - teal semi  → amber badge
    'bg-rose-500 text-white',    // F2     - blue semi  → rose badge
    'bg-emerald-500 text-white', // F3     - purple semi→ emerald badge
    'bg-sky-500 text-white'      // F4+    - pink semi  → sky badge
  ]
  return colors[Math.min(level || 0, colors.length - 1)]
}

// v8.5.0: Helper lấy style màu nền dựa trên chucDanh đặc biệt
const getChucDanhStyle = (chucDanh?: string | null) => {
  if (!chucDanh) return 'bg-white'
  switch (chucDanh.toUpperCase()) {
    case 'C5': return 'bg-orange-400'    // Thành viên chiến lược - Da cam
    case 'C20': return 'bg-yellow-100'  // Thành viên core - Vàng nhạt
    case 'DHTT': return 'bg-pink-300'    // Tướng kinh doanh - Hồng
    default: return 'bg-white'
  }
}

const GenealogyCard = (props: NodeProps) => {
  const data = props.data as unknown as GenealogyNode & {
    isRoot?: boolean;
    isSearchTarget?: boolean;
    editMode?: boolean;
    displayMode?: 'default' | 'full';
    // depth level trong cây (từ role root) - dùng cho màu sắc avatar
    treeDepth?: number;
    onToggleExpand?: (id: number) => void;
    onFocusSubtree?: (id: number, name?: string | null) => void;
    onOpenGroup?: (type: 'A' | 'B', data: any[], totalSub: number) => void;
    onAddChild?: (parentId: number) => void;
    onDeleteNode?: (nodeId: number) => void;
    onShowDetails?: (userId: number) => void;
    onSearchNode?: (userId: number) => void;
    currentUserId?: number | null;
  }

  const hasChildren = data.f1cCount > 0 || data.f1aCount > 0 || data.f1bCount > 0
  const isActuallyRoot = data.isRoot
  const isTarget = data.isSearchTarget
  const isFullMode = data.displayMode === 'full'
  const isCurrentUser = data.id === data.currentUserId

  // Hiển thị Level thực từ TCA (ưu tiên data.level từ tca_member, fallback về treeDepth)
  const tcaLevel = data.level   // Giá trị thực từ bảng tca_member (Cấp 1, Cấp 2...)
  const treeDepth = data.treeDepth ?? 0  // Depth trong cây (0=root, 1=F1...)
  const colorDepth = treeDepth  // Dùng depth cây để tô màu avatar

  // Badge: Nếu có Level TCA thực → hiển thị "Cấp X", nếu không → ẩn
  const levelBadgeText = tcaLevel != null ? `Cấp ${tcaLevel}` : (treeDepth === 0 ? 'ROOT' : null)

  // Số liệu điểm ( chỉ có khi TCA member data tồn tại)
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

      {/* Avatar Circle - thiết kế mới đồng bộ với Modal chi tiết */}
      <div className="relative z-10 w-[164px] mx-auto -mt-10">
        {/* Level Badge hình tròn - cho lùi xuống 1 chút (từ -top-16 xuống -top-12) */}
        {levelBadgeText && (
          <div className={`absolute -top-12 left-1/2 -translate-x-1/2 z-20 w-18 h-18 rounded-full flex items-center justify-center text-[35px] font-black border-4 border-white shadow-lg ${getLevelBadgeColor(colorDepth)}`}>
            {tcaLevel != null ? tcaLevel : '★'}
          </div>
        )}

        {/* Container hình tròn hoàn chỉnh */}
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

          {/* ID thành viên - Mới: Đưa lên phần dưới của hình tròn như một chiếc tag */}
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 z-20 px-3 py-0.5 bg-white/95 backdrop-blur-sm rounded-full shadow-md border border-slate-100 text-[13px] font-black text-slate-600 tracking-tighter">
            #{data.id}
          </div>
        </div>
      </div>

      {/* Information Box - Tiếp ngay dưới circle, chèn lùi lên trên */}
      <div
        onClick={(e) => { e.stopPropagation(); data.onSearchNode?.(data.id); }}
        className={`${getChucDanhStyle(data.chucDanh)} px-2 pb-2 pt-12 -mt-8 rounded-2xl shadow-[0_15px_50px_rgb(0,0,0,0.12)] border border-slate-100 w-full text-center relative z-0 flex flex-col items-center cursor-pointer hover:ring-2 hover:ring-indigo-400 transition-all`}
      >
        {/* Số thứ tự tham gia hệ thống (góc trên bên trái) */}
        {data.seq != null && (
          <div className="absolute -top-2.5 -left-1.5 z-20 px-1.5 py-0.5 bg-indigo-500 text-white text-[10px] font-black rounded-full shadow-md leading-none">
            @{data.seq}
          </div>
        )}

        {/* Tên thành viên */}
        <div className="font-bold text-[20px] text-slate-800 line-clamp-2 leading-tight uppercase mb-1.5 w-full px font-sans">
          {data.name || 'Học viên'}
        </div>

        {/* --- CHẾ ĐỘ CÓ TCA DATA: hiện đầy đủ 3 chỉ số --- */}
        {hasTcaData ? (
          <div className="flex items-center justify-between w-full gap-1 mb-2">
            {/* Điểm cá nhân */}
            <div className={`flex-1 flex flex-col items-center py-0.5 rounded-lg text-[9px] font-black leading-tight ${pScore > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}
              title="Điểm cá nhân">
              <span className="text-[8px] font-medium opacity-70">CÁ NHÂN</span>
              <span>{pScore.toLocaleString('vi')}</span>
            </div>
            {/* Tổng thành viên */}
            <div className="flex-1 flex flex-col items-center py-0.5 rounded-lg text-[9px] font-black bg-violet-50 text-violet-600 leading-tight"
              title="Tổng thành viên đội nhóm">
              <span className="text-[8px] font-medium opacity-70">ĐỘI NHÓM</span>
              <span>{data.totalSubCount || 0}</span>
            </div>
            {/* Điểm đội */}
            <div className={`flex-1 flex flex-col items-center py-0.5 rounded-lg text-[9px] font-black leading-tight ${tScore > 0 ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-400'}`}
              title="Điểm đội nhóm">
              <span className="text-[8px] font-medium opacity-70">ĐIỂM ĐỘI</span>
              <span>{tScore.toLocaleString('vi')}</span>
            </div>
          </div>
        ) : (
          /* --- CHẾ ĐỘ KHÔNG CÓ TCA DATA (Học viên): chỉ hiện tổng thành viên gọn nhẹ --- */
          (data.totalSubCount || 0) > 0 ? (
            <div className="flex items-center justify-center w-full mb-1.5">
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 text-[9px] font-black">
                <Users className="w-2.5 h-2.5" />
                <span>{data.totalSubCount} thành viên</span>
              </div>
            </div>
          ) : null
        )}

        {/* Edit buttons */}
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

        {/* --- NHÓM A / NHÁNH CHÍNH / NHÓM B (chỉ compact mode) --- */}
        {!isFullMode && (data.f1aCount > 0 || data.f1bCount > 0 || data.f1cCount > 0) && (
          <div className="flex justify-between items-center w-full mt-0.5 gap-1">
            {/* Nhóm A: F1 không có ai bên dưới (lá) */}
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

            {/* Nhánh chính C: F1 có F3+ → expand subtree */}
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

            {/* Nhóm B: F1 có F2 nhưng chưa có F3 (cạn) */}
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

const SearchNodeCard = (props: NodeProps) => {
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

const nodeTypes = { genealogyCard: GenealogyCard, searchNode: SearchNodeCard }

function GenealogyFlow() {
  const { fitView, setCenter } = useReactFlow()
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAdminModal, setShowAdminModal] = useState(false)

  const [fullTree, setFullTree] = useState<GenealogyNode | null>(null)
  // v8.4.0: State cho filter Active
  const [showActiveOnly, setShowActiveOnly] = useState<boolean>(false)
  // v8.7.0: State cho "Đội của tôi"
  const [showMyTeamOnly, setShowMyTeamOnly] = useState<boolean>(false)
  const [canToggleMyTeam, setCanToggleMyTeam] = useState<boolean>(true)
  const [showMyTeamCheckbox, setShowMyTeamCheckbox] = useState<boolean>(true)
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)
  const [promotionLogic, setPromotionLogic] = useState<'A' | 'B'>('B')
  const [switchingLogic, setSwitchingLogic] = useState<boolean>(false)

  // v8.4.0: Computed tree - lọc tại nguồn data khi showActiveOnly thay đổi
  const filteredTree = useMemo(() => {
    if (!fullTree) return null
    if (!showActiveOnly) return fullTree
    return filterToActiveTree(fullTree)
  }, [fullTree, showActiveOnly])
  const [modalData, setModalData] = useState<{ users: GroupMember[], type: 'A' | 'B', totalSub: number } | null>(null)
  const [expandedF2Id, setExpandedF2Id] = useState<number | null>(null)
  const lastExpandedIdRef = useRef<number | null>(null)
  const activeFocusMapRef = useRef<Map<number, number>>(new Map())
  const [selectedSystem, setSelectedSystem] = useState<number | null>(null) // Mặc định: TCA (system 1)
  const [availableSystems, setAvailableSystems] = useState<SystemTreeInfo[]>([])
  const [isTreeEmpty, setIsTreeEmpty] = useState<boolean>(false)
  const [isAdmin, setIsAdmin] = useState<boolean>(false)
  const [displayMode, setDisplayMode] = useState<'default' | 'full'>('default')
  const focusMapSizeRef = useRef<number>(0)
  // Lưu nodeId vừa được expand để auto-center sau render
  const pendingCenterNodeIdRef = useRef<number | null>(null)
  // Focus Subtree Mode: tạm dùng 1 node làm root, hiển thị toàn bộ cây con
  const [focusedSubtreeNode, setFocusedSubtreeNode] = useState<GenealogyNode | null>(null)
  const [focusedNodeName, setFocusedNodeName] = useState<string | null>(null)

  // Load Promotion Logic configuration when system changes
  useEffect(() => {
    if (selectedSystem) {
      getSystemPromotionLogicAction(selectedSystem).then(res => {
        if (res.success && res.logic) {
          setPromotionLogic(res.logic as 'A' | 'B')
        }
      })
    }
  }, [selectedSystem])

  const handleSwitchPromotionLogic = async (method: 'A' | 'B') => {
    if (!selectedSystem || selectedSystem !== 4) return
    if (switchingLogic) return

    const confirmMsg = `Bạn có chắc chắn muốn chuyển sang ${method === 'A'
      ? 'Phương án A (Real-time thăng cấp & 3 ngày cân nhắc)'
      : 'Phương án B (Daily thăng cấp lúc 00:00 & 24h cân nhắc)'
      }? Hệ thống sẽ tiến hành xóa sạch và tính toán lại toàn bộ dữ liệu từ ngày 02/07/2026.`

    if (!confirm(confirmMsg)) return

    setSwitchingLogic(true)
    try {
      const res = await switchSystemPromotionLogicAction(selectedSystem, method)
      if (res.success) {
        setPromotionLogic(method)
        alert("Đã chuyển đổi phương án và tính toán lại toàn bộ dữ liệu thành công!")
        window.location.reload()
      } else {
        alert("Lỗi: " + (res.error || "Không thể chuyển đổi."))
      }
    } catch (err: any) {
      alert("Lỗi hệ thống: " + err.message)
    } finally {
      setSwitchingLogic(false)
    }
  }

  // Load available systems from database
  useEffect(() => {
    async function loadSystems() {
      console.log('[Genealogy] Loading available systems...')
      try {
        const result = await getAvailableSystemsAction()
        console.log('[Genealogy] Systems result:', result)
        if (result.success && Array.isArray(result.systems) && result.systems.length > 0) {
          setAvailableSystems(result.systems)
          console.log('[Genealogy] Systems loaded from DB:', result.systems.length)
        } else {
          console.log('[Genealogy] No systems or error:', result.error)
        }
      } catch (err) {
        console.error('[Genealogy] Error loading systems:', err)
      }
    }
    loadSystems()

    // Load current user role
    async function loadUserRole() {
      const result = await getCurrentUserRoleAction()
      console.log('[Genealogy] User role result:', result)
      if (result.success) {
        if (result.role === 'ADMIN') setIsAdmin(true)
        setCurrentUserId(result.userId ?? null)
        console.log('[Genealogy] Current User ID:', result.userId)
      }
    }
    loadUserRole()
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const sysInfo = params.get('sysInfo')
      if (sysInfo) {
        alert(`Chào mừng bạn! Bạn đã tham gia vào hệ thống kinh doanh ${sysInfo.toUpperCase()}.`)
        window.history.replaceState({}, '', window.location.pathname)
      }
    }
  }, [])
  const [focusMapVersion, setFocusMapVersion] = useState(0) // trigger re-render

  // Position map cho tree layout (Reingold-Tilford)
  const positionMapRef = useRef<Map<number, { x: number; y: number }>>(new Map())
  const [positionVersion, setPositionVersion] = useState(0)
  // Ref đồng bộ displayMode để initTree không bị stale closure khi gọi từ toggle
  const displayModeRef = useRef(displayMode)
  displayModeRef.current = displayMode
  // Ref chặn effect render khi displayMode đang được toggle (đợi fetch xong)
  const displayModeToggleRef = useRef(false)

  // Add F1 and delete node modals
  const [addF1Modal, setAddF1Modal] = useState<{ parentId: number, show: boolean }>({ parentId: 0, show: false })
  const [createRootModal, setCreateRootModal] = useState<{ show: boolean, systemId: number | null }>({ show: false, systemId: null })
  const [deleteNodeModal, setDeleteNodeModal] = useState<{ nodeId: number, show: boolean }>({ nodeId: 0, show: false })

  const [searchInput, setSearchInput] = useState<string>('')
  const [searchError, setSearchError] = useState<string | null>(null)
  const [isSearchMode, setIsSearchMode] = useState<boolean>(false)
  const [searchResult, setSearchResult] = useState<{
    path: { id: number; name: string | null }[];
    targetId: number;
  } | null>(null)

  // Edit and display modes
  const [editMode, setEditMode] = useState<boolean>(false)

  // User list for Add F1 modal
  const [usersList, setUsersList] = useState<{ id: number; name: string | null; email: string | null }[]>([])
  const [userSearch, setUserSearch] = useState<string>('')
  const [loadingUsers, setLoadingUsers] = useState<boolean>(false)

  // v8.5.0: Member Details Modal
  const [memberDetail, setMemberDetail] = useState<MemberDetailInfo>({ show: false, userId: 0, loading: false })

  const handleShowDetails = useCallback(async (userId: number) => {
    setMemberDetail({ show: true, userId, loading: true })
    const res = await getMemberDetailsAction(userId, selectedSystem || undefined)
    if (res.success) {
      setMemberDetail({ show: true, userId, data: { user: res.user, tca: res.tca, systemData: res.systemData || undefined, enrollment: res.enrollment }, loading: false })
    } else {
      setMemberDetail(prev => ({ ...prev, loading: false }))
    }
  }, [selectedSystem])

  const mergeSubtree = useCallback((root: GenealogyNode, subtree: GenealogyNode): GenealogyNode => {
    if (root.id === subtree.id) return { ...root, ...subtree }
    if (root.children) {
      return { ...root, children: root.children.map(c => mergeSubtree(c, subtree)) }
    }
    return root
  }, [])

  const getNodePosition = useCallback((tree: GenealogyNode, targetId: number, px: number = 0, py: number = 0, focusMap: Map<number, number> = new Map(), isParentVisibleAndExpanded: boolean = true): { x: number; y: number } | null => {
    if (tree.id === targetId) return { x: px, y: py }

    if (isParentVisibleAndExpanded && tree.children && tree.children.length > 0) {
      for (let i = 0; i < tree.children.length; i++) {
        const child = tree.children[i]
        const childX = px + (i - (tree.children.length - 1) / 2) * 200
        const childY = py + 300
        const subIsExpanded = focusMap.get(tree.id) === child.id
        const pos = getNodePosition(child, targetId, childX, childY, focusMap, subIsExpanded)
        if (pos) return pos
      }
    }
    return null
  }, [])

  const generateGraphNodes = useCallback((
    parent: GenealogyNode,
    px: number,
    py: number,
    actions: any,
    currentFocusMap: Map<number, number>,
    isParentVisibleAndExpanded: boolean = true,
    nodeEditMode?: boolean,
    nodeDisplayMode?: 'default' | 'full',
    positionMap?: Map<number, { x: number; y: number }>,
    level: number = 0
  ) => {
    const resNodes: Node[] = []
    const resEdges: Edge[] = []
    const nodeId = `node-${parent.id}`

    // Xác định vị trí thực tế của node
    let actualX = px
    let actualY = py
    if (positionMap && positionMap.has(parent.id)) {
      const pos = positionMap.get(parent.id)!
      actualX = pos.x
      actualY = pos.y
    }

    // Dành cho ReactFlow xử lý draggable
    const nodePosition = { x: actualX, y: actualY }

    // Tránh duplicate node keys
    if (!resNodes.some(n => n.id === nodeId)) {
      resNodes.push({
        id: nodeId,
        type: 'genealogyCard',
        position: nodePosition,
        draggable: true,
        data: {
          ...parent,
          editMode: nodeEditMode ?? editMode,
          displayMode: nodeDisplayMode ?? displayMode,
          treeDepth: level,   // depth trong cây (0=root) - dùng cho màu avatar
          onToggleExpand: actions.onToggleExpand,
          onFocusSubtree: (id: number, name?: string | null) => {
            setFocusedNodeName(name || null)
            setFocusedSubtreeNode(parent)
            pendingCenterNodeIdRef.current = null
            handleFocusSubtree(id, name)
          },
          onOpenGroup: (type: 'A' | 'B', data: any[], totalSub: number) => setModalData({ users: data as GroupMember[], type, totalSub }),
          onAddChild: (parentId: number) => setAddF1Modal({ parentId, show: true }),
          onDeleteNode: (nodeId: number) => setDeleteNodeModal({ nodeId, show: true }),
          onShowDetails: handleShowDetails,
          onSearchNode: handleSearchNodeClick,
          currentUserId: currentUserId
        },
      })
    }

    const isRoot = parent.id === fullTree?.id;
    const isFullMode = (nodeDisplayMode ?? displayMode) === 'full'
    // Full mode: luôn expand tất cả (hiển thị toàn bộ cây)
    // Default mode: chỉ hiển thị khi được click expand
    const isFocusNode = isFullMode || isParentVisibleAndExpanded;

    // Full mode: hiển thị toàn bộ cây từ children (không phân nhóm A/B/C)
    // Default mode: chỉ group C (có F3) là children
    let childrenToRender = isFullMode
      ? [...(parent.groupA || []), ...(parent.groupB || []), ...(parent.children || [])]
      : parent.children

    if (childrenToRender) {
      // Loại bỏ duplicate children để không tạo ra duplicate ReactFlow nodes/edges
      childrenToRender = Array.from(new Map(childrenToRender.map(c => [c.id, c])).values())
    }

    if (isFocusNode && childrenToRender && childrenToRender.length > 0) {
      // Sử dụng positionMap nếu có (Reingold-Tilford)
      childrenToRender.forEach((child, index) => {
        let childX: number, childY: number

        if (positionMap && positionMap.has(child.id)) {
          const pos = positionMap.get(child.id)!
          childX = pos.x
          childY = pos.y
        } else {
          // Fallback: tính khoảng cách dựa trên số lượng children
          const nodeWidth = Math.max(NODE_WIDTH + HORIZONTAL_SPACING, NODE_WIDTH + HORIZONTAL_SPACING * childrenToRender.length)
          childX = px + (index - (childrenToRender.length - 1) / 2) * nodeWidth
          childY = py + VERTICAL_SPACING
        }

        const subIsExpanded = currentFocusMap.get(parent.id) === child.id

        const sub = generateGraphNodes(child, childX, childY, actions, currentFocusMap, subIsExpanded, nodeEditMode, nodeDisplayMode, positionMap, level + 1)
        resNodes.push(...sub.resNodes); resEdges.push(...sub.resEdges)

        // Tránh duplicate edge keys
        const edgeId = `edge-${parent.id}-${child.id}`
        if (!resEdges.some(e => e.id === edgeId)) {
          resEdges.push({
            id: edgeId,
            source: nodeId,
            target: `node-${child.id}`,
            style: { stroke: '#0ea5e9', strokeWidth: 2 },
            type: 'smoothstep'
          })
        }
      })
    }
    return { resNodes, resEdges }
  }, [editMode, displayMode, setAddF1Modal, setDeleteNodeModal, setModalData])

  // Focus Subtree: lấy node đó làm root, expand toàn bộ cây con
  const handleFocusSubtree = useCallback(async (nodeId: number, nodeName?: string | null) => {
    console.log(`[FocusSubtree] Focusing on node #${nodeId}`);
    setLoading(true)
    try {
      let result;
      if (selectedSystem === null || selectedSystem === 0) {
        result = await getGenealogyChildrenAction(nodeId)
      } else {
        result = await getSystemChildrenAction(nodeId, selectedSystem)
      }
      if (result.success && result.tree) {
        setFocusedNodeName(nodeName || `#${nodeId}`)
        pendingCenterNodeIdRef.current = null
        console.log(`[FocusSubtree] Loaded subtree for #${nodeId}, children: ${result.tree.children?.length}`);
      } else {
        console.log(`[FocusSubtree] Failed:`, result.error)
      }
    } catch (e) {
      console.error('[FocusSubtree] Error:', e)
    }
    setLoading(false)
  }, [selectedSystem])

  // Thoát Focus Subtree Mode, quay về cây đầy đủ
  const handleExitFocusSubtree = useCallback(() => {
    setFocusedSubtreeNode(null)
    setFocusedNodeName(null)
    pendingCenterNodeIdRef.current = null
    setFocusMapVersion(v => v + 1)
  }, [])

  const handleToggleExpand = useCallback(async (id: number) => {
    console.log(`[Action] Trigger Toggle Expand for Node #${id}`);
    setLoading(true)
    lastExpandedIdRef.current = id

    try {
      let result;
      if (selectedSystem === null || selectedSystem === 0) {
        result = await getGenealogyChildrenAction(id)
      } else {
        result = await getSystemChildrenAction(id, selectedSystem)
      }
      console.log(`[API] Fetch children for #${id} result:`, result.success ? 'Success' : 'Failed');

      if (result.success && result.tree && fullTree) {
        console.log(`[Tree] FullTree root:`, fullTree.id);

        setFullTree(prev => {
          const updatedTree = mergeSubtree(prev!, result.tree!);
          console.log(`[Tree] Merged, root children count:`, updatedTree.children?.length);
          return { ...updatedTree };
        });

        const findParentId = (node: GenealogyNode, targetId: number): number | null => {
          if (node.children?.some(c => c.id === targetId)) return node.id;
          for (const c of (node.children || [])) {
            const p = findParentId(c, targetId);
            if (p !== null) return p;
          }
          return null;
        };

        const pId = findParentId(fullTree, id);
        console.log(`[Logic] Parent of #${id} is #${pId !== null ? pId : 'Unknown'}`);

        if (pId !== null) {
          if (activeFocusMapRef.current.get(pId) === id) {
            console.log(`[Focus] Collapsing Node #${id}`);
            activeFocusMapRef.current.delete(pId);
            pendingCenterNodeIdRef.current = null  // Collapse → không center
          } else {
            console.log(`[Focus] Expanding Node #${id}, auto-collapsing siblings`);
            activeFocusMapRef.current.set(pId, id);
            pendingCenterNodeIdRef.current = id  // Đánh dấu center vào node này
          }
          focusMapSizeRef.current = activeFocusMapRef.current.size;
          setFocusMapVersion(v => v + 1);
        }
      } else {
        console.log(`[API] Failed or no tree: fullTree=`, !!fullTree);
      }
    } catch (e) {
      console.error("[Fatal] Error in handleToggleExpand:", e);
    }
    setLoading(false);
  }, [fullTree, mergeSubtree, selectedSystem])

  const handleSearch = useCallback(async (forcedId?: number, forcedSystemId?: number | null, forceLimitAncestors: boolean = false) => {
    const idStr = forcedId ? `#${forcedId}` : searchInput
    const id = parseInt(idStr.replace('#', ''))
    if (isNaN(id)) {
      setSearchError('ID không hợp lệ')
      return
    }
    setSearchError(null)
    setIsSearchMode(true)
    setLoading(true)
    setSearchResult(null)

    try {
      const activeSystemId = forcedSystemId !== undefined ? forcedSystemId : selectedSystem
      const systemIdForSearch = activeSystemId === 0 ? undefined : (activeSystemId ?? undefined)
      console.log('[SEARCH] Searching for ID:', id, 'systemId:', systemIdForSearch)

      // v8.7.0: Nêu là "Đội của tôi" thì chỉ lấy 2 tầng cha. Hỗ trợ forceLimitAncestors khi click vào ô chữ nhật node.
      const limitAncestors = ((forcedId && showMyTeamOnly) || forceLimitAncestors) ? 2 : null
      const result = await searchGenealogyByIdAction(id, systemIdForSearch, limitAncestors)
      console.log('[SEARCH] Result success:', result.success)

      if (result.success && result.mergedTree) {
        // v8.5.0: Dùng mergedTree để hiển thị trọn vẹn (Ancestors + Subtree)
        setFullTree(result.mergedTree as GenealogyNode)
        setIsSearchMode(true)
        setDisplayMode('full')

        if (result.path) {
          setSearchResult({
            path: result.path,
            targetId: result.targetId
          })

          // Xây dựng focus map từ path
          activeFocusMapRef.current = new Map()
          for (let i = 0; i < result.path.length - 1; i++) {
            activeFocusMapRef.current.set(result.path[i].id, result.path[i + 1].id)
          }
          focusMapSizeRef.current = activeFocusMapRef.current.size
          setFocusMapVersion(v => v + 1)
        }

        setError(null)
      } else {
        console.log('[SEARCH] Not found:', result.error)
        setSearchError(result.error || `Không tìm thấy mã #${id}`)
        setIsSearchMode(false)
        setSearchResult(null)
      }
    } catch (e) {
      console.error('[SEARCH] Error:', e)
      setSearchError('Lỗi khi tìm kiếm')
      setIsSearchMode(false)
      setSearchResult(null)
    }
    setLoading(false)
  }, [searchInput, selectedSystem, mergeSubtree, showMyTeamOnly])

  const handleSearchNodeClick = useCallback(async (nodeId: number) => {
    setSearchInput(`#${nodeId}`)
    await handleSearch(nodeId, undefined, true)
  }, [handleSearch])

  const handleSystemChange = useCallback(async (systemId: number | null) => {
    setSelectedSystem(systemId)
    setLoading(true)
    setError(null)
    setIsTreeEmpty(false)
    activeFocusMapRef.current = new Map()
    focusMapSizeRef.current = 0
    setFocusMapVersion(v => v + 1)
    lastExpandedIdRef.current = null
    setIsSearchMode(false)
    setSearchResult(null)
    setFocusedSubtreeNode(null)
    setFocusedNodeName(null)

    // Lấy userId hiện tại và kiểm tra vai trò hệ thống
    const roleResult = await getCurrentUserRoleAction(systemId || undefined)
    const currentUserIdLocal = roleResult.userId || 0
    const isAdminNow = roleResult.success && roleResult.role === Role.ADMIN

    // CẬP NHẬT LOGIC CHECKBOX "ĐỘI CỦA TÔI" THEO QUY TẮC MỚI:
    let shouldShowMyTeamLocal = false
    if (roleResult.success) {
      if (roleResult.isRoot) {
        // 1. Nếu là Root (Admin 0 hoặc Root Hệ thống) -> Ẩn hoàn toàn Checkbox
        setShowMyTeamCheckbox(false)
        setShowMyTeamOnly(false)
        shouldShowMyTeamLocal = false
      } else {
        setShowMyTeamCheckbox(true)
        setShowMyTeamOnly(true)
        shouldShowMyTeamLocal = true // Mặc định là Đội của tôi cho C5 và User thường

        if (roleResult.canViewFull) {
          // Nếu có quyền xem Full (C5 hoặc Admin) -> Cho phép bỏ tích
          setCanToggleMyTeam(true)
        } else {
          // Thành viên thường -> Khóa (disabled)
          setCanToggleMyTeam(false)
        }
      }
    }

    if (shouldShowMyTeamLocal) {
      setSearchInput(`#${currentUserIdLocal}`)
      await handleSearch(currentUserIdLocal, systemId)
      setLoading(false)
      return
    }

    // Tính toán displayMode hợp lý ngay trong hàm để tránh lỗi state cũ
    const intendedDisplayMode = (systemId !== null && systemId !== 0) ? 'full' : 'default'

    try {
      if (systemId === null) {
        setFullTree(null)
      } else if (systemId === 0) {
        // Hệ thống Học viên - lấy từ user đang đăng nhập
        const result = await getGenealogyTreeAction(currentUserIdLocal)
        if (result.success && result.tree) {
          setFullTree(result.tree)
          setIsTreeEmpty(false)
        } else {
          setFullTree(null)
          setIsTreeEmpty(true)
          alert('Chưa có dữ liệu nhân mạch. Hãy bắt đầu giới thiệu thành viên để xây dựng cây.')
        }
      } else {
        // Hệ thống TCA/KTC - gọi với forceFull theo intendedDisplayMode
        const result = await getSystemTreeAction(systemId, intendedDisplayMode === 'full')
        if (result.success && result.tree) {
          setFullTree(result.tree)
          setIsTreeEmpty(false)
        } else {
          const errMsg = result.error || ''
          // Nếu lỗi là "không tìm thấy root" hoặc "không thuộc hệ thống"
          const isNoRootError = errMsg.includes('root') || errMsg.includes('thuộc')

          if (isAdminNow && isNoRootError) {
            // Admin + hệ thống chưa có root
            setFullTree(null)
            setIsTreeEmpty(true)
            alert('Hệ thống chưa có dữ liệu. Nhấn nút + để tạo cây sơ đồ với bạn làm root.')
          } else if (!isAdminNow) {
            // User thường: nếu không có root hoặc không thuộc hệ thống
            setFullTree(null)
            alert('Bạn chưa tham gia hệ thống đã chọn')
          } else {
            // Admin: Nếu có lỗi khác thì chỉ set null, không alert "chưa tham gia"
            setFullTree(null)
          }
        }
      }
    } catch (e) {
      setFullTree(null)
      setError("Lỗi khi tải dữ liệu")
    }
    setDisplayMode(intendedDisplayMode)
    setLoading(false)
  }, [handleSearch])

  // v8.8.0: Quay về cây chính (Root Admin -> Full System, User -> My Team)
  const handleResetToRoot = useCallback(async () => {
    if (selectedSystem === null) return
    await handleSystemChange(selectedSystem)
  }, [selectedSystem, handleSystemChange])

  const initTree = useCallback(async (rootId: number = 0) => {
    setLoading(true); setError(null); setIsTreeEmpty(false); activeFocusMapRef.current = new Map(); focusMapSizeRef.current = 0; lastExpandedIdRef.current = null

    let result;
    if (selectedSystem === null) {
      setLoading(false)
      return
    } else if (selectedSystem === 0) {
      result = await getGenealogyTreeAction(rootId)
    } else {
      // Hệ thống TCA/KTC - gọi với forceFull theo displayMode hiện tại (từ ref)
      result = await getSystemTreeAction(selectedSystem, displayModeRef.current === 'full')
    }

    if (result && result.success && result.tree) {
      setFullTree(result.tree)
      setIsTreeEmpty(false)
    } else if (result) {
      // Khi không tìm thấy cây (root không tồn tại)
      setFullTree(null)
      setIsTreeEmpty(true)
      setError(null)
    }
    setLoading(false)
  }, [selectedSystem])

  const handleClearSearch = useCallback(() => {
    setSearchInput('')
    setSearchError(null)
    setIsSearchMode(false)
    setSearchResult(null)
    initTree(0)
  }, [initTree])

  useEffect(() => {
    if (displayModeToggleRef.current) {
      displayModeToggleRef.current = false
      return
    }
    if (filteredTree) {
      const treeToRender = focusedSubtreeNode ?? filteredTree
      if (!treeToRender) return

      const isFocusMode = focusedSubtreeNode !== null
      const isFullMode = isFocusMode || displayMode === 'full'
      try {
        const newMap = calculateNodePositions(treeToRender, isFullMode, activeFocusMapRef.current)
        positionMapRef.current = newMap
        setPositionVersion(v => v + 1)
      } catch (e) {
        console.error('[Tree] Position map error:', e)
      }

      const { resNodes, resEdges } = generateGraphNodes(treeToRender, 0, 0, { onToggleExpand: handleToggleExpand, onFocusSubtree: handleFocusSubtree, onShowDetails: handleShowDetails }, activeFocusMapRef.current, true, editMode, isFocusMode ? 'full' : displayMode, positionMapRef.current)

      const uniqueNodes = Array.from(new Map(resNodes.map(item => [item.id, item])).values())
      const uniqueEdges = Array.from(new Map(resEdges.map(item => [item.id, item])).values())

      setNodes(uniqueNodes); setEdges(uniqueEdges)

      const centerNodeId = pendingCenterNodeIdRef.current
      if (centerNodeId !== null && positionMapRef.current.has(centerNodeId)) {
        const pos = positionMapRef.current.get(centerNodeId)!
        setTimeout(() => {
          setCenter(pos.x + NODE_WIDTH / 2, pos.y + NODE_HEIGHT * 2, { zoom: 1.2, duration: 600 })
        }, 120)
        pendingCenterNodeIdRef.current = null
      } else {
        setTimeout(() => fitView({ padding: 0.15, duration: 700 }), 100)
      }
    }
  }, [filteredTree, focusedSubtreeNode, focusMapVersion, generateGraphNodes, handleToggleExpand, setNodes, setEdges, fitView, setCenter, getNodePosition, editMode, displayMode])

  // Fetch users when Add F1 modal opens
  useEffect(() => {
    if (addF1Modal.show && usersList.length === 0) {
      setLoadingUsers(true)
      fetch('/api/admin/users/list')
        .then(res => res.json())
        .then(data => {
          if (data.users) setUsersList(data.users)
        })
        .catch(console.error)
        .finally(() => setLoadingUsers(false))
    }
  }, [addF1Modal.show, usersList.length])

  // Fetch users when Create Root modal opens
  useEffect(() => {
    if (createRootModal.show && usersList.length === 0) {
      setLoadingUsers(true)
      fetch('/api/admin/users/list')
        .then(res => res.json())
        .then(data => {
          if (data.users) setUsersList(data.users)
        })
        .catch(console.error)
        .finally(() => setLoadingUsers(false))
    }
  }, [createRootModal.show, usersList.length])

  // Filtered users based on search
  const filteredUsers = userSearch.trim()
    ? usersList.filter(u =>
      u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
      String(u.id).includes(userSearch)
    )
    : usersList

  // Handle add child
  const handleAddChild = async (childId: number) => {
    if (!selectedSystem) return
    try {
      const res = await fetch('/api/system-tree/add-child', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onSystem: selectedSystem, parentId: addF1Modal.parentId, childId })
      })
      const data = await res.json()
      if (data.success) {
        setAddF1Modal({ parentId: 0, show: false })
        initTree(0)
      } else {
        alert(data.error || 'Lỗi khi thêm F1')
      }
    } catch (e) {
      alert('Lỗi khi thêm F1')
    }
  }

  // Handle delete node
  const handleDeleteNode = async () => {
    if (!selectedSystem) return
    try {
      const res = await fetch('/api/system-tree/delete-node', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onSystem: selectedSystem, nodeId: deleteNodeModal.nodeId })
      })
      const data = await res.json()
      if (data.success) {
        setDeleteNodeModal({ nodeId: 0, show: false })
        initTree(0)
      } else {
        alert(data.error || 'Lỗi khi xóa node')
      }
    } catch (e) {
      alert('Lỗi khi xóa node')
    }
  }

  useEffect(() => {
    if (searchResult) {
      setTimeout(() => {
        fitView({ padding: 0.3, duration: 500 })
      }, 100)
    }
  }, [searchResult, fitView])

  return (
    <div className="h-screen bg-slate-50 flex flex-col overflow-hidden font-sans text-slate-900">
      <MainHeader title="NHÂN MẠCH" toolSlug="genealogy" />

      {/* Thanh công cụ điều khiển - Tối ưu v8.9.0 (2 hàng trên mobile) */}
      <div className="flex flex-wrap items-center gap-y-3 gap-x-2 px-3 py-3 bg-white border-b shadow-sm z-40 sticky top-0">

        {/* --- NHÓM 1: HỆ THỐNG & ĐIỀU HƯỚNG --- */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Dropdown chọn hệ thống - v8.9.0: Giao diện premium hơn */}
          <div className="relative shrink-0">
            <select
              value={selectedSystem === null ? '' : selectedSystem}
              onChange={(e) => {
                const val = e.target.value
                const systemId = val === '' ? null : Number(val)
                handleSystemChange(systemId)
              }}
              className={`w-64 sm:w-72 appearance-none bg-slate-50 text-slate-700 text-[11px] font-black px-3 py-2 pr-8 rounded-xl border border-slate-200 outline-none cursor-pointer transition-all hover:bg-white hover:border-indigo-300 ${selectedSystem === null ? 'animate-[pulse_1.5s_infinite] ring-4 ring-pink-500/30 border-pink-500 bg-pink-50 text-pink-700 scale-105 shadow-[0_0_20px_rgba(236,72,153,0.4)]' : ''}`}
            >
              <option value="">{selectedSystem === null ? '➔ CHỌN HỆ THỐNG' : 'HỆ THỐNG'}</option>
              {availableSystems.map((sys) => (
                <option key={sys.onSystem} value={sys.onSystem}>
                  {sys.nameSystem || sys.onSystem}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>

          {/* Nút Quản trị (chỉ hiện cho ADMIN) */}
          {isAdmin && (
            <button
              onClick={() => setShowAdminModal(true)}
              className="flex items-center justify-center p-2 rounded-xl bg-slate-900 text-yellow-400 border border-slate-800 hover:bg-black transition-all shrink-0 shadow-md"
              title="Quản trị hệ thống"
            >
              <Zap className="w-4 h-4 text-yellow-400" />
            </button>
          )}

          {/* Nút Quay về (chỉ hiện khi đang ở Focus Subtree Mode) */}
          {focusedSubtreeNode && (
            <button
              onClick={handleExitFocusSubtree}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-black hover:bg-amber-100 transition-all shrink-0"
              title="Quay về cây toàn bộ"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline uppercase">Quay về</span>
              {focusedNodeName && <span className="text-amber-500 truncate max-w-[60px] ml-1">({focusedNodeName})</span>}
            </button>
          )}

          {/* v8.8.0: Nút Quay về cây chính */}
          {selectedSystem !== null && (
            <button
              onClick={handleResetToRoot}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 text-white text-[11px] font-black hover:bg-emerald-700 hover:scale-105 transition-all shrink-0 shadow-md shadow-emerald-200"
              title="Quay về cây mặc định (Hệ thống hoặc Đội của tôi)"
            >
              <Home className="w-3.5 h-3.5" />
              <span className="hidden lg:inline uppercase">Cây chính</span>
            </button>
          )}

          {/* Checkbox chế độ hiển thị Đầy đủ */}
          <label className="flex items-center gap-2 cursor-pointer shrink-0 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-white hover:border-indigo-200 transition-all">
            <input
              type="checkbox"
              checked={displayMode === 'full'}
              onChange={(e) => {
                const newMode = e.target.checked ? 'full' : 'default'
                displayModeRef.current = newMode
                setDisplayMode(newMode)
                if (selectedSystem !== null && selectedSystem !== 0) {
                  displayModeToggleRef.current = true
                  setNodes([])
                  setEdges([])
                  initTree(0)
                }
              }}
              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-[11px] font-black text-slate-700 uppercase tracking-tighter">Đầy đủ</span>
          </label>
        </div>

        {/* --- NHÓM 2: BỘ LỌC & TÌM KIẾM --- */}
        <div className="flex items-center gap-2 flex-grow sm:flex-nowrap">

          {/* Checkbox Active filter */}
          <label className="flex items-center gap-2 cursor-pointer shrink-0 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-white hover:border-indigo-200 transition-all">
            <input
              type="checkbox"
              checked={showActiveOnly}
              onChange={(e) => setShowActiveOnly(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-[11px] font-black text-slate-700 uppercase tracking-tighter">Active</span>
          </label>

          {/* v8.7.0: Checkbox "Đội của tôi" - Cập nhật v9.0: Logic phân quyền Root/C5 */}
          {showMyTeamCheckbox && (
            <label className={`flex items-center gap-2 cursor-pointer shrink-0 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-white hover:border-indigo-200 transition-all ${!canToggleMyTeam ? 'opacity-60 cursor-not-allowed' : ''}`}>
              <input
                type="checkbox"
                checked={showMyTeamOnly}
                disabled={!canToggleMyTeam}
                onChange={(e) => {
                  if (!canToggleMyTeam) return
                  const checked = e.target.checked
                  setShowMyTeamOnly(checked)
                  if (checked && currentUserId) {
                    setSearchInput(`#${currentUserId}`)
                    handleSearch(currentUserId)
                  } else if (!checked) {
                    handleClearSearch()
                  }
                }}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:bg-slate-200"
              />
              <span className="text-[11px] font-black text-slate-700 uppercase tracking-tighter whitespace-nowrap">Đội của tôi</span>
            </label>
          )}

          {/* Nút Tạo cây/Sửa */}
          <div className="shrink-0">
            {isTreeEmpty && selectedSystem !== null && selectedSystem !== 0 ? (
              <button
                type="button"
                onClick={() => setCreateRootModal({ show: true, systemId: selectedSystem })}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-600 text-white text-[11px] font-black hover:bg-violet-700 hover:scale-105 transition-all shadow-md shadow-violet-200"
              >
                <Zap className="w-3.5 h-3.5" />
                <span className="hidden sm:inline uppercase">Tạo cây</span>
              </button>
            ) : (
              // v9.1.0: Chỉ hiện nút SỬA nếu không phải hệ thống Học viên (0) hoặc TCA (1)
              selectedSystem !== 0 && selectedSystem !== 1 && (
                <button
                  onClick={() => setEditMode(!editMode)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-black transition-all shadow-md ${editMode
                    ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-orange-100'
                    : 'bg-indigo-500 text-white hover:bg-indigo-600 shadow-indigo-100'
                    }`}
                >
                  {editMode ? 'HỦY' : 'SỬA'}
                </button>
              )
            )}
          </div>

          {/* Ô tìm kiếm - v8.9.0: Tối ưu không gian */}
          <div className="relative flex items-center flex-grow min-w-[120px] sm:max-w-[180px]">
            <input
              type="text"
              placeholder="TÌM ID..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className={`w-full bg-slate-50 text-slate-800 text-[11px] font-black pl-8 pr-8 py-2 rounded-xl border border-slate-200 outline-none placeholder:text-slate-400 transition-all focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50/50 ${searchError ? 'ring-2 ring-red-500 border-red-200' : ''}`}
            />
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            {searchInput && (
              <button
                onClick={() => { setSearchInput(''); setSearchError(null); }}
                className="absolute right-8 text-slate-300 hover:text-red-400 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={() => handleSearch()}
              className="absolute right-1.5 p-1 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Promotion Logic Switch Dropdown (Chỉ hiển thị cho ADMIN và khi chọn Hệ thống BRK = 4) */}
        {isAdmin && selectedSystem === 4 && (
          <div className="relative shrink-0 flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-white hover:border-indigo-300 transition-all">
            <div className="relative">
              <select
                disabled={switchingLogic}
                value={promotionLogic}
                onChange={(e) => handleSwitchPromotionLogic(e.target.value as 'A' | 'B')}
                className="appearance-none bg-transparent text-slate-700 text-[10px] font-black pl-2 pr-6 py-1 rounded-lg outline-none cursor-pointer disabled:opacity-50"
              >
                <option value="B">Phương án B (Mặc định)</option>
                <option value="A">Phương án A (Real-time)</option>
              </select>
              <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>
            {switchingLogic && (
              <div className="w-3.5 h-3.5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin ml-1" />
            )}
          </div>
        )}

        {/* v8.8.1: Khối thống kê - Tối ưu v9.4: Fix số liệu nhảy theo đúng Đội của tôi */}
        {fullTree && (
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 ml-0 sm:ml-2 sm:border-l sm:border-slate-200 sm:pl-3 shrink-0">
            <div className="flex items-center gap-1.5 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 shadow-sm">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                {showMyTeamOnly ? 'ĐỘI NHÓM' : (showActiveOnly ? 'ACTIVE' : 'TỔNG')}
              </span>
              <span className="text-[11px] font-black text-white">
                {(() => {
                  // 1. Nếu xem Toàn hệ thống -> Lấy thẳng từ Root của cây
                  if (!showMyTeamOnly) {
                    return showActiveOnly ? (fullTree.stats?.active ?? 0) : (fullTree.stats?.total ?? fullTree.totalSubCount);
                  }

                  // 2. Nếu xem Đội của tôi -> Phải tìm đúng Node của mình trong cây để lấy số liệu
                  const targetIdForStats = currentUserId;
                  const findNodeStats = (node: GenealogyNode, targetId: number): { count: number, stats?: any } | null => {
                    if (node.id === targetId) return { count: node.totalSubCount, stats: node.stats };
                    const allChildren = [...(node.children || []), ...(node.groupA || []), ...(node.groupB || [])];
                    for (const child of allChildren) {
                      const found = findNodeStats(child, targetId);
                      if (found) return found;
                    }
                    return null;
                  };

                  const myNodeData = targetIdForStats ? findNodeStats(fullTree, targetIdForStats) : null;
                  return myNodeData ? myNodeData.count : fullTree.totalSubCount;
                })()}
              </span>
            </div>

            {/* Hiển thị chi tiết stats (Active/BĐH/DHTT) của đúng đối tượng đang xem - Chỉ hiện khi chọn Hệ thống #1 */}
            {selectedSystem === 1 && (() => {
              const targetIdForStats = showMyTeamOnly ? currentUserId : fullTree.id;
              const findNodeStats = (node: GenealogyNode, targetId: number): any | null => {
                if (node.id === targetId) return node.stats;
                const allChildren = [...(node.children || []), ...(node.groupA || []), ...(node.groupB || [])];
                for (const child of allChildren) {
                  const found = findNodeStats(child, targetId);
                  if (found) return found;
                }
                return null;
              };

              const activeStats = targetIdForStats ? findNodeStats(fullTree, targetIdForStats) : fullTree.stats;

              if (!activeStats) return null;

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
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-500 text-white px-4 py-2 text-xs font-bold">
          {error}
        </div>
      )}

      {/* Khu vực hiển thị cây - v8.9.3: Tách biệt với Toolbar để không bị đè */}
      <div className="flex-1 relative overflow-hidden">
        {loading && nodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center w-full h-full text-center bg-slate-50/50 backdrop-blur-sm z-10">
            <Zap className="w-8 h-8 text-rose-500 animate-pulse mb-4 mx-auto" />
            <p className="text-slate-400 font-black text-xs tracking-widest uppercase">
              {selectedSystem !== null ? 'ĐANG TẢI DỮ LIỆU NHÂN MẠCH...' : 'HÃY CHỌN 1 HỆ THỐNG ĐỂ XEM NHÂN MẠCH & NHÂN DUYÊN CỦA BẠN...'}
            </p>
          </div>
        ) : (
          <div className="w-full h-full">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              defaultEdgeOptions={{ type: 'straight' }}
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              minZoom={0.1}
              maxZoom={2}
            >
              <Background color="#e2e8f0" gap={40} size={1} />
              <Controls className="!bg-white !shadow-xl !rounded-2xl !border-slate-100" />
            </ReactFlow>
            {loading && (
              <div className="absolute top-8 right-8 z-50 bg-white/90 backdrop-blur px-4 py-2 rounded-full border border-slate-200 shadow-xl flex items-center gap-3">
                <div className="h-3 w-3 rounded-full border-2 border-rose-500 border-t-transparent animate-spin"></div>
                <span className="text-[10px] font-black uppercase text-slate-600 tracking-tighter">Updating Tree...</span>
              </div>
            )}
          </div>
        )}
      </div>

      {modalData && (
        <GroupModal
          users={modalData.users}
          type={modalData.type}
          totalSub={modalData.totalSub}
          editMode={editMode}
          onClose={() => { setModalData(null); setExpandedF2Id(null); }}
          onAddChild={(parentId) => setAddF1Modal({ parentId, show: true })}
          onDeleteNode={(nodeId) => setDeleteNodeModal({ nodeId, show: true })}
        />
      )}

      {/* Popup Modal Quản trị hệ thống (Chỉ hiện cho ADMIN) */}
      {showAdminModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl p-6 max-h-[90vh] flex flex-col relative">
            <button
              onClick={() => setShowAdminModal(false)}
              className="absolute right-4 top-4 p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-all z-10"
              title="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
              <GenealogyAdminTab />
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}</style>

      {/* Add F1 Modal */}
      {addF1Modal.show && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black">Thêm F1 cho #{addF1Modal.parentId}</h2>
              <button onClick={() => { setAddF1Modal({ parentId: 0, show: false }); setUserSearch(''); }} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="relative mb-3">
              <input
                type="text"
                placeholder="Tìm user..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm font-bold"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
            <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar">
              {loadingUsers ? (
                <div className="text-center py-4 text-sm text-gray-400">Đang tải...</div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-4 text-sm text-gray-400">Không tìm thấy user</div>
              ) : (
                filteredUsers.map(u => (
                  <button
                    key={u.id}
                    onClick={() => handleAddChild(u.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-indigo-50 border border-transparent hover:border-indigo-200 transition-all text-left"
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center font-black text-xs">#{u.id}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-slate-900 truncate">{u.name || 'HV'}</div>
                      <div className="text-[10px] text-gray-400 truncate">{u.email}</div>
                    </div>
                  </button>
                ))
              )}
            </div>
            <button onClick={() => { setAddF1Modal({ parentId: 0, show: false }); setUserSearch(''); }} className="w-full py-2 bg-gray-200 rounded-lg font-bold mt-3">Đóng</button>
          </div>
        </div>
      )}

      {/* Delete Node Modal */}
      {deleteNodeModal.show && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black text-red-600">Xóa node #{deleteNodeModal.nodeId}</h2>
              <button onClick={() => setDeleteNodeModal({ nodeId: 0, show: false })} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-slate-600 mb-4">Bạn có chắc chắn muốn xóa node này không?</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteNodeModal({ nodeId: 0, show: false })} className="flex-1 py-2 bg-gray-200 rounded-lg font-bold">Hủy</button>
              <button onClick={handleDeleteNode} className="flex-1 py-2 bg-red-500 text-white rounded-lg font-bold hover:bg-red-600">Xóa</button>
            </div>
          </div>
        </div>
      )}

      {/* Create Root Modal (Admin Only) */}
      {createRootModal.show && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-brk-surface w-full max-w-md rounded-2xl shadow-2xl p-6 max-h-[80vh] flex flex-col border border-brk-outline">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black text-brk-primary">Khởi tạo hệ thống #{createRootModal.systemId}</h2>
              <button onClick={() => { setCreateRootModal({ show: false, systemId: null }); setUserSearch(''); }} className="p-2 hover:bg-brk-bg rounded-lg transition-colors">
                <X className="w-5 h-5 text-brk-on-surface" />
              </button>
            </div>
            <p className="text-xs text-brk-muted mb-4 font-bold uppercase tracking-tight">Chọn một người dùng để làm Root (gốc) cho hệ thống này.</p>

            <div className="relative mb-3">
              <input
                type="text"
                placeholder="Tìm user theo tên hoặc ID..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-brk-bg border border-brk-outline text-brk-on-surface rounded-lg text-sm font-bold focus:ring-2 focus:ring-brk-primary outline-none transition-all"
              />
              <Search className="w-4 h-4 text-brk-muted absolute left-3 top-1/2 -translate-y-1/2" />
            </div>

            <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar min-h-[200px]">
              {loadingUsers ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <div className="w-6 h-6 border-2 border-brk-primary border-t-transparent animate-spin rounded-full"></div>
                  <span className="text-xs font-bold text-brk-muted">Đang tải danh sách...</span>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-10 text-sm text-brk-muted font-bold">Không tìm thấy người dùng phù hợp</div>
              ) : (
                filteredUsers.map(u => (
                  <button
                    key={u.id}
                    onClick={async () => {
                      if (!createRootModal.systemId) return;
                      setLoading(true);
                      setCreateRootModal({ show: false, systemId: null });
                      const res = await createSystemRootAction(createRootModal.systemId, u.id);
                      if (res.success) {
                        handleSystemChange(createRootModal.systemId);
                      } else {
                        alert(res.error || 'Lỗi khi tạo root');
                        setLoading(false);
                      }
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-brk-bg border border-transparent hover:border-brk-outline transition-all text-left group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-brk-bg text-brk-muted flex items-center justify-center font-black text-sm group-hover:bg-brk-primary group-hover:text-brk-on-primary transition-colors">#{u.id}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-black text-brk-on-surface truncate">{u.name || 'Học viên'}</div>
                      <div className="text-[10px] font-bold text-brk-muted truncate uppercase tracking-widest">{u.email}</div>
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="pt-4 border-t border-brk-outline mt-2">
              <button
                onClick={() => { setCreateRootModal({ show: false, systemId: null }); setUserSearch(''); }}
                className="w-full py-2.5 bg-brk-bg text-brk-on-surface rounded-xl font-black text-xs uppercase tracking-widest hover:opacity-80 transition-all border border-brk-outline"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Member Details Modal */}
      {memberDetail.show && (
        <MemberDetailsModal info={memberDetail} onClose={() => setMemberDetail(prev => ({ ...prev, show: false }))} selectedSystem={selectedSystem} />
      )}

    </div>
  )
}

function MemberDetailsModal({ info, onClose, selectedSystem }: { info: MemberDetailInfo, onClose: () => void, selectedSystem: number | null }) {
  const [showHistory, setShowHistory] = useState(false);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [historyRecords, setHistoryRecords] = useState<any[]>([]);
  const [historyLevelConfigs, setHistoryLevelConfigs] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (showHistory && info.userId && selectedSystem) {
      setLoadingHistory(true);
      getMemberPromotionHistoryAction(info.userId, selectedSystem).then(res => {
        if (res.success && res.history) {
          setHistoryRecords(res.history);
        }
        if (res.levelConfigs) {
          setHistoryLevelConfigs(res.levelConfigs);
        }
        setLoadingHistory(false);
      });
    }
  }, [showHistory, info.userId, selectedSystem]);

  if (!info.show) return null;

  const { user, tca, systemData, enrollment } = info.data || {};
  const isLoading = info.loading;
  const isBrk = !!systemData;

  const currentLevelText = isBrk
    ? (systemData?.level ? `Cấp ${systemData.level}` : 'Chưa có')
    : (tca?.level ? `Cấp ${tca.level}` : 'Học viên');

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[300] flex items-center justify-center p-3 sm:p-4 transition-all duration-300">
      <div className="bg-white w-full max-w-sm sm:max-w-lg rounded-[24px] sm:rounded-[32px] shadow-2xl border border-slate-100 flex flex-col animate-in fade-in zoom-in duration-300 max-h-[80vh] overflow-hidden">
        {/* Header Gradient mỏng - avatar góc trái chồm xuống dưới, text bên phải */}
        <div className={`rounded-t-[24px] sm:rounded-t-[32px] bg-gradient-to-r ${isBrk ? 'from-teal-600 to-emerald-600' : tca ? 'from-indigo-600 to-violet-600' : 'from-emerald-600 to-teal-600'} relative`}>
          <button
            onClick={onClose}
            className="absolute top-1 right-1 sm:top-4 sm:right-4 p-1.5 sm:p-2 bg-rose-500 hover:bg-rose-600 rounded-full transition-all text-white shadow-md z-20"
          >
            <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
          <div className="flex items-start gap-1.5 sm:gap-2 px-3 sm:px-4 pt-3 sm:pt-4 pb-2 sm:pb-3">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white p-0.5 border-2 border-white shadow-lg shrink-0 -mb-10 sm:-mb-12">
              <div className={`w-full h-full rounded-full flex items-center justify-center overflow-hidden ${isBrk ? 'bg-emerald-500' : tca ? 'bg-indigo-500' : 'bg-emerald-500'}`}>
                {user?.image ? (
                  <img src={user.image} alt={user.name || ''} className="w-full h-full object-cover" />
                ) : (
                  <Smile className="w-7 h-7 sm:w-8 sm:h-8 text-white/80" />
                )}
              </div>
            </div>
            <div className="flex-1 flex flex-col min-w-0 pt-0.5">
              <span className="text-[9px] font-bold uppercase tracking-widest text-yellow-300 mb-1">
                {isBrk ? 'MB - Ngân hàng phước báu' : 'Hệ thống'}
              </span>
              <div className="flex items-end justify-between gap-2 w-full pr-1 sm:pr-2">
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="text-white text-sm sm:text-base font-bold tracking-tight leading-tight uppercase select-all">
                      {tca?.name || user?.name || 'Học viên'}
                    </h3>
                    <span className="bg-yellow-400 text-teal-950 font-black text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-lg shadow-sm border border-yellow-300 select-all inline-flex items-center h-4.5 sm:h-5 shrink-0 font-mono">
                      #{info.userId}
                    </span>
                  </div>
                  <span className="text-white/85 text-[10px] sm:text-xs font-semibold truncate mt-1 select-all">
                    {user?.phone ? `📞 ${user.phone}` : 'Chưa cập nhật SĐT'}
                  </span>
                </div>
                {/* Badge Cấp bậc nổi bật được hạ thấp xuống và dịch sát bên phải */}
                <div className="bg-red-500 text-white font-black text-xs sm:text-sm px-3.5 py-0.5 rounded-full shadow-md border border-white select-none shrink-0 mb-0.5 ml-auto">
                  {currentLevelText}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="px-3 sm:px-4 pb-5 sm:pb-6 flex flex-col overflow-y-auto pt-3 sm:pt-4 relative z-10">
          {isLoading ? (
            <div className="py-8 sm:py-12 flex flex-col items-center justify-center gap-3 sm:gap-4">
              <div className="w-8 h-8 sm:w-10 sm:h-10 border-4 border-indigo-500 border-t-transparent animate-spin rounded-full"></div>
              <span className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-widest">Đang tải thông tin...</span>
            </div>
          ) : (
            <>
              <div className="space-y-1.5 sm:space-y-2">
                {/* Upline Leaders & Referrers */}
                <div className="p-2.5 bg-indigo-50/50 border border-indigo-100/50 rounded-2xl mb-2 text-[10px] sm:text-xs space-y-1.5">
                  <div className="flex items-center justify-between text-indigo-750 font-semibold">
                    <span>Nhân mạch kết nối:</span>
                    <span className="font-bold text-indigo-900">
                      {user?.referrer ? (
                        <>
                          {user.referrer.name}{' '}
                          <code className="bg-indigo-100/70 px-1 py-0.5 rounded text-[9px] sm:text-[10px] font-mono font-bold">#{user.referrer.id}</code>
                        </>
                      ) : 'Chưa cập nhật'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-indigo-750 font-semibold pt-1.5 border-t border-indigo-100/30">
                    <span>Nhân mạch chia sẻ:</span>
                    <span className="font-bold text-indigo-900">
                      {enrollment?.referrer ? (
                        <>
                          {enrollment.referrer.name}{' '}
                          <code className="bg-indigo-100/70 px-1 py-0.5 rounded text-[9px] sm:text-[10px] font-mono font-bold">#{enrollment.referrer.id}</code>
                        </>
                      ) : 'Chưa cập nhật'}
                    </span>
                  </div>

                  {isBrk && (
                    <>
                      <div className="flex items-center justify-between text-indigo-750 font-semibold pt-1.5 border-t border-indigo-100/30">
                        <span>MB upline 1:</span>
                        <span className="font-bold text-indigo-900">
                          {systemData.upline1 ? (
                            <>
                              {systemData.upline1.name}{' '}
                              <code className="bg-indigo-100/70 px-1 py-0.5 rounded text-[10px] font-mono font-bold">#{systemData.upline1.id}</code>
                            </>
                          ) : 'Chưa cập nhật'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-indigo-750 font-semibold pt-1.5 border-t border-indigo-100/30">
                        <span>MB upline 2:</span>
                        <span className="font-bold text-indigo-900">
                          {systemData.upline2 ? (
                            <>
                              {systemData.upline2.name}{' '}
                              <code className="bg-indigo-100/70 px-1 py-0.5 rounded text-[10px] font-mono font-bold">#{systemData.upline2.id}</code>
                            </>
                          ) : 'Chưa cập nhật'}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {isBrk ? (
                  <>
                    <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                      <InfoItem icon={<Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-500" />} label="Ngày tham gia" value={systemData?.joinedAt ? new Date(systemData.joinedAt).toLocaleDateString('vi-VN') : '---'} />
                      <InfoItem icon={<ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-500" />} label="Ngày lên cấp" value={systemData?.levelUpdatedAt ? new Date(systemData.levelUpdatedAt).toLocaleDateString('vi-VN') : '---'} />
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                      <InfoItem icon={<Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-500" />} label="Điểm tăng trưởng" value={systemData?.totalPoints != null ? `${systemData.totalPoints.toLocaleString('vi')} (MP)` : '0 (MP)'} />
                      <InfoItem icon={<Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-500" />} label="Số thành viên nhóm" value={systemData?.teamSize != null ? `${systemData.teamSize.toLocaleString('vi')}` : '0'} />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-1 gap-1.5 sm:gap-2">
                      <InfoItem icon={<User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />} label="ID Hệ thống" value={tca?.tcaId ? `#${tca.tcaId}` : 'Chưa cập nhật'} />
                    </div>
                    <div className="grid grid-cols-1 gap-1.5 sm:gap-2">
                      <InfoItem icon={<Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-500" />} label="Ngày tham gia" value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString('vi-VN') : '---'} />
                    </div>
                  </>
                )}
              </div>

              {/* Wallet & Revenue Section (BRK only) */}
              {isBrk && systemData?.wallet && (
                <div className="mt-2 space-y-1.5 sm:space-y-2">
                  {/* Dòng 1: Doanh số MBDT (trái) & Thu nhập MBDT (phải) */}
                  <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                    <WalletItem
                      icon={<Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-500" />}
                      label="Doanh số MBDT"
                      value={systemData?.teamTotalBrkd || 0}
                      labelClassName="text-[9px] text-emerald-600 font-bold uppercase tracking-wider"
                      valueClassName="text-[14px] font-extrabold text-red-500"
                    />
                    <WalletItem
                      icon={<Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-500" />}
                      label="Thu nhập MBDT"
                      value={systemData.wallet.brkd}
                      labelClassName="text-[9px] text-emerald-600 font-bold uppercase tracking-wider"
                      valueClassName="text-[14px] font-extrabold text-red-500"
                    />
                  </div>

                  {/* Dòng 2: Doanh số VNĐ (trái) & Thu nhập VNĐ (phải) */}
                  <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                    <InfoItem
                      icon={<Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500" />}
                      label="Doanh số VNĐ"
                      value={systemData?.teamTotalVnd != null ? systemData.teamTotalVnd.toLocaleString('vi') : '0'}
                    />
                    <WalletItem
                      icon={<Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500" />}
                      label="Thu nhập VNĐ"
                      value={systemData.wallet.totalEarned}
                    />
                  </div>

                  {/* Dòng 3: Voucher (trái) & Số dư (VNĐ) (phải) */}
                  <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                    <WalletItem
                      icon={<Gift className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500" />}
                      label="Voucher"
                      value={systemData.wallet.voucherBalance}
                    />
                    <WalletItem
                      icon={<ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-500" />}
                      label="Số dư (VNĐ)"
                      value={systemData.wallet.balance}
                    />
                  </div>
                </div>
              )}

              {/* Promotion History Button - mt-2 và bỏ border-t / padding ngăn cách */}
              {isBrk && (
                <div className="mt-2 flex justify-center">
                  <button
                    onClick={() => setShowHistory(true)}
                    className="w-full py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-black shadow-md hover:scale-[1.02] transition-all uppercase tracking-wider"
                  >
                    Xem lịch sử thăng tiến
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* History Modal Popup */}
      {showHistory && (
        <div className="fixed inset-0 bg-slate-955/70 backdrop-blur-sm z-[350] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-[98%] max-w-md md:max-w-lg rounded-3xl shadow-2xl border border-slate-100 flex flex-col h-[90vh] max-h-[95vh] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0 rounded-t-3xl">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-yellow-400" />
                <h4 className="text-sm font-black uppercase tracking-wider">Lịch sử thăng tiến</h4>
                <button
                  onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                  title={sortOrder === 'desc' ? "Mới nhất trước" : "Cũ nhất trước"}
                  className="p-1 hover:bg-slate-800 active:bg-slate-700 rounded-lg transition-all text-slate-400 hover:text-white flex items-center justify-center ml-2"
                >
                  {sortOrder === 'desc' ? (
                    <ArrowDown className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <ArrowUp className="w-4 h-4 text-rose-500" />
                  )}
                </button>
              </div>
              <button
                onClick={() => setShowHistory(false)}
                className="p-1 bg-slate-800 hover:bg-slate-700 rounded-full transition-all text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 p-5 overflow-y-auto bg-slate-50/50 flex flex-col gap-4">
              {loadingHistory ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3">
                  <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent animate-spin rounded-full"></div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Đang tải lịch sử...</span>
                </div>
              ) : historyRecords.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                  <Smile className="w-10 h-10 opacity-40" />
                  <span className="text-xs font-black uppercase tracking-wide">Chưa ghi nhận lịch sử thăng tiến</span>
                </div>
              ) : (
                <>

                  <div className="relative pl-6 border-l border-slate-200 space-y-5">
                  {(() => {
                    const getLevelDetails = (lvl: number) => {
                      const cfg = historyLevelConfigs.find((c: any) => c.level === lvl);
                      if (cfg) return { pct: cfg.pct, gift: cfg.gift };
                      // Fallback nếu chưa load configs
                      switch (lvl) {
                        case 1: return { pct: '21%', gift: 0 };
                        case 2: return { pct: '30%', gift: 500000 };
                        case 3: return { pct: '39%', gift: 1000000 };
                        case 4: return { pct: '52.5%', gift: 2000000 };
                        case 5: return { pct: '64.5%', gift: 4000000 };
                        case 6: return { pct: '70.5%', gift: 8000000 };
                        case 7: return { pct: '75%', gift: 16000000 };
                        case 8: return { pct: '78%', gift: 32000000 };
                        default: return { pct: '21%', gift: 0 };
                      }
                    };

                    const sortedRecords = [...historyRecords].sort((a, b) => {
                      const diff = new Date(a.time).getTime() - new Date(b.time).getTime()
                      if (diff !== 0) {
                        return sortOrder === 'desc' ? -diff : diff
                      }
                      const idA = a.id || 0
                      const idB = b.id || 0
                      return sortOrder === 'desc' ? idB - idA : idA - idB
                    })

                    return sortedRecords.map((rec, i) => {
                      if (rec.type === 'ACTIVATION') {
                        return (
                          <div key={i} className="relative">
                            {/* Timeline dot */}
                            <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-blue-500 border-4 border-white shadow-md" />
                            <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] font-black text-blue-600">{rec.title || 'Tham gia hệ thống'}</span>
                                <span className="text-[10px] font-medium text-slate-400">
                                  {new Date(rec.time).toLocaleString('vi-VN')}
                                </span>
                              </div>
                              <span className="text-slate-500 text-[11px] font-medium leading-normal">{rec.description}</span>

                              {/* Thông số tăng trưởng tích lũy */}
                              <div className="mt-2.5 pt-2 border-t border-slate-100 grid grid-cols-2 gap-1.5 text-[10px] text-slate-500 font-semibold">
                                <div className="flex items-center gap-1">
                                  <span className="text-slate-400">Điểm:</span>
                                  <span className="font-black text-slate-700">{rec.accumulatedBrkp?.toLocaleString('vi')} MBP</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="text-slate-400">Thành viên nhóm:</span>
                                  <span className="font-black text-slate-700">{rec.accumulatedTeamSize?.toLocaleString('vi')}</span>
                                </div>

                                {/* Bố cục 2 cột Trái (Doanh số MBDT) và Phải (Thu nhập MBDT) */}
                                <div className="col-span-2 grid grid-cols-2 gap-2 mt-1">
                                  {/* Cột trái: Doanh số MBDT & Doanh số VNĐ */}
                                  <div className="flex flex-col gap-1 bg-slate-50 border border-slate-100 p-2 rounded-xl">
                                    <div className="flex flex-col">
                                      <span className="text-[8px] text-emerald-600 font-bold uppercase tracking-wider">Doanh số (MBDT)</span>
                                      <span className="font-extrabold text-[14px] text-red-500">
                                        {Math.round(rec.accumulatedBrkdVolume ?? 0).toLocaleString('vi')}
                                      </span>
                                    </div>
                                    <div className="flex flex-col border-t border-slate-200/50 pt-1">
                                      <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Doanh số VNĐ</span>
                                      <span className="font-semibold text-[8px] text-slate-400/80">
                                        {Math.round(rec.accumulatedCashVolume ?? 0).toLocaleString('vi')} VNĐ
                                      </span>
                                    </div>
                                  </div>

                                  {/* Cột phải: Thu nhập MBDT & Thu nhập VNĐ */}
                                  <div className="flex flex-col gap-1 bg-emerald-50/50 border border-emerald-100/50 p-2 rounded-xl">
                                    <div className="flex flex-col">
                                      <span className="text-[8px] text-emerald-600 font-bold uppercase tracking-wider">Thu nhập </span>
                                      <span className="font-extrabold text-[14px] text-red-500">
                                        {Math.round(rec.accumulatedBrkd ?? 0).toLocaleString('vi')}
                                      </span>
                                    </div>
                                    <div className="flex flex-col border-t border-emerald-100/50 pt-1">
                                      <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Thu nhập </span>
                                      <span className="font-medium text-[8px] text-slate-400/80">
                                        {Math.round(rec.accumulatedCash ?? 0).toLocaleString('vi')} VNĐ
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      if (rec.type === 'LEVEL_UP') {
                        const fromLvlDetails = getLevelDetails(rec.details?.fromLevel ?? 1);
                        const toLvlDetails = getLevelDetails(rec.details?.toLevel ?? 1);
                        return (
                          <div key={i} className="relative">
                            {/* Timeline dot */}
                            <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-amber-500 border-4 border-white shadow-md" />
                            <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] font-black text-amber-600">Thăng tiến cấp bậc</span>
                                <span className="text-[10px] font-medium text-slate-400">
                                  {new Date(rec.time).toLocaleString('vi-VN')}
                                </span>
                              </div>
                              <span className="text-slate-800 text-xs font-black">
                                Cấp {rec.details?.fromLevel} (+{rec.accumulatedBrkp?.toLocaleString('vi')} MBP) ➔ Cấp {rec.details?.toLevel}
                              </span>
                              <div className="mt-1 pt-1.5 border-t border-slate-50 flex flex-col gap-1 text-[11px]">
                                <div className="flex items-center justify-between text-slate-500">
                                  <span>Tỷ lệ hoa hồng:</span>
                                  <span className="font-extrabold text-slate-700">
                                    {fromLvlDetails.pct} ➔ <span className="text-emerald-600 font-black">{toLvlDetails.pct}</span>
                                  </span>
                                </div>
                              </div>

                              {/* Thông số tăng trưởng tích lũy */}
                              <div className="mt-2.5 pt-2 border-t border-slate-100 grid grid-cols-2 gap-1.5 text-[10px] text-slate-500 font-semibold">
                                <div className="flex items-center gap-1">
                                  <span className="text-slate-400">Điểm:</span>
                                  <span className="font-black text-slate-700">{rec.accumulatedBrkp?.toLocaleString('vi')} MBP</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="text-slate-400">Thành viên nhóm:</span>
                                  <span className="font-black text-slate-700">{rec.accumulatedTeamSize?.toLocaleString('vi')}</span>
                                </div>

                                {/* Bố cục 2 cột Trái (Doanh số MBDT) và Phải (Thu nhập MBDT) */}
                                <div className="col-span-2 grid grid-cols-2 gap-2 mt-1">
                                  {/* Cột trái: Doanh số MBDT & Doanh số VNĐ */}
                                  <div className="flex flex-col gap-1 bg-slate-50 border border-slate-100 p-2 rounded-xl">
                                    <div className="flex flex-col">
                                      <span className="text-[8px] text-emerald-600 font-bold uppercase tracking-wider">Doanh số (MBDT)</span>
                                      <span className="font-extrabold text-[14px] text-red-500">
                                        {Math.round(rec.accumulatedBrkdVolume ?? 0).toLocaleString('vi')}
                                      </span>
                                    </div>
                                    <div className="flex flex-col border-t border-slate-200/50 pt-1">
                                      <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Doanh số </span>
                                      <span className="font-semibold text-[8px] text-slate-400/80">
                                        {Math.round(rec.accumulatedCashVolume ?? 0).toLocaleString('vi')} VNĐ
                                      </span>
                                    </div>
                                  </div>

                                  {/* Cột phải: Thu nhập MBDT & Thu nhập VNĐ */}
                                  <div className="flex flex-col gap-1 bg-emerald-50/50 border border-emerald-100/50 p-2 rounded-xl">
                                    <div className="flex flex-col">
                                      <span className="text-[8px] text-emerald-600 font-bold uppercase tracking-wider">Thu nhập </span>
                                      <span className="font-extrabold text-[14px] text-red-500">
                                        {Math.round(rec.accumulatedBrkd ?? 0).toLocaleString('vi')}
                                      </span>
                                    </div>
                                    <div className="flex flex-col border-t border-emerald-100/50 pt-1">
                                      <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Thu nhập </span>
                                      <span className="font-medium text-[8px] text-slate-400/80">
                                        {Math.round(rec.accumulatedCash ?? 0).toLocaleString('vi')} VNĐ
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      // TRANSACTION
                      const amountCash = rec.details?.amountCash ?? 0;
                      const amountBrkd = rec.details?.amountBrkd ?? 0;
                      const amountVoucher = rec.details?.amountVoucher ?? 0;

                      let dotColor = 'bg-emerald-500';
                      let badgeColor = 'text-emerald-600 bg-emerald-50 border-emerald-100';

                      if (amountBrkd > 0 && amountCash === 0) {
                        dotColor = 'bg-rose-500';
                        badgeColor = 'text-rose-600 bg-rose-50 border-rose-100';
                      } else if (amountVoucher > 0 && amountCash === 0) {
                        dotColor = 'bg-amber-500';
                        badgeColor = 'text-amber-600 bg-amber-50 border-amber-100';
                      }

                      return (
                        <div key={i} className="relative">
                          {/* Timeline dot */}
                          <div className={`absolute -left-[31px] top-1.5 w-4 h-4 rounded-full ${dotColor} border-4 border-white shadow-md`} />
                          <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md border ${badgeColor}`}>
                                {rec.title}
                              </span>
                              <span className="text-[10px] font-medium text-slate-400">
                                {new Date(rec.time).toLocaleString('vi-VN')}
                              </span>
                            </div>

                            <div className="flex items-start justify-between gap-4 mt-1">
                              <div className="flex flex-col gap-1 flex-1 min-w-0">
                                <span className="text-slate-500 text-[11px] font-medium leading-normal">
                                  {rec.description}
                                </span>
                              </div>

                              <div className="flex flex-col items-end shrink-0 gap-0.5 text-right font-black">
                                {amountBrkd !== 0 && (
                                  <span className={`text-sm ${amountBrkd > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                                    {amountBrkd > 0 ? '+' : ''}{Math.round(amountBrkd).toLocaleString('vi')}
                                  </span>
                                )}
                                {amountCash !== 0 && (
                                  <span className="text-[10px] text-slate-500 font-semibold">
                                    {amountCash > 0 ? '+' : ''}{Math.round(amountCash).toLocaleString('vi')} VNĐ
                                  </span>
                                )}
                                {amountVoucher !== 0 && (
                                  <span className="text-amber-600 text-[10px]">
                                    +{Math.round(amountVoucher).toLocaleString('vi')} VNĐ Voucher
                                  </span>
                                )}
                              </div>
                            </div>

                            {rec.details?.pathStr && (
                              <div className="text-[9px] text-slate-500 font-medium bg-slate-50 p-1.5 rounded-lg border border-slate-100/50 mt-1 leading-relaxed w-full">
                                Nhánh bảo trợ: {rec.details.pathStr}
                              </div>
                            )}

                            {/* Thông số tăng trưởng tích lũy */}
                            <div className="mt-2.5 pt-2 border-t border-slate-100 grid grid-cols-2 gap-1.5 text-[10px] text-slate-500 font-semibold">
                              <div className="flex items-center gap-1">
                                <span className="text-slate-400">Điểm:</span>
                                <span className="font-black text-slate-700">{rec.accumulatedBrkp?.toLocaleString('vi')} MBP</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-slate-400">Thành viên nhóm:</span>
                                <span className="font-black text-slate-700">{rec.accumulatedTeamSize?.toLocaleString('vi')}</span>
                              </div>

                              {/* Bố cục 2 cột Trái (Doanh số MBDT) và Phải (Thu nhập MBDT) */}
                              <div className="col-span-2 grid grid-cols-2 gap-2 mt-1">
                                {/* Cột trái: Doanh số MBDT & Doanh số VNĐ */}
                                <div className="flex flex-col gap-1 bg-slate-50 border border-slate-100 p-2 rounded-xl">
                                  <div className="flex flex-col">
                                    <span className="text-[8px] text-emerald-600 font-bold uppercase tracking-wider">Doanh số (MBDT)</span>
                                    <span className="font-extrabold text-[14px] text-red-500">
                                      {Math.round(rec.accumulatedBrkdVolume ?? 0).toLocaleString('vi')}
                                    </span>
                                  </div>
                                  <div className="flex flex-col border-t border-slate-200/50 pt-1">
                                    <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Doanh số VNĐ</span>
                                    <span className="font-semibold text-[8px] text-slate-400/80">
                                      {Math.round(rec.accumulatedCashVolume ?? 0).toLocaleString('vi')} VNĐ
                                    </span>
                                  </div>
                                </div>

                                {/* Cột phải: Thu nhập MBDT & Thu nhập VNĐ */}
                                <div className="flex flex-col gap-1 bg-emerald-50/50 border border-emerald-100/50 p-2 rounded-xl">
                                  <div className="flex flex-col">
                                    <span className="text-[8px] text-emerald-600 font-bold uppercase tracking-wider">Thu nhập </span>
                                    <span className="font-extrabold text-[14px] text-red-500">
                                      {Math.round(rec.accumulatedBrkd ?? 0).toLocaleString('vi')}
                                    </span>
                                  </div>
                                  <div className="flex flex-col border-t border-emerald-100/50 pt-1">
                                    <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Thu nhập </span>
                                    <span className="font-medium text-[8px] text-slate-400/80">
                                      {Math.round(rec.accumulatedCash ?? 0).toLocaleString('vi')} VNĐ
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()}
                  </div>
                </>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

function InfoItem({ icon, label, value, valueClassName, labelClassName }: { icon: any, label: string, value: string, valueClassName?: string, labelClassName?: string }) {
  return (
    <div className="flex items-start gap-1.5 sm:gap-2 p-1.5 sm:p-2 rounded-2xl bg-slate-50 border border-slate-100/50">
      <div className="mt-0.5 p-1 sm:p-1.5 bg-white rounded-lg shadow-sm text-slate-500">
        {icon}
      </div>
      <div className="flex flex-col min-w-0">
        <span className={`text-[9px] sm:text-[10px] font-bold tracking-widest leading-none mb-0.5 sm:mb-1 ${labelClassName || 'text-slate-400'}`}>{label}</span>
        <span className={`text-xs sm:text-sm font-black truncate ${valueClassName || 'text-slate-700'}`}>{value}</span>
      </div>
    </div>
  );
}

function WalletItem({ icon, label, value, valueClassName, labelClassName }: { icon: any, label: string, value: number, valueClassName?: string, labelClassName?: string }) {
  return (
    <div className="flex items-start gap-1.5 sm:gap-2 p-1.5 sm:p-2 rounded-2xl bg-slate-50 border border-slate-100/50">
      <div className="mt-0.5 p-1 sm:p-1.5 bg-white rounded-lg shadow-sm text-slate-500">
        {icon}
      </div>
      <div className="flex flex-col min-w-0">
        <span className={`text-[9px] sm:text-[10px] font-bold tracking-widest leading-none mb-0.5 sm:mb-1 ${labelClassName || 'text-slate-400'}`}>{label}</span>
        <span className={`text-xs sm:text-sm font-black truncate ${valueClassName || 'text-slate-700'}`}>{value.toLocaleString('vi', { maximumFractionDigits: 0 })}</span>
      </div>
    </div>
  );
}

export default function GenealogyPage() {
  return (
    <ReactFlowProvider>
      <GenealogyFlow />
    </ReactFlowProvider>
  )
}

// Dynamically import AdminTab để tránh circular dependency
import GenealogyAdminTab from '@/components/genealogy/AdminTab'
