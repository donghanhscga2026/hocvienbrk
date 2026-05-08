'use client'

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import { ArrowLeft, Home, User, Users, ChevronRight, X, Zap, ChevronDown, Search, Phone, Mail, Calendar, Smile } from 'lucide-react'
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
import { getGenealogyTreeAction, getGenealogyChildrenAction, getSystemTreeAction, getSystemChildrenAction, getFullSystemTreeAction, getFullSystemChildrenAction, searchGenealogyByIdAction, getAvailableSystemsAction, getCurrentUserRoleAction, createSystemRootAction, getMemberDetailsAction, getSystemRootUserAction, GenealogyNode, SystemTreeInfo } from '@/app/actions/admin-actions'
import { Role } from '@prisma/client'
import MainHeader from '@/components/layout/MainHeader'
import * as d3 from 'd3-hierarchy'

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
  if (node.groupName === "THÁI SƠN") {
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
            ${levelColors[data.level || 0]}
          `}>
            F{data.level || 0}
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

  const [fullTree, setFullTree] = useState<GenealogyNode | null>(null)
  // v8.4.0: State cho filter Active
  const [showActiveOnly, setShowActiveOnly] = useState<boolean>(false)
  // v8.7.0: State cho "Đội của tôi"
  const [showMyTeamOnly, setShowMyTeamOnly] = useState<boolean>(false)
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)

  // v8.4.0: Computed tree - lọc tại nguồn data khi showActiveOnly thay đổi
  const filteredTree = useMemo(() => {
    if (!fullTree) return null
    if (!showActiveOnly) return fullTree
    return filterToActiveTree(fullTree)
  }, [fullTree, showActiveOnly])
  const [modalData, setModalData] = useState<{ users: any[], title: string, type: 'A' | 'B', totalSub: number } | null>(null)
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
    const res = await getMemberDetailsAction(userId)
    if (res.success) {
      setMemberDetail({ show: true, userId, data: { user: res.user, tca: res.tca }, loading: false })
    } else {
      setMemberDetail(prev => ({ ...prev, loading: false }))
    }
  }, [])

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
            handleFocusSubtree(id, name)
          },
          onOpenGroup: (type: 'A' | 'B', data: any[], totalSub: number) => setModalData({ users: data, title: type === 'A' ? 'Nhóm F1 Trống (A)' : 'Nhóm F1 Cạn (B)', type, totalSub }),
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
        const subtreeRoot: GenealogyNode = {
          ...result.tree,
          isRoot: true,  // Đánh dấu là root của focus mode
          name: result.tree.name || nodeName || null,
        }
        setFocusedSubtreeNode(subtreeRoot)
        setFocusedNodeName(nodeName || `#${nodeId}`)
        pendingCenterNodeIdRef.current = null  // Reset center, sẽ dùng fitView
        setFocusMapVersion(v => v + 1)
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

    // Lấy userId hiện tại
    const roleResult = await getCurrentUserRoleAction()
    const currentUserIdLocal = roleResult.userId || 0
    const isAdminNow = roleResult.success && roleResult.role === Role.ADMIN

    // v8.7.0: Kiểm tra Root hệ thống để set mặc định cho "Đội của tôi"
    let isSystemRoot = false
    if (systemId && systemId !== 0) {
      const rootUser = await getSystemRootUserAction(systemId)
      isSystemRoot = rootUser?.id === currentUserIdLocal
    }

    const shouldShowMyTeam = currentUserIdLocal !== 0 && !isSystemRoot && systemId !== null
    setShowMyTeamOnly(shouldShowMyTeam)

    if (shouldShowMyTeam) {
      setSearchInput(`#${currentUserIdLocal}`)
      // v8.7.3: Gọi search trực tiếp với systemId mới để tránh race condition
      await handleSearch(currentUserIdLocal, systemId)
      setLoading(false)
      return // Thoát sớm, không chạy logic fetch tree mặc định bên dưới
    }

    // Tính toán displayMode hợp lý ngay trong hàm để tránh lỗi state cũ
    const intendedDisplayMode = (systemId !== null && systemId !== 0) ? 'full' : 'default'
    setDisplayMode(intendedDisplayMode)

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
        // Hệ thống TCA/KTC - gọi đúng function theo intendedDisplayMode
        const result = intendedDisplayMode === 'full'
          ? await getFullSystemTreeAction(systemId)
          : await getSystemTreeAction(systemId)
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
      // Sửa bug: gọi đúng function theo displayMode
      result = displayMode === 'full'
        ? await getFullSystemTreeAction(selectedSystem)
        : await getSystemTreeAction(selectedSystem)
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
  }, [selectedSystem, displayMode])

  const handleClearSearch = useCallback(() => {
    setSearchInput('')
    setSearchError(null)
    setIsSearchMode(false)
    setSearchResult(null)
    initTree(0)
  }, [initTree])

  useEffect(() => {
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
    : usersList.slice(0, 50)

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
              className={`w-48 sm:w-44 appearance-none bg-slate-50 text-slate-700 text-[11px] font-black px-3 py-2 pr-8 rounded-xl border border-slate-200 outline-none cursor-pointer transition-all hover:bg-white hover:border-indigo-300 ${selectedSystem === null ? 'animate-[pulse_1.5s_infinite] ring-4 ring-pink-500/30 border-pink-500 bg-pink-50 text-pink-700 scale-105 shadow-[0_0_20px_rgba(236,72,153,0.4)]' : ''}`}
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

          {/* Dropdown chế độ hiển thị */}
          <div className="relative shrink-0">
            <select
              value={displayMode}
              onChange={(e) => setDisplayMode(e.target.value as 'default' | 'full')}
              className="appearance-none w-18 sm:w-20 bg-slate-50 text-slate-700 text-[11px] font-black px-3 py-2 pr-7 rounded-xl border border-slate-200 outline-none cursor-pointer hover:bg-white hover:border-indigo-300 transition-all"
            >
              <option value="default">GỌN</option>
              <option value="full">FULL</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>
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

          {/* v8.7.0: Checkbox "Đội của tôi" */}
          <label className="flex items-center gap-2 cursor-pointer shrink-0 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-white hover:border-indigo-200 transition-all">
            <input
              type="checkbox"
              checked={showMyTeamOnly}
              onChange={(e) => {
                const checked = e.target.checked
                setShowMyTeamOnly(checked)
                if (checked && currentUserId) {
                  setSearchInput(`#${currentUserId}`)
                  handleSearch(currentUserId)
                } else if (!checked) {
                  handleClearSearch()
                }
              }}
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-[11px] font-black text-slate-700 uppercase tracking-tighter whitespace-nowrap">Đội của tôi</span>
          </label>

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
              <button
                onClick={() => setEditMode(!editMode)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-black transition-all shadow-md ${editMode
                  ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-orange-100'
                  : 'bg-indigo-500 text-white hover:bg-indigo-600 shadow-indigo-100'
                  }`}
              >
                {editMode ? 'HỦY' : 'SỬA'}
              </button>
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

        {/* v8.8.1: Khối thống kê - Tối ưu v8.9.0 cho mobile */}
        {fullTree?.stats && (
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 ml-0 sm:ml-2 sm:border-l sm:border-slate-200 sm:pl-3 shrink-0">
            <div className="flex items-center gap-1.5 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 shadow-sm">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                {showActiveOnly ? 'ACTIVE' : 'TỔNG'}
              </span>
              <span className="text-[11px] font-black text-white">
                {showActiveOnly ? fullTree.stats.active : fullTree.stats.total}
              </span>
            </div>

            {!showActiveOnly && (
              <div className="flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1.5 rounded-xl border border-emerald-100">
                <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">ACTIVE</span>
                <span className="text-[11px] font-black text-emerald-700">{fullTree.stats.active}</span>
              </div>
            )}

            <div className="flex items-center gap-1.5 bg-orange-50 px-2.5 py-1.5 rounded-xl border border-orange-100">
              <span className="text-[9px] font-black text-orange-500 uppercase tracking-widest">BĐH</span>
              <span className="text-[11px] font-black text-orange-700">{fullTree.stats.bdh}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-pink-50 px-2.5 py-1.5 rounded-xl border border-pink-100">
              <span className="text-[9px] font-black text-pink-500 uppercase tracking-widest">DHTT</span>
              <span className="text-[11px] font-black text-pink-700">{fullTree.stats.dhtt}</span>
            </div>
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
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[180] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl max-h-[80vh] rounded-[40px] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-180 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black tracking-tight">{modalData.title}</h2>
                <p className="text-sm text-slate-400 font-bold uppercase mt-1 tracking-widest">
                  Gồm {modalData.users.length} F1 (Tổng: {modalData.totalSub} thành viên)
                </p>
              </div>
              <button onClick={() => { setModalData(null); setExpandedF2Id(null); }} className="p-3 bg-slate-50 hover:bg-slate-180 rounded-2xl transition-colors"><X className="w-6 h-6 text-slate-400" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-50/30">
              <div className="grid grid-cols-1 gap-2">
                {modalData.users.map(u => (
                  <div key={u.id} className="mb-1">
                    <div
                      onClick={() => { if (modalData.type === 'B') setExpandedF2Id(expandedF2Id === u.id ? null : u.id); }}
                      className={`flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all border-2 ${expandedF2Id === u.id ? 'border-indigo-500 bg-indigo-50' : 'border-transparent hover:bg-white hover:shadow-sm'}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-180 text-slate-500 flex items-center justify-center font-black text-xs">#{u.id}</div>
                        <div><div className="text-sm font-black text-slate-900">{u.name || 'Học viên'}</div><div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-emerald-600">TS: {u.totalSubCount}</div></div>
                      </div>
                      <div className="flex items-center gap-2">
                        {editMode && (
                          <div className="flex gap-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); setAddF1Modal({ parentId: u.id, show: true }); }}
                              className="px-2 py-1 rounded bg-indigo-500 text-white text-[10px] font-bold hover:bg-indigo-600"
                            >
                              +F1
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setDeleteNodeModal({ nodeId: u.id, show: true }); }}
                              className="px-2 py-1 rounded bg-red-500 text-white text-[10px] font-bold hover:bg-red-600"
                            >
                              X
                            </button>
                          </div>
                        )}
                        {modalData.type === 'B' && <ChevronDown className={`w-5 h-5 text-slate-300 transition-transform ${expandedF2Id === u.id ? 'rotate-180 text-sky-500' : ''}`} />}
                      </div>
                    </div>
                    {expandedF2Id === u.id && modalData.type === 'B' && (
                      <div className="p-2 pl-14 space-y-1 animate-in slide-in-from-top-2">
                        {u.children?.map((f2: any) => (
                          <div key={f2.id} className="p-3 bg-white border border-sky-180 rounded-2xl flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black text-sky-600">#{f2.id}</span>
                              <span className="text-xs font-bold text-slate-600">{f2.name}</span>
                            </div>
                            {editMode && (
                              <div className="flex gap-1">
                                <button
                                  onClick={(e) => { e.stopPropagation(); setAddF1Modal({ parentId: f2.id, show: true }); }}
                                  className="px-2 py-1 rounded bg-indigo-500 text-white text-[10px] font-bold hover:bg-indigo-600"
                                >
                                  +F1
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setDeleteNodeModal({ nodeId: f2.id, show: true }); }}
                                  className="px-2 py-1 rounded bg-red-500 text-white text-[10px] font-bold hover:bg-red-600"
                                >
                                  X
                                </button>
                              </div>
                            )}
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
      <MemberDetailsModal info={memberDetail} onClose={() => setMemberDetail(prev => ({ ...prev, show: false }))} />

    </div>
  )
}

// v8.5.0: Popup Modal hiển thị thông tin chi tiết thành viên
function MemberDetailsModal({ info, onClose }: { info: MemberDetailInfo, onClose: () => void }) {
  if (!info.show) return null;

  const { user, tca } = info.data || {};
  const isLoading = info.loading;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[300] flex items-center justify-center p-4 transition-all duration-300">
      <div className="bg-white w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden border border-slate-100 flex flex-col animate-in fade-in zoom-in duration-300">
        {/* Header với Gradient & Avatar */}
        <div className={`h-32 bg-gradient-to-r ${tca ? 'from-indigo-600 to-violet-600' : 'from-emerald-600 to-teal-600'} relative`}>
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-all text-white backdrop-blur-sm"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Avatar Profile */}
          <div className="absolute -bottom-12 left-8 flex items-end gap-3">
            <div className="w-24 h-24 rounded-full bg-white p-1.5 shadow-2xl relative z-10 border-4 border-white">
              <div className={`w-full h-full rounded-full flex items-center justify-center overflow-hidden ${tca ? 'bg-indigo-500' : 'bg-emerald-500'}`}>
                {user?.image ? (
                  <img src={user.image} alt={user.name || ''} className="w-full h-full object-cover" />
                ) : (
                  <Smile className="w-12 h-12 text-white/80" />
                )}
              </div>
            </div>
            <div className="mb-2 px-3 py-1 bg-white/90 backdrop-blur-md rounded-full shadow-lg border border-white/50 rotate-[-2deg]">
              <span className={`font-black text-[20px] tracking-tighter ${tca ? 'text-indigo-600' : 'text-emerald-600'}`}>
                #{info.userId}
              </span>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="pt-14 px-8 pb-8 flex flex-col">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-4">
              <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent animate-spin rounded-full"></div>
              <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Đang tải thông tin...</span>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h3 className="text-3xl font-black text-slate-800 leading-tight">
                  {tca?.name || user?.name || 'Học viên'}
                </h3>
                {tca?.chuc_danh && (
                  <div className="inline-block mt-1 px-3 py-1 rounded-full bg-amber-50 text-amber-600 text-[10px] font-black uppercase tracking-widest border border-amber-100">
                    {tca.chuc_danh}
                  </div>
                )}
              </div>

              {/* Grid Thông tin */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoItem icon={<User className="w-4 h-4" />} label="ID Hệ thống" value={tca?.tcaId ? `#${tca.tcaId}` : 'Chưa cập nhật'} />
                  <InfoItem icon={<Phone className="w-4 h-4 text-emerald-500" />} label="Số điện thoại" value={user?.phone || 'Chưa cập nhật'} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoItem icon={<Zap className="w-4 h-4" />} label="Cấp bậc" value={tca?.level ? `Cấp ${tca.level}` : 'Học viên'} />
                  <InfoItem icon={<Calendar className="w-4 h-4 text-rose-500" />} label="Ngày tham gia" value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString('vi-VN') : '---'} />
                </div>
                <div className="w-full">
                  <InfoItem icon={<Mail className="w-4 h-4 text-indigo-500" />} label="Email" value={user?.email || 'Chưa cập nhật'} />
                </div>
              </div>

              {/* Footer Button */}
              <div className="mt-8 pt-6 border-t border-slate-100">
                <button
                  onClick={onClose}
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-[0.2em] hover:bg-slate-800 transition-all shadow-lg active:scale-[0.98]"
                >
                  Xác nhận
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoItem({ icon, label, value }: { icon: any, label: string, value: string }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100/50">
      <div className="mt-0.5 p-1.5 bg-white rounded-lg shadow-sm text-slate-500">
        {icon}
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">{label}</span>
        <span className="text-sm font-black text-slate-700 truncate">{value}</span>
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
