'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import Link from 'next/link'
import { ArrowLeft, Home, User, ChevronRight, X, Zap, ChevronDown, Search } from 'lucide-react'
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
import { getGenealogyTreeAction, getGenealogyChildrenAction, getSystemTreeAction, getSystemChildrenAction, getFullSystemTreeAction, getFullSystemChildrenAction, searchGenealogyByIdAction, getAvailableSystemsAction, getCurrentUserRoleAction, createSystemRootAction, GenealogyNode, SystemTreeInfo } from '@/app/actions/admin-actions'
import MainHeader from '@/components/layout/MainHeader'

// Constants cho tree layout
const NODE_WIDTH = 160
const NODE_HEIGHT = 100  // Chiều cao ước tính của node (bao gồm padding)
const HORIZONTAL_SPACING = 200  // Khoảng cách horizontal tối thiểu giữa các node cùng hàng
const VERTICAL_SPACING = 300    // Khoảng cách vertical = 3 × node height (3 × 100 = 300)

// Đếm số con trực tiếp của node
const countDirectChildren = (node: GenealogyNode, isFullMode: boolean): number => {
  if (isFullMode) {
    return (node.groupA?.length || 0) + (node.groupB?.length || 0) + (node.children?.length || 0)
  }
  return node.children?.length || 0
}

// Tính chiều rộng của subtree (ước tính an toàn)
const getSubtreeWidth = (node: GenealogyNode, isFullMode: boolean): number => {
  if (isFullMode) {
    const directChildren = (node.groupA?.length || 0) + (node.groupB?.length || 0) + (node.children?.length || 0)
    if (directChildren === 0) return NODE_WIDTH
    // Recurse cho children
    let totalChildWidth = 0
    if (node.groupA) totalChildWidth += node.groupA.length * NODE_WIDTH
    if (node.groupB) totalChildWidth += node.groupB.length * NODE_WIDTH
    if (node.children) {
      for (const child of node.children) {
        totalChildWidth += getSubtreeWidth(child, isFullMode)
      }
    }
    return Math.max(NODE_WIDTH, totalChildWidth + HORIZONTAL_SPACING * Math.max(0, directChildren - 1))
  }
  if (!node.children?.length) return NODE_WIDTH
  let w = node.children.reduce((sum, c) => sum + getSubtreeWidth(c, isFullMode), 0)
  w += HORIZONTAL_SPACING * Math.max(0, node.children.length - 1)
  return Math.max(NODE_WIDTH, w)
}

// Build position map với thuật toán đơn giản
const calculateNodePositions = (root: GenealogyNode, isFullMode: boolean): Map<number, { x: number; y: number }> => {
  const positions = new Map<number, { x: number; y: number }>()
  
  // BFS để tính positions - tránh infinite recursion
  const queue: { node: GenealogyNode; x: number; y: number }[] = [{ node: root, x: 0, y: 0 }]
  
  while (queue.length > 0) {
    const { node, x, y } = queue.shift()!
    if (positions.has(node.id)) continue // Tránh duplicate
    positions.set(node.id, { x, y })
    
    const children = isFullMode && (node.groupA?.length || node.groupB?.length)
      ? [...(node.groupA || []), ...(node.groupB || []), ...(node.children || [])]
      : node.children || []
    
    if (children.length === 0) continue
    
    // Tính total width của các children
    const childWidths = children.map(c => getSubtreeWidth(c as GenealogyNode, isFullMode))
    const totalWidth = childWidths.reduce((sum, w) => sum + w, 0) + HORIZONTAL_SPACING * Math.max(0, children.length - 1)
    
    // Đặt children từ trái sang phải
    let currentX = x - totalWidth / 2
    for (let i = 0; i < children.length; i++) {
      const childX = currentX + childWidths[i] / 2
      const childY = y + VERTICAL_SPACING
      queue.push({ node: children[i] as GenealogyNode, x: childX, y: childY })
      currentX += childWidths[i] + HORIZONTAL_SPACING
    }
  }
  
  return positions
}

const GenealogyCard = (props: NodeProps) => {
  const data = props.data as unknown as GenealogyNode & {
    isRoot?: boolean;
    isSearchTarget?: boolean;
    editMode?: boolean;
    onToggleExpand?: (id: number) => void;
    onOpenGroup?: (type: 'A' | 'B', data: any[], totalSub: number) => void;
    onAddChild?: (parentId: number) => void;
    onDeleteNode?: (nodeId: number) => void;
  }
  const hasChildren = data.f1cCount > 0 || data.f1aCount > 0 || data.f1bCount > 0
  const isActuallyRoot = data.isRoot
  const isTarget = data.isSearchTarget

  return (
    <div className={`
      bg-white rounded-2xl p-0 min-w-[160px] shadow-xl hover:shadow-indigo-180 transition-all overflow-visible 
      ${hasChildren ? 'cursor-pointer' : 'cursor-default'}
      ${isTarget ? 'border-4 border-amber-400 ring-4 ring-amber-200' : 'border-2 border-slate-200'}
    `}>
      {!isActuallyRoot && <Handle type="target" position={Position.Top} className="!bg-slate-400 !w-2 !h-2" />}
      <div className="p-4 flex flex-col gap-2">
        <div className="flex justify-between items-center text-slate-900 font-black text-[12px]">
          <span>#{data.id}</span>
          <span>TS: {data.totalSubCount || 0}</span>
        </div>
        <div className="text-slate-800 font-bold text-[13px] text-center border-y border-slate-50 uppercase tracking-tighter line-clamp-2 min-h-[2.5rem] flex items-center justify-center">
          {data.name || 'Học viên'}
        </div>
        {/* Edit buttons - chỉ hiện khi editMode = true */}
        {data.editMode && (
          <div className="flex gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); data.onAddChild?.(data.id); }}
              className="flex-1 py-1 rounded-lg bg-indigo-500 text-white text-[10px] font-bold hover:bg-indigo-600"
            >
              +F1
            </button>
            {!data.isRoot && (
              <button
                onClick={(e) => { e.stopPropagation(); data.onDeleteNode?.(data.id); }}
                className="px-2 py-1 rounded-lg bg-red-500 text-white text-[10px] font-bold hover:bg-red-600"
              >
                X
              </button>
            )}
          </div>
        )}
        <div className="flex justify-between items-center mt-1 relative h-10 px-0">
          <button
            onClick={(e) => { e.stopPropagation(); if (data.f1aCount > 0) data.onOpenGroup?.('A', data.groupA, data.groupATotalSub); }}
            className={`w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-black border-2 border-white shadow-sm transition-transform -ml-2 ${data.f1aCount > 0 ? 'bg-emerald-500 text-white hover:scale-110 cursor-pointer' : 'bg-slate-180 text-slate-300 cursor-default pointer-events-none'}`}
          >
            {data.f1aCount}
          </button>
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); if (data.f1cCount > 0) data.onToggleExpand?.(data.id); }}
              className={`w-11 h-11 rounded-full flex items-center justify-center gap-0.5 text-[11px] font-black border-4 border-white shadow-md transition-transform ${data.f1cCount > 0 ? 'bg-rose-500 text-white hover:scale-110 cursor-pointer' : 'bg-slate-180 text-slate-300 cursor-default pointer-events-none'}`}
            >
              <User className="w-4 h-4" />
              <span>{data.f1cCount}</span>
            </button>
          </div>
          <Handle type="source" position={Position.Bottom} className="!bg-slate-400 !w-2 !h-2 !-bottom-1" />
          <button
            onClick={(e) => { e.stopPropagation(); if (data.f1bCount > 0) data.onOpenGroup?.('B', data.groupB, data.groupBTotalSub); }}
            className={`w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-black border-2 border-white shadow-sm transition-transform -mr-2 ${data.f1bCount > 0 ? 'bg-sky-500 text-white hover:scale-110 cursor-pointer' : 'bg-slate-180 text-slate-300 cursor-default pointer-events-none'}`}
          >
            {data.f1bCount}
          </button>
        </div>
      </div>
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
  const [modalData, setModalData] = useState<{ users: any[], title: string, type: 'A' | 'B', totalSub: number } | null>(null)
  const [expandedF2Id, setExpandedF2Id] = useState<number | null>(null)
  const lastExpandedIdRef = useRef<number | null>(null)
  const activeFocusMapRef = useRef<Map<number, number>>(new Map())
  const [selectedSystem, setSelectedSystem] = useState<number | null>(null)
  const [availableSystems, setAvailableSystems] = useState<SystemTreeInfo[]>([])
  const [isTreeEmpty, setIsTreeEmpty] = useState<boolean>(false)
  const [isAdmin, setIsAdmin] = useState<boolean>(false)
  const [displayMode, setDisplayMode] = useState<'default' | 'full'>('default')
  const focusMapSizeRef = useRef<number>(0)
  
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
      if (result.success && result.role === 'ADMIN') {
        setIsAdmin(true)
        console.log('[Genealogy] Set isAdmin = true')
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
    positionMap?: Map<number, { x: number; y: number }>
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
          onToggleExpand: actions.onToggleExpand,
          onOpenGroup: (type: 'A' | 'B', data: any[], totalSub: number) => setModalData({ users: data, title: type === 'A' ? 'Nhóm F1 Trống (A)' : 'Nhóm F1 Cạn (B)', type, totalSub }),
          onAddChild: (parentId: number) => setAddF1Modal({ parentId, show: true }),
          onDeleteNode: (nodeId: number) => setDeleteNodeModal({ nodeId, show: true })
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

        const sub = generateGraphNodes(child, childX, childY, actions, currentFocusMap, subIsExpanded, nodeEditMode, nodeDisplayMode, positionMap)
        resNodes.push(...sub.resNodes); resEdges.push(...sub.resEdges)

        // Tránh duplicate edge keys
        const edgeId = `edge-${parent.id}-${child.id}`
        if (!resEdges.some(e => e.id === edgeId)) {
          resEdges.push({
            id: edgeId,
            source: nodeId,
            target: `node-${child.id}`,
            style: { stroke: '#f43f5e', strokeWidth: 3 },
            type: 'smoothstep'
          })
        }
      })
    }
    return { resNodes, resEdges }
  }, [editMode, displayMode, setAddF1Modal, setDeleteNodeModal, setModalData])

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
          } else {
            console.log(`[Focus] Expanding Node #${id}, auto-collapsing siblings`);
            activeFocusMapRef.current.set(pId, id);
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

    // Lấy userId hiện tại
    const roleResult = await getCurrentUserRoleAction()
    const currentUserId = roleResult.userId || 0
    const isAdminNow = roleResult.success && roleResult.role === 'ADMIN'

    try {
      if (systemId === null) {
        setFullTree(null)
      } else if (systemId === 0) {
        // Hệ thống Học viên - lấy từ user đang đăng nhập
        const result = await getGenealogyTreeAction(currentUserId)
        if (result.success && result.tree) {
          setFullTree(result.tree)
          setIsTreeEmpty(false)
        } else {
          setFullTree(null)
          setIsTreeEmpty(true)
          alert('Chưa có dữ liệu nhân mạch. Hãy bắt đầu giới thiệu thành viên để xây dựng cây.')
        }
      } else {
        // Hệ thống TCA/KTC
        const result = await getSystemTreeAction(systemId)
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
          } else {
            // User thường hoặc đã có root nhưng không thuộc
            setFullTree(null)
            alert('Bạn chưa tham gia hệ thống đã chọn')
          }
        }
      }
    } catch (e) {
      setFullTree(null)
      setError("Lỗi khi tải dữ liệu")
    }
    setLoading(false)
  }, [])

  // Không cần useEffect catch displayMode để refetch nữa vì dữ liệu tree chung đã có đủ F1, F2


  const initTree = useCallback(async (rootId: number = 0) => {
    setLoading(true); setError(null); setIsTreeEmpty(false); activeFocusMapRef.current = new Map(); focusMapSizeRef.current = 0; lastExpandedIdRef.current = null

    let result;
    if (selectedSystem === null) {
      setLoading(false)
      return
    } else if (selectedSystem === 0) {
      result = await getGenealogyTreeAction(rootId)
    } else {
      result = await getSystemTreeAction(selectedSystem)
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

  const handleSearch = useCallback(async () => {
    const id = parseInt(searchInput.replace('#', ''))
    if (isNaN(id)) {
      setSearchError('ID không hợp lệ')
      return
    }
    setSearchError(null)
    setIsSearchMode(true)
    setLoading(true)
    setSearchResult(null)

    try {
      const systemIdForSearch = selectedSystem === 0 ? undefined : (selectedSystem ?? undefined)
      console.log('[SEARCH] Searching for ID:', id, 'systemId:', systemIdForSearch)

      if (selectedSystem === 0 || selectedSystem === null) {
        const childrenResult = await getGenealogyChildrenAction(id)
        console.log('[SEARCH] Fetch children result:', childrenResult.success ? 'Success' : 'Failed')
        
        if (childrenResult.success && childrenResult.tree) {
          const treeResult = await getGenealogyTreeAction(0)
          if (treeResult.success && treeResult.tree) {
            const subtreeWithId = { ...childrenResult.tree, isRoot: false } as GenealogyNode
            setFullTree(prev => {
              if (!prev) return subtreeWithId
              return mergeSubtree(prev, subtreeWithId)
            })
          }
        }
      }

      const result = await searchGenealogyByIdAction(id, systemIdForSearch)
      console.log('[SEARCH] Result:', JSON.stringify(result))

      if (result.success && result.path && result.path.length > 0) {
        setSearchResult({
          path: result.path.map(n => ({ id: n.id, name: n.name })),
          targetId: result.targetId
        })
        console.log('[SEARCH] searchResult set with', result.path.length, 'nodes')
        
        const targetId = result.targetId
        activeFocusMapRef.current = new Map()
        for (let i = 0; i < result.path.length - 1; i++) {
          activeFocusMapRef.current.set(result.path[i].id, result.path[i + 1].id)
        }
        focusMapSizeRef.current = activeFocusMapRef.current.size
        setFocusMapVersion(v => v + 1)
        
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
  }, [searchInput, selectedSystem, mergeSubtree])

  const handleClearSearch = useCallback(() => {
    setSearchInput('')
    setSearchError(null)
    setIsSearchMode(false)
    setSearchResult(null)
    initTree(0)
  }, [initTree])

  useEffect(() => {
    if (fullTree) {
      // Tính position map (Reingold-Tilford) cho full mode
      const isFullMode = displayMode === 'full'
      if (isFullMode || editMode) {
        try {
          const newMap = calculateNodePositions(fullTree, isFullMode)
          positionMapRef.current = newMap
          setPositionVersion(v => v + 1)
        } catch (e) {
          console.error('[Tree] Position map error:', e)
        }
      }

      const { resNodes, resEdges } = generateGraphNodes(fullTree, 0, 0, { onToggleExpand: handleToggleExpand }, activeFocusMapRef.current, true, editMode, displayMode, positionMapRef.current)
      
      const uniqueNodes = Array.from(new Map(resNodes.map(item => [item.id, item])).values())
      const uniqueEdges = Array.from(new Map(resEdges.map(item => [item.id, item])).values())
      
      setNodes(uniqueNodes); setEdges(uniqueEdges)

      // Fit view after render
      setTimeout(() => fitView({ padding: 0.2, duration: 800 }), 100)
    }
  }, [fullTree, focusMapVersion, generateGraphNodes, handleToggleExpand, setNodes, setEdges, fitView, setCenter, getNodePosition, editMode, displayMode])

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

      {/* Controls */}
      <div className="flex flex-nowrap items-center gap-1 px-2 py-2 bg-gray-50 border-b overflow-x-auto">
        {/* Dropdown chọn hệ thống - đủ rộng hiển thị mũi tên */}
        <div className="relative shrink-0">
          <select
            value={selectedSystem === null ? '' : selectedSystem}
            onChange={(e) => {
              const val = e.target.value
              const systemId = val === '' ? null : Number(val)
              setSelectedSystem(systemId)
              if (systemId !== null && systemId !== 0) {
                setDisplayMode('full')
              } else {
                setDisplayMode('default')
              }
              handleSystemChange(systemId)
            }}
            className="w-28 sm:w-32 appearance-none bg-white text-slate-700 text-[10px] font-bold px-2 py-1.5 pr-6 rounded-lg border border-gray-200 outline-none cursor-pointer"
          >
            <option value="">Chọn hệ thống</option>
            {availableSystems.map((sys) => (
              <option key={sys.onSystem} value={sys.onSystem}>
                {sys.nameSystem || sys.onSystem}
              </option>
            ))}
          </select>
          <svg className="absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {/* Dropdown chế độ hiển thị */}
        <select
          value={displayMode}
          onChange={(e) => setDisplayMode(e.target.value as 'default' | 'full')}
          className="w-14 sm:w-16 bg-white text-slate-700 text-[10px] font-bold px-1 py-1.5 rounded-lg border border-gray-200 outline-none cursor-pointer shrink-0"
        >
          <option value="default">Gọn</option>
          <option value="full">Full</option>
        </select>

        {/* Nút Tạo cây/Sửa */}
        {isTreeEmpty && selectedSystem !== null && selectedSystem !== 0 ? (
          <button 
            type="button"
            onClick={async (e) => {
              console.log('[Tạo cây] Clicked', e)
              e.preventDefault()
              e.stopPropagation()
              const roleResult = await getCurrentUserRoleAction()
              console.log('[Tạo cây] Role result:', roleResult)
              if (!roleResult.userId && roleResult.userId !== 0) {
                alert('Bạn chưa đăng nhập')
                return
              }
              const userId = roleResult.userId ?? 0
              setLoading(true)
              const result = await createSystemRootAction(selectedSystem, userId)
              console.log('[Tạo cây] Result:', result)
              if (result.success) {
                handleSystemChange(selectedSystem)
              } else {
                alert(result.error || 'Lỗi khi tạo root')
                setLoading(false)
              }
            }}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-violet-600 text-white text-[10px] font-bold hover:bg-violet-700 transition-all shrink-0"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">Tạo cây</span>
          </button>
        ) : (
          <button
            onClick={() => setEditMode(!editMode)}
            className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all shrink-0 ${
              editMode 
                ? 'bg-orange-500 text-white hover:bg-orange-600' 
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            {editMode ? 'HỦY' : 'SỬA'}
          </button>
        )}

        {/* Ô tìm kiếm - nhỏ gọn */}
        <div className="relative flex items-center w-[140px] sm:w-[170px] shrink-0">
          <input
            type="text"
            placeholder="Tìm theo ID..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className={`w-full bg-white text-slate-700 text-[10px] font-bold pl-2 pr-6 py-1.5 rounded-lg border border-gray-200 outline-none placeholder:text-slate-400 ${searchError ? 'ring-1 ring-red-500' : ''}`}
          />
          {searchInput && (
            <button
              onClick={() => { setSearchInput(''); setSearchError(null); }}
              className="absolute right-4 text-red-400"
            >
              <X className="h-3 w-3" />
            </button>
          )}
          <button
            onClick={handleSearch}
            className="absolute right-1 p-1 rounded bg-blue-600 text-white"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500 text-white px-4 py-2 text-xs font-bold">
          {error}
        </div>
      )}

      <div className="flex-1 relative w-full h-full">
        {loading && nodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full w-full absolute inset-0 z-30 text-center">
            <Zap className="w-8 h-8 text-rose-500 animate-pulse mb-4 mx-auto" />
            <p className="text-slate-400 font-black text-xs tracking-widest uppercase">BIẾT ƠN NHÂN MẠCH NHÂN DUYÊN ...</p>
          </div>
        ) : (
          <div className="w-full h-full">
            <ReactFlow
              nodes={searchResult ? searchResult.path.map((node, i) => ({
                id: `search-${node.id}-${i}`,
                type: 'searchNode',
                position: { x: 0, y: i * 110 },
                data: {
                  id: node.id,
                  name: node.name,
                  isTarget: node.id === searchResult.targetId,
                  level: i
                }
              })) : nodes}
              edges={searchResult ? searchResult.path.slice(0, -1).map((node, i) => ({
                id: `search-edge-${i}`,
                source: `search-${node.id}-${i}`,
                target: `search-${searchResult.path[i + 1].id}-${i + 1}`,
                style: { stroke: '#f43f5e', strokeWidth: 2 },
                type: 'straight'
              })) : edges}
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
    </div>
  )
}

export default function GenealogyPage() {
  return (
    <ReactFlowProvider>
      <GenealogyFlow />
    </ReactFlowProvider>
  )
}