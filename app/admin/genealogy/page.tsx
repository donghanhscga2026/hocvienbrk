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
import { getGenealogyTreeAction, getGenealogyChildrenAction, getSystemTreeAction, getSystemChildrenAction, searchGenealogyByIdAction, GenealogyNode } from '@/app/actions/admin-actions'
import ToolHeader from '@/components/tools/ToolHeader'

// Định nghĩa types cho React Flow
type NodeData = GenealogyNode & {
  isSearchTarget?: boolean;
  onToggleExpand?: (id: number) => void;
  onOpenGroup?: (type: 'A' | 'B', data: any[], totalSub: number) => void;
  isTarget?: boolean; // Cho search node
  level?: number;     // Cho search node
  [key: string]: unknown; // Index signature for compatibility with Record<string, unknown>
}

const GenealogyCard = (props: NodeProps<Node<NodeData>>) => {
  const data = props.data
  const hasChildren = data.f1cCount > 0 || data.f1aCount > 0 || data.f1bCount > 0
  const isActuallyRoot = data.isRoot

  // SỬA 2026-03-30: Highlight node target khi tìm kiếm
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

// SỬA 2026-03-30: Card đơn giản cho search - 2 dòng, responsive
const SearchNodeCard = (props: NodeProps<Node<NodeData>>) => {
  const data = props.data
  const levelColors = ['bg-emerald-500', 'bg-sky-500', 'bg-violet-500', 'bg-rose-500', 'bg-orange-500']
  return (
    <>
      <Handle type="target" position={Position.Top} className="!bg-slate-400 !w-2 !h-2" style={{ left: '50%', transform: 'translateX(-50%)' }} />
      <div className={`
        bg-white rounded-xl px-3 py-2 w-32 sm:w-40 shadow-xl
        ${data.isTarget ? 'border-4 border-amber-400 ring-4 ring-amber-200' : 'border-2 border-slate-200'}
      `}>
        {/* Dòng 1: Fn + #ID */}
        <div className="flex items-center justify-between mb-1">
          <div className={`
            text-[10px] font-black px-1.5 py-0.5 rounded-full text-white
            ${levelColors[data.level || 0]}
          `}>
            F{data.level || 0}
          </div>
          <div className="font-black text-slate-900 text-xs sm:text-sm">#{data.id}</div>
        </div>
        {/* Dòng 2: Tên căn giữa */}
        <div className="text-[10px] sm:text-xs font-medium text-slate-500 uppercase text-center truncate">
          {data.name || 'HV'}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-slate-400 !w-2 !h-2" style={{ left: '50%', transform: 'translateX(-50%)' }} />
    </>
  )
}

const nodeTypes = { genealogyCard: GenealogyCard, searchNode: SearchNodeCard }

// --- Main Flow Logic ---

function GenealogyFlow() {
  const { fitView, setCenter } = useReactFlow()
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [fullTree, setFullTree] = useState<GenealogyNode | null>(null)
  const [activeFocusMap, setActiveFocusMap] = useState<Map<number, number>>(new Map()) // parentId -> activeChildId
  const [modalData, setModalData] = useState<{ users: any[], title: string, type: 'A' | 'B', totalSub: number } | null>(null)
  const [expandedF2Id, setExpandedF2Id] = useState<number | null>(null)
  const lastExpandedIdRef = useRef<number | null>(null)
  const [selectedSystem, setSelectedSystem] = useState<number | null>(null)

  // SỬA 2026-03-30: Thêm state cho tính năng tìm kiếm
  const [searchInput, setSearchInput] = useState<string>('')
  const [searchError, setSearchError] = useState<string | null>(null)
  const [isSearchMode, setIsSearchMode] = useState<boolean>(false)
  const [searchResult, setSearchResult] = useState<{
    path: { id: number; name: string | null }[];
    targetId: number;
  } | null>(null)

  // Hàm ghép cây thông minh
  const mergeSubtree = useCallback((root: GenealogyNode, subtree: GenealogyNode): GenealogyNode => {
    if (root.id === subtree.id) return { ...root, ...subtree }
    if (root.children) {
      return { ...root, children: root.children.map(c => mergeSubtree(c, subtree)) }
    }
    return root
  }, [])

  // Tính vị trí của node trong cây (dựa trên thuật toán layout giống generateGraphNodes)
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

  // Hàm vẽ cây chuẩn logic
  const generateGraphNodes = useCallback((
    parent: GenealogyNode,
    px: number,
    py: number,
    actions: any,
    currentFocusMap: Map<number, number>,
    isParentVisibleAndExpanded: boolean = true
  ) => {
    const resNodes: Node[] = []
    const resEdges: Edge[] = []
    const nodeId = `node-${parent.id}`

    resNodes.push({
      id: nodeId,
      type: 'genealogyCard',
      position: { x: px, y: py },
      data: {
        ...parent,
        onToggleExpand: actions.onToggleExpand,
        onOpenGroup: (type: 'A' | 'B', data: any[], totalSub: number) => setModalData({ users: data, title: type === 'A' ? 'Nhóm F1 Trống (A)' : 'Nhóm F1 Cạn (B)', type, totalSub })
      },
    })

    // 2. Kiểm tra xem có cần vẽ các con của Node này không
    const isRoot = parent.id === fullTree?.id;
    const isFocusNode = isParentVisibleAndExpanded;

    if (isFocusNode && parent.children && parent.children.length > 0) {
      parent.children.forEach((child, index) => {
        const childX = px + (index - (parent.children.length - 1) / 2) * 200
        const childY = py + 300

        // Chỉ hiển thị F2 khi có F3 (subIsExpanded)
        const subIsExpanded = currentFocusMap.get(parent.id) === child.id

        // Đệ quy vẽ con
        const sub = generateGraphNodes(child, childX, childY, actions, currentFocusMap, subIsExpanded)
        resNodes.push(...sub.resNodes); resEdges.push(...sub.resEdges)

        // Nối dây
        resEdges.push({
          id: `edge-${parent.id}-${child.id}`,
          source: nodeId,
          target: `node-${child.id}`,
          style: { stroke: '#f43f5e', strokeWidth: 3 },
          type: 'smoothstep'
        })
      })
    }
    return { resNodes, resEdges }
  }, [])

  // Xử lý Toggle Nhánh (Tải dữ liệu và cập nhật Lộ trình)
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
          setActiveFocusMap(prev => {
            const next = new Map(prev);
            if (next.get(pId) === id) {
              console.log(`[Focus] Collapsing Node #${id}`);
              next.delete(pId);
            } else {
              console.log(`[Focus] Expanding Node #${id}, auto-collapsing siblings`);
              next.set(pId, id);
            }
            return next;
          });
        }
      } else {
        console.log(`[API] Failed or no tree: fullTree=`, !!fullTree);
      }
    } catch (e) {
      console.error("[Fatal] Error in handleToggleExpand:", e);
    }
    setLoading(false);
  }, [fullTree, mergeSubtree, selectedSystem])

  // Handle chon he thong (0=Hoc vien, 1=TCA, 2=KTC, null=chua chon)
  const handleSystemChange = useCallback(async (systemId: number | null) => {
    setSelectedSystem(systemId)
    setLoading(true)
    setError(null)
    setActiveFocusMap(new Map())
    lastExpandedIdRef.current = null
    setIsSearchMode(false)
    setSearchResult(null)

    try {
      if (systemId === null) {
        // Chua chon: khong load gi
        setFullTree(null)
      } else if (systemId === 0) {
        // Hoc vien: lay toan bo tree
        const result = await getGenealogyTreeAction(0)
        if (result.success && result.tree) {
          setFullTree(result.tree)
        } else {
          setError(result.error || 'Lỗi tải dữ liệu')
        }
      } else {
        // He thong TCA/KTC
        const result = await getSystemTreeAction(systemId)
        if (result.success && result.tree) {
          setFullTree(result.tree)
        } else {
          setError(result.error || 'Bạn không thuộc hệ thống này')
        }
      }
    } catch (e) {
      setError('Lỗi khi tải dữ liệu')
    }
    setLoading(false)
  }, [])

  // Khởi tạo
  const initTree = useCallback(async (rootId: number = 0) => {
    setLoading(true); setError(null); setActiveFocusMap(new Map()); lastExpandedIdRef.current = null

    let result;
    if (selectedSystem === null) {
      // Chua chon: khong load gi
      setLoading(false)
      return
    } else if (selectedSystem === 0) {
      // Hoc vien
      result = await getGenealogyTreeAction(rootId)
    } else {
      // TCA/KTC
      result = await getSystemTreeAction(selectedSystem)
    }

    if (result && result.success && result.tree) {
      setFullTree(result.tree)
    } else if (result) {
      setError(result.error || 'Lỗi tải dữ liệu')
    }
    setLoading(false)
  }, [selectedSystem])

  // SỬA 2026-03-30: Handler tìm kiếm theo ID
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
      // Chỉ truyền systemId khi chọn TCA(1) hoặc KTC(2), không truyền cho Học viên(0)
      const systemIdForSearch = selectedSystem === 0 ? undefined : (selectedSystem ?? undefined)
      console.log('[SEARCH] Searching for ID:', id, 'systemId:', systemIdForSearch)

      // Nếu tìm trong hệ thống Học viên (0), load luôn cây con của node đó
      if (selectedSystem === 0 || selectedSystem === null) {
        const childrenResult = await getGenealogyChildrenAction(id)
        console.log('[SEARCH] Fetch children result:', childrenResult.success ? 'Success' : 'Failed')
        
        if (childrenResult.success && childrenResult.tree) {
          // Load cây gốc trước
          const treeResult = await getGenealogyTreeAction(0)
          if (treeResult.success && treeResult.tree) {
            // Ghép cây con vào cây gốc
            const subtreeWithId = { ...childrenResult.tree, isRoot: false } as GenealogyNode
            setFullTree(prev => {
              if (!prev) return subtreeWithId
              // Merge cây con vào vị trí của node id
              return mergeSubtree(prev, subtreeWithId)
            })
          }
        }
      }

      // Sau đó tìm kiếm như bình thường
      const result = await searchGenealogyByIdAction(id, systemIdForSearch)
      console.log('[SEARCH] Result:', JSON.stringify(result))

      if (result.success && result.path && result.path.length > 0) {
        // Lưu kết quả search đơn giản
        setSearchResult({
          path: result.path.map(n => ({ id: n.id, name: n.name })),
          targetId: result.targetId
        })
        console.log('[SEARCH] searchResult set with', result.path.length, 'nodes')
        
        // SỬA: Focus vào node target bằng cách expand path
        const targetId = result.targetId
        setActiveFocusMap(prev => {
          const next = new Map(prev)
          // Tìm parent của target và set focus
          for (let i = 0; i < result.path.length - 1; i++) {
            next.set(result.path[i].id, result.path[i + 1].id)
          }
          return next
        })
        
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

  // SỬA 2026-03-30: Handler xóa tìm kiếm, quay về tree gốc
  const handleClearSearch = useCallback(() => {
    setSearchInput('')
    setSearchError(null)
    setIsSearchMode(false)
    setSearchResult(null)
    initTree(0)
  }, [initTree])

  // Render Effect
  useEffect(() => {
    if (fullTree) {
      const { resNodes, resEdges } = generateGraphNodes(fullTree, 0, 0, { onToggleExpand: handleToggleExpand }, activeFocusMap, true)
      setNodes(resNodes); setEdges(resEdges)

      // Pan to target node (chỉ khi có target)
      const targetId = lastExpandedIdRef.current
      if (targetId) {
        const pos = getNodePosition(fullTree, targetId, 0, 0, activeFocusMap, true)
        if (pos) {
          setCenter(pos.x + 180, pos.y + 180, { zoom: 1.2, duration: 600 })
        } else {
          fitView({ padding: 0.2, duration: 800 })
        }
      } else {
        fitView({ padding: 0.2, duration: 800 })
      }
    }
  }, [fullTree, activeFocusMap.size, generateGraphNodes, handleToggleExpand, setNodes, setEdges, fitView, setCenter, getNodePosition])

  // SỬA 2026-03-30: Fit view khi có kết quả tìm kiếm
  useEffect(() => {
    if (searchResult) {
      setTimeout(() => {
        fitView({ padding: 0.3, duration: 500 })
      }, 100)
    }
  }, [searchResult, fitView])

  return (
    <div className="h-screen bg-slate-50 flex flex-col overflow-hidden font-sans text-slate-900">
      <ToolHeader title="NHÂN MẠCH" backUrl="/admin" />

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 px-4 py-2 bg-white border-b">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
          <span className="text-[10px] font-bold text-slate-500">Chỉ F1</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-sky-500"></div>
          <span className="text-[10px] font-bold text-slate-500">Có F2</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-rose-500"></div>
          <span className="text-[10px] font-bold text-slate-500">Có F3↗ </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b">
        <div className="relative">
          <select
            value={selectedSystem === null ? '' : selectedSystem}
            onChange={(e) => {
              const val = e.target.value
              handleSystemChange(val === '' ? null : Number(val))
            }}
            className="appearance-none bg-white text-slate-700 text-xs font-bold px-3 py-1.5 pr-8 rounded-lg border border-gray-200 outline-none cursor-pointer hover:bg-gray-100 transition-all"
          >
            <option value="">Chọn theo hệ thống</option>
            <option value="0">Học viên</option>
            <option value="1">TCA</option>
            <option value="2">KTC</option>
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>

        <button onClick={() => initTree(0)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-[10px] font-bold hover:bg-emerald-600 transition-all">
          XEM
        </button>

        {selectedSystem !== null && selectedSystem !== undefined && (
          <div className="relative flex items-center flex-1 max-w-[200px]">
            <input
              type="text"
              placeholder="Tìm kiếm theo ID"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className={`w-full bg-white text-slate-700 text-xs font-bold pl-3 pr-12 py-1.5 rounded-lg border border-gray-200 outline-none placeholder:text-slate-400 ${searchError ? 'ring-2 ring-red-500' : ''}`}
            />
            {searchInput && (
              <button
                onClick={() => { setSearchInput(''); setSearchError(null); }}
                className="absolute right-10 text-red-400 hover:text-red-300"
              >
                <X className="h-3 w-3" />
              </button>
            )}
            <button
              onClick={handleSearch}
              className="absolute right-1 p-1.5 rounded bg-blue-600 text-white hover:bg-blue-500 transition-all"
            >
              <Search className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>

      {/* Error banner */}
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
                id: `search-${node.id}`,
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
                source: `search-${node.id}`,
                target: `search-${searchResult.path[i + 1].id}`,
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
                      {modalData.type === 'B' && <ChevronDown className={`w-5 h-5 text-slate-300 transition-transform ${expandedF2Id === u.id ? 'rotate-180 text-sky-500' : ''}`} />}
                    </div>
                    {expandedF2Id === u.id && modalData.type === 'B' && (
                      <div className="p-2 pl-14 space-y-1 animate-in slide-in-from-top-2">
                        {u.children?.map((f2: any) => (
                          <div key={f2.id} className="p-3 bg-white border border-sky-180 rounded-2xl flex items-center justify-between shadow-sm">
                            <span className="text-[10px] font-black text-sky-600">#{f2.id}</span>
                            <span className="text-xs font-bold text-slate-600">{f2.name}</span>
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
